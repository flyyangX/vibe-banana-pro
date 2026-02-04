import { StateCreator } from 'zustand';
import * as api from '@/api/endpoints';
import { normalizeErrorMessage } from '@/utils';
import type { Project } from '@/types';

const PAGE_GENERATING_STARTED_AT_KEY = 'pageGeneratingStartedAt';

const loadPageGeneratingStartedAt = (): Record<string, number> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(PAGE_GENERATING_STARTED_AT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.keys(parsed).reduce<Record<string, number>>((acc, key) => {
      const value = parsed[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        acc[key] = value;
      }
      return acc;
    }, {});
  } catch (error) {
    console.warn('[pageGeneratingStartedAt] 读取 sessionStorage 失败:', error);
    return {};
  }
};

const savePageGeneratingStartedAt = (value: Record<string, number>) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PAGE_GENERATING_STARTED_AT_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn('[pageGeneratingStartedAt] 写入 sessionStorage 失败:', error);
  }
};

// 生成相关的状态
export interface GenerationState {
  // 每个页面的生成任务ID映射 (pageId -> taskId)
  pageGeneratingTasks: Record<string, string>;
  // 每个页面的生成开始时间 (pageId -> timestamp)
  pageGeneratingStartedAt: Record<string, number>;
  // 每个页面的描述生成状态 (pageId -> boolean)
  pageDescriptionGeneratingTasks: Record<string, boolean>;
}

// 生成相关的 actions
export interface GenerationActions {
  generateOutline: (options?: { pageCount?: number }) => Promise<void>;
  generateFromDescription: () => Promise<void>;
  generateDescriptions: () => Promise<void>;
  generatePageDescription: (
    pageId: string,
    options?: { extraRequirements?: string; forceRegenerate?: boolean }
  ) => Promise<void>;
  generateImages: (pageIds?: string[], options?: { useTemplate?: boolean }) => Promise<void>;
  generateSinglePageImage: (
    pageId: string,
    options?: {
      extraRequirements?: string;
      refImageUrls?: string[];
      uploadedFiles?: File[];
      useTemplate?: boolean;
    }
  ) => Promise<void>;
  editPageImage: (
    pageId: string,
    editPrompt: string,
    contextImages?: {
      useTemplate?: boolean;
      descImageUrls?: string[];
      uploadedFiles?: File[];
    }
  ) => Promise<void>;
  clearPageImage: (pageId: string) => Promise<void>;
  pollImageTask: (taskId: string, pageIds: string[]) => void;
}

export interface GenerationSlice extends GenerationState, GenerationActions {}

// 依赖的外部状态和 actions
interface SharedState {
  currentProject: Project | null;
  isGlobalLoading: boolean;
  activeTaskId: string | null;
  taskProgress: { total: number; completed: number } | null;
  error: string | null;
}

interface SharedActions {
  setGlobalLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  syncProject: (projectId?: string) => Promise<void>;
}

type CombinedState = GenerationSlice & SharedState & SharedActions;

// 初始状态
export const generationInitialState: GenerationState = {
  pageGeneratingTasks: {},
  pageGeneratingStartedAt: loadPageGeneratingStartedAt(),
  pageDescriptionGeneratingTasks: {},
};

