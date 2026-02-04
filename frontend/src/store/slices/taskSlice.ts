import { StateCreator } from 'zustand';
import * as api from '@/api/endpoints';
import { normalizeErrorMessage } from '@/utils';

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

export interface TaskSlice {
  // state
  activeTaskId: string | null;
  taskProgress: { total: number; completed: number } | null;
  pageGeneratingTasks: Record<string, string>;
  pageGeneratingStartedAt: Record<string, number>;
  pageDescriptionGeneratingTasks: Record<string, boolean>;

  // actions
  startAsyncTask: (apiCall: () => Promise<any>) => Promise<void>;
  pollTask: (taskId: string) => Promise<void>;
  pollImageTask: (taskId: string, pageIds: string[]) => void;
}

// 定义依赖的外部 slice 接口
export interface TaskSliceDeps {
  currentProject: { id?: string; pages?: Array<{ id?: string; status?: string }> } | null;
  isGlobalLoading: boolean;
  error: string | null;
  setGlobalLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  syncProject: (projectId?: string) => Promise<void>;
}

export type TaskSliceState = TaskSlice & TaskSliceDeps;

export const createTaskSlice: StateCreator<TaskSliceState, [], [], TaskSlice> = (set, get) => ({
  // 初始状态
  activeTaskId: null,
  taskProgress: null,
  pageGeneratingTasks: {},
  pageGeneratingStartedAt: loadPageGeneratingStartedAt(),
  pageDescriptionGeneratingTasks: {},

  // 启动异步任务
  startAsyncTask: async (apiCall) => {
    console.log('[异步任务] 启动异步任务...');
    set({ isGlobalLoading: true, error: null } as Partial<TaskSliceState>);
    try {
      const response = await apiCall();
      console.log('[异步任务] API响应:', response);

      // task_id 在 response.data 中
      const taskId = response.data?.task_id;
      if (taskId) {
        console.log('[异步任务] 收到task_id:', taskId, '开始轮询...');
        set({ activeTaskId: taskId });
        await get().pollTask(taskId);
      } else {
        console.warn('[异步任务] 响应中没有task_id，可能是同步操作:', response);
        // 同步操作完成后，刷新项目数据
        await get().syncProject();
        set({ isGlobalLoading: false } as Partial<TaskSliceState>);
      }
    } catch (error: any) {
      console.error('[异步任务] 启动失败:', error);
      set({ error: error.message || '任务启动失败', isGlobalLoading: false } as Partial<TaskSliceState>);
      throw error;
    }
  },

  // 轮询任务状态
  pollTask: async (taskId) => {
    console.log(`[轮询] 开始轮询任务: ${taskId}`);
    const { currentProject } = get();
    if (!currentProject) {
      console.warn('[轮询] 没有当前项目，停止轮询');
      return;
    }

    const poll = async () => {
      try {
        console.log(`[轮询] 查询任务状态: ${taskId}`);
        const response = await api.getTaskStatus(currentProject.id!, taskId);
        const task = response.data;

        if (!task) {
          console.warn('[轮询] 响应中没有任务数据');
          return;
        }

        // 更新进度
        if (task.progress) {
          set({ taskProgress: task.progress });
        }

        console.log(`[轮询] Task ${taskId} 状态: ${task.status}`, task);

        // 检查任务状态
        if (task.status === 'COMPLETED') {
          console.log(`[轮询] Task ${taskId} 已完成，刷新项目数据`);

          // 如果是导出可编辑PPTX任务，检查是否有下载链接
          if (task.task_type === 'EXPORT_EDITABLE_PPTX' && task.progress) {
            const progress = typeof task.progress === 'string'
              ? JSON.parse(task.progress)
              : task.progress;

            const downloadUrl = progress?.download_url;
            if (downloadUrl) {
              console.log('[导出可编辑PPTX] 从任务响应中获取下载链接:', downloadUrl);
              // 延迟一下，确保状态更新完成后再打开下载链接
              setTimeout(() => {
                window.open(downloadUrl, '_blank');
              }, 500);
            } else {
              console.warn('[导出可编辑PPTX] 任务完成但没有下载链接');
            }
          }

          set({
            activeTaskId: null,
            taskProgress: null,
            isGlobalLoading: false
          } as Partial<TaskSliceState>);
          // 刷新项目数据
          await get().syncProject();
        } else if (task.status === 'FAILED') {
          console.error(`[轮询] Task ${taskId} 失败:`, task.error_message || task.error);
          set({
            error: normalizeErrorMessage(task.error_message || task.error || '任务失败'),
            activeTaskId: null,
            taskProgress: null,
            isGlobalLoading: false
          } as Partial<TaskSliceState>);
        } else if (task.status === 'PENDING' || task.status === 'PROCESSING') {
          // 继续轮询（PENDING 或 PROCESSING）
          console.log(`[轮询] Task ${taskId} 处理中，2秒后继续轮询...`);
          setTimeout(poll, 2000);
        } else {
          // 未知状态，停止轮询
          console.warn(`[轮询] Task ${taskId} 未知状态: ${task.status}，停止轮询`);
          set({
            error: `未知任务状态: ${task.status}`,
            activeTaskId: null,
            taskProgress: null,
            isGlobalLoading: false
          } as Partial<TaskSliceState>);
        }
      } catch (error: any) {
        console.error('任务轮询错误:', error);
        set({
          error: normalizeErrorMessage(error.message || '任务查询失败'),
          activeTaskId: null,
          isGlobalLoading: false
        } as Partial<TaskSliceState>);
      }
    };

    await poll();
  },

  // 轮询图片生成任务（非阻塞，支持单页和批量）
  pollImageTask: (taskId: string, pageIds: string[]) => {
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
          pageIds.forEach(id => {
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
          pageIds.forEach(id => {
            if (newTasks[id] === taskId) {
              delete newTasks[id];
              delete newStartedAt[id];
            }
          });
          savePageGeneratingStartedAt(newStartedAt);
          set({
            pageGeneratingTasks: newTasks,
            pageGeneratingStartedAt: newStartedAt,
            error: normalizeErrorMessage(task.error_message || task.error || '批量生成失败')
          } as Partial<TaskSliceState>);
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
          pageIds.forEach(id => {
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
        pageIds.forEach(id => {
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
});

// 导出辅助函数供其他模块使用
export { loadPageGeneratingStartedAt, savePageGeneratingStartedAt };