export const createGenerationSlice: StateCreator<CombinedState, [], [], GenerationSlice> = (
  set,
  get
) => ({
  // 初始状态
  ...generationInitialState,

  // 生成大纲（同步操作，不需要轮询）
  generateOutline: async (options) => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ isGlobalLoading: true, error: null });
    try {
      const response = await api.generateOutline(currentProject.id!, undefined, options);
      console.log('[生成大纲] API响应:', response);

      // 刷新项目数据，确保获取最新的大纲页面
      await get().syncProject();

      // 再次确认数据已更新
      const { currentProject: updatedProject } = get();
      console.log('[生成大纲] 刷新后的项目:', updatedProject?.pages.length, '个页面');
    } catch (error: any) {
      console.error('[生成大纲] 错误:', error);
      set({ error: error.message || '生成大纲失败' });
      throw error;
    } finally {
      set({ isGlobalLoading: false });
    }
  },

  // 从描述生成大纲和页面描述（同步操作）
  generateFromDescription: async () => {
    const { currentProject } = get();
    if (!currentProject) return;

    set({ isGlobalLoading: true, error: null });
    try {
      const response = await api.generateFromDescription(currentProject.id!);
      console.log('[从描述生成] API响应:', response);

      // 刷新项目数据，确保获取最新的大纲和描述
      await get().syncProject();

      // 再次确认数据已更新
      const { currentProject: updatedProject } = get();
      console.log('[从描述生成] 刷新后的项目:', updatedProject?.pages.length, '个页面');
    } catch (error: any) {
      console.error('[从描述生成] 错误:', error);
      set({ error: error.message || '从描述生成失败' });
      throw error;
    } finally {
      set({ isGlobalLoading: false });
    }
  },

  // 生成描述（使用异步任务，实时显示进度）
  generateDescriptions: async () => {
    const { currentProject } = get();
    if (!currentProject || !currentProject.id) return;

    const pages = currentProject.pages.filter((p) => p.id);
    if (pages.length === 0) return;

    set({ error: null });

    // 标记所有页面为生成中
    const initialTasks: Record<string, boolean> = {};
    pages.forEach((page) => {
      if (page.id) {
        initialTasks[page.id] = true;
      }
    });
    set({ pageDescriptionGeneratingTasks: initialTasks });

    try {
      // 调用批量生成接口，返回 task_id
      const projectId = currentProject.id;
      if (!projectId) {
        throw new Error('项目ID不存在');
      }

      const response = await api.generateDescriptions(projectId);
      const taskId = response.data?.task_id;

      if (!taskId) {
        throw new Error('未收到任务ID');
      }

      // 启动轮询任务状态和定期同步项目数据
      const pollAndSync = async () => {
        try {
          // 轮询任务状态
          const taskResponse = await api.getTaskStatus(projectId, taskId);
          const task = taskResponse.data;

          if (task) {
            // 更新进度
            if (task.progress) {
              set({ taskProgress: task.progress });
            }

            // 同步项目数据以获取最新的页面状态
            await get().syncProject();

            // 根据项目数据更新每个页面的生成状态
            const { currentProject: updatedProject } = get();
            if (updatedProject) {
              const updatedTasks: Record<string, boolean> = {};
              updatedProject.pages.forEach((page) => {
                if (page.id) {
                  // 如果页面已有描述，说明已完成
                  const hasDescription = !!page.description_content;
                  // 如果状态是 GENERATING 或还没有描述，说明还在生成中
                  const isGenerating =
                    page.status === 'GENERATING' || (!hasDescription && initialTasks[page.id]);
                  if (isGenerating) {
                    updatedTasks[page.id] = true;
                  }
                }
              });
              set({ pageDescriptionGeneratingTasks: updatedTasks });
            }

            // 检查任务是否完成
            if (task.status === 'COMPLETED') {
              // 清除所有生成状态
              set({
                pageDescriptionGeneratingTasks: {},
                taskProgress: null,
                activeTaskId: null,
              });
              // 最后同步一次确保数据最新
              await get().syncProject();
            } else if (task.status === 'FAILED') {
              // 任务失败
              set({
                pageDescriptionGeneratingTasks: {},
                taskProgress: null,
                activeTaskId: null,
                error: normalizeErrorMessage(task.error_message || task.error || '生成描述失败'),
              });
            } else if (task.status === 'PENDING' || task.status === 'PROCESSING') {
              // 继续轮询
              setTimeout(pollAndSync, 2000);
            }
          }
        } catch (error: any) {
          console.error('[生成描述] 轮询错误:', error);
          // 即使轮询出错，也继续尝试同步项目数据
          await get().syncProject();
          setTimeout(pollAndSync, 2000);
        }
      };

      // 开始轮询
      setTimeout(pollAndSync, 2000);
    } catch (error: any) {
      console.error('[生成描述] 启动任务失败:', error);
      set({
        pageDescriptionGeneratingTasks: {},
        error: normalizeErrorMessage(error.message || '启动生成任务失败'),
      });
      throw error;
    }
  },

  // 生成单页描述
  generatePageDescription: async (
    pageId: string,
    options?: { extraRequirements?: string; forceRegenerate?: boolean }
  ) => {
    const { currentProject, pageDescriptionGeneratingTasks } = get();
    if (!currentProject || !currentProject.id) return;

    // 如果该页面正在生成，不重复提交
    if (pageDescriptionGeneratingTasks[pageId]) {
      console.log(`[生成描述] 页面 ${pageId} 正在生成中，跳过重复请求`);
      return;
    }

    set({ error: null });

    // 标记为生成中
    set({
      pageDescriptionGeneratingTasks: {
        ...pageDescriptionGeneratingTasks,
        [pageId]: true,
      },
    });

    try {
      // 立即同步一次项目数据，以更新页面状态
      await get().syncProject();

      const forceRegenerate = options?.forceRegenerate ?? true;
      const extraRequirements = options?.extraRequirements?.trim() || undefined;
      await api.generatePageDescription(
        currentProject.id,
        pageId,
        forceRegenerate,
        undefined,
        extraRequirements
      );

      // 刷新项目数据
      await get().syncProject();
    } catch (error: any) {
      set({ error: normalizeErrorMessage(error.message || '生成描述失败') });
      throw error;
    } finally {
      // 清除生成状态
      const { pageDescriptionGeneratingTasks: currentTasks } = get();
      const newTasks = { ...currentTasks };
      delete newTasks[pageId];
      set({ pageDescriptionGeneratingTasks: newTasks });
    }
  },

  // 生成图片（非阻塞，每个页面显示生成状态）
  generateImages: async (pageIds?: string[], options?: { useTemplate?: boolean }) => {
    const { currentProject, pageGeneratingTasks } = get();
    if (!currentProject) return;

    // 清理残留的任务状态，防止状态异常导致生成被跳过
    const stalledCount = Object.keys(pageGeneratingTasks).length;
    if (stalledCount > 0) {
      console.log(`[generateImages] 清理 ${stalledCount} 个残留的任务记录`);
      set({ pageGeneratingTasks: {} });
    }

    // 确定要生成的页面ID列表
    const targetPageIds =
      pageIds ||
      currentProject.pages.map((p) => p.id).filter((id): id is string => !!id);

    // 检查是否有页面正在生成
    const alreadyGenerating = targetPageIds.filter((id) => pageGeneratingTasks[id]);
    if (alreadyGenerating.length > 0) {
      console.log(`[批量生成] ${alreadyGenerating.length} 个页面正在生成中，跳过`);
    }
    const filteredPageIds = targetPageIds.filter((id) => !pageGeneratingTasks[id]);
    if (filteredPageIds.length === 0) {
      console.log('[批量生成] 所有页面都在生成中，跳过请求');
      return;
    }

    set({ error: null });

    try {
      // 多页选择：逐页提交生成任务，避免批量阻塞
      for (const pageId of filteredPageIds) {
        if (pageGeneratingTasks[pageId]) continue;
        await get().generateSinglePageImage(pageId, options);
      }
    } catch (error: any) {
      console.error('[批量生成] 启动失败:', error);
      set({ error: normalizeErrorMessage(error.message || '批量生成图片失败') });
      throw error;
    }
  },

  // 生成单页图片（支持单页额外提示词 & 额外参考图）
  generateSinglePageImage: async (
    pageId: string,
    options?: {
      extraRequirements?: string;
      refImageUrls?: string[];
      uploadedFiles?: File[];
      useTemplate?: boolean;
    }
  ) => {
    const { currentProject, pageGeneratingTasks, pageGeneratingStartedAt } = get();
    if (!currentProject || !currentProject.id) return;
    if (!pageId) return;

    // 如果该页面正在生成，不重复提交
    if (pageGeneratingTasks[pageId]) return;

    set({ error: null });

    try {
      const response = await api.generatePageImage(
        currentProject.id,
        pageId,
        true,
        undefined,
        options
      );
      const taskId = response.data?.task_id;

      if (taskId) {
        const nextStartedAt = {
          ...pageGeneratingStartedAt,
          [pageId]: pageGeneratingStartedAt[pageId] || Date.now(),
        };
        savePageGeneratingStartedAt(nextStartedAt);
        set({
          pageGeneratingTasks: {
            ...pageGeneratingTasks,
            [pageId]: taskId,
          },
          pageGeneratingStartedAt: nextStartedAt,
        });

        // 立即同步一次项目数据，以获取后端设置的 'GENERATING' 状态
        await get().syncProject(currentProject.id);

        // 轮询任务（复用现有逻辑）
        get().pollImageTask(taskId, [pageId]);
      } else {
        await get().syncProject(currentProject.id);
      }
    } catch (error: any) {
      set({ error: normalizeErrorMessage(error.message || '生成单页图片失败') });
      throw error;
    }
  },

  // 轮询图片生成任务（非阻塞，支持单页和批量）
  pollImageTask: async (taskId: string, pageIds: string[]) => {
    const { currentProject } = get();
    if (!currentProject) {
      console.warn('[批量轮询] 没有当前项目，停止轮询');
      return;
    }

    const poll = async () => {
      try {
        const response = await api.getTaskStatus(currentProject.id!, taskId);
        const task = response.data;

        if (!task) {
          console.warn('[批量轮询] 响应中没有任务数据');
          return;
        }

        console.log(`[批量轮询] Task ${taskId} 状态: ${task.status}`, task.progress);

        // 检查任务状态
        if (task.status === 'COMPLETED') {
          console.log(`[批量轮询] Task ${taskId} 已完成，清除任务记录`);
          // 清除所有相关页面的任务记录
          const { pageGeneratingTasks, pageGeneratingStartedAt } = get();
          const newTasks = { ...pageGeneratingTasks };
          const newStartedAt = { ...pageGeneratingStartedAt };
          pageIds.forEach((id) => {
            if (newTasks[id] === taskId) {
              delete newTasks[id];
              delete newStartedAt[id];
            }
          });
          savePageGeneratingStartedAt(newStartedAt);
          set({ pageGeneratingTasks: newTasks, pageGeneratingStartedAt: newStartedAt });
          // 刷新项目数据
          await get().syncProject();
        } else if (task.status === 'FAILED') {
          console.error(`[批量轮询] Task ${taskId} 失败:`, task.error_message || task.error);
          // 清除所有相关页面的任务记录
          const { pageGeneratingTasks, pageGeneratingStartedAt } = get();
          const newTasks = { ...pageGeneratingTasks };
          const newStartedAt = { ...pageGeneratingStartedAt };
          pageIds.forEach((id) => {
            if (newTasks[id] === taskId) {
              delete newTasks[id];
              delete newStartedAt[id];
            }
          });
          savePageGeneratingStartedAt(newStartedAt);
          set({
            pageGeneratingTasks: newTasks,
            pageGeneratingStartedAt: newStartedAt,
            error: normalizeErrorMessage(task.error_message || task.error || '批量生成失败'),
          });
          // 刷新项目数据以更新页面状态
          await get().syncProject();
        } else if (task.status === 'PENDING' || task.status === 'PROCESSING') {
          // 继续轮询，同时同步项目数据以更新页面状态
          console.log(`[批量轮询] Task ${taskId} 处理中，同步项目数据...`);
          await get().syncProject();
          console.log(`[批量轮询] Task ${taskId} 处理中，2秒后继续轮询...`);
          setTimeout(poll, 2000);
        } else {
          // 未知状态，停止轮询
          console.warn(`[批量轮询] Task ${taskId} 未知状态: ${task.status}，停止轮询`);
          const { pageGeneratingTasks, pageGeneratingStartedAt } = get();
          const newTasks = { ...pageGeneratingTasks };
          const newStartedAt = { ...pageGeneratingStartedAt };
          pageIds.forEach((id) => {
            if (newTasks[id] === taskId) {
              delete newTasks[id];
              delete newStartedAt[id];
            }
          });
          savePageGeneratingStartedAt(newStartedAt);
          set({ pageGeneratingTasks: newTasks, pageGeneratingStartedAt: newStartedAt });
        }
      } catch (error: any) {
        console.error('[批量轮询] 轮询错误:', error);
        // 清除所有相关页面的任务记录
        const { pageGeneratingTasks, pageGeneratingStartedAt } = get();
        const newTasks = { ...pageGeneratingTasks };
        const newStartedAt = { ...pageGeneratingStartedAt };
        pageIds.forEach((id) => {
          if (newTasks[id] === taskId) {
            delete newTasks[id];
            delete newStartedAt[id];
          }
        });
        savePageGeneratingStartedAt(newStartedAt);
        set({ pageGeneratingTasks: newTasks, pageGeneratingStartedAt: newStartedAt });
      }
    };

    // 开始轮询（不 await，立即返回让 UI 继续响应）
    poll();
  },

  // 编辑页面图片（异步）
  editPageImage: async (pageId, editPrompt, contextImages) => {
    const { currentProject, pageGeneratingTasks, pageGeneratingStartedAt } = get();
    if (!currentProject || !currentProject.id) return;

    // 如果该页面正在生成，不重复提交
    if (pageGeneratingTasks[pageId]) {
      console.log(`[编辑] 页面 ${pageId} 正在生成中，跳过重复请求`);
      return;
    }

    set({ error: null });
    try {
      const response = await api.editPageImage(
        currentProject.id,
        pageId,
        editPrompt,
        contextImages
      );
      const taskId = response.data?.task_id;

      if (taskId) {
        // 记录该页面的任务ID
        const nextStartedAt = {
          ...pageGeneratingStartedAt,
          [pageId]: pageGeneratingStartedAt[pageId] || Date.now(),
        };
        savePageGeneratingStartedAt(nextStartedAt);
        set({
          pageGeneratingTasks: { ...pageGeneratingTasks, [pageId]: taskId },
          pageGeneratingStartedAt: nextStartedAt,
        });

        // 立即同步一次项目数据，以获取后端设置的'GENERATING'状态
        await get().syncProject();

        // 开始轮询（使用统一的轮询函数）
        get().pollImageTask(taskId, [pageId]);
      } else {
        // 如果没有返回task_id，可能是同步接口，直接刷新
        await get().syncProject();
      }
    } catch (error: any) {
      // 清除该页面的任务记录
      const { pageGeneratingTasks, pageGeneratingStartedAt } = get();
      const newTasks = { ...pageGeneratingTasks };
      const newStartedAt = { ...pageGeneratingStartedAt };
      delete newTasks[pageId];
      delete newStartedAt[pageId];
      savePageGeneratingStartedAt(newStartedAt);
      set({
        pageGeneratingTasks: newTasks,
        pageGeneratingStartedAt: newStartedAt,
        error: normalizeErrorMessage(error.message || '编辑图片失败'),
      });
      throw error;
    }
  },

  // 清除页面图片
  clearPageImage: async (pageId: string) => {
    const { currentProject, pageGeneratingTasks, pageGeneratingStartedAt } = get();
    if (!currentProject || !currentProject.id || !pageId) return;
    if (pageGeneratingTasks[pageId]) return;

    set({ error: null });
    try {
      await api.clearPageImage(currentProject.id, pageId);
      const nextStartedAt = { ...pageGeneratingStartedAt };
      delete nextStartedAt[pageId];
      savePageGeneratingStartedAt(nextStartedAt);
      set({ pageGeneratingStartedAt: nextStartedAt });
      await get().syncProject(currentProject.id);
    } catch (error: any) {
      set({ error: normalizeErrorMessage(error.message || '清除图片失败') });
      throw error;
    }
  },
});
