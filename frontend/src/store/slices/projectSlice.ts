import { StateCreator } from 'zustand';
import type { Project, ProductType } from '@/types';
import * as api from '@/api/endpoints';
import { debounce, normalizeProject, normalizeErrorMessage } from '@/utils';

export interface ProjectSlice {
  // State
  currentProject: Project | null;
  isGlobalLoading: boolean;
  error: string | null;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setGlobalLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initializeProject: (
    type: 'idea' | 'outline' | 'description',
    content: string,
    templateImage?: File,
    templateStyle?: string,
    productType?: ProductType
  ) => Promise<void>;
  syncProject: (projectId?: string) => Promise<void>;
  updatePageLocal: (pageId: string, data: any) => void;
  saveAllPages: () => Promise<void>;
  reorderPages: (newOrder: string[]) => Promise<void>;
  addNewPage: () => Promise<void>;
  deletePageById: (pageId: string) => Promise<void>;
}

export const createProjectSlice: StateCreator<
  ProjectSlice,
  [],
  [],
  ProjectSlice
> = (set, get) => {
  // 防抖的API更新函数（在store内部定义，以便访问syncProject）
  const debouncedUpdatePage = debounce(
    async (projectId: string, pageId: string, data: any) => {
      try {
        const promises: Promise<any>[] = [];

        // 如果更新的是 description_content，使用专门的端点
        if (data.description_content) {
          promises.push(api.updatePageDescription(projectId, pageId, data.description_content));
        }

        // 如果更新的是 outline_content，使用专门的端点
        if (data.outline_content) {
          promises.push(api.updatePageOutline(projectId, pageId, data.outline_content));
        }

        // 如果更新的是 page_type，使用专门的端点
        if (data.page_type) {
          promises.push(api.updatePageType(projectId, pageId, data.page_type));
        }

        // 如果没有特定的内容更新，使用通用端点
        if (promises.length === 0) {
          await api.updatePage(projectId, pageId, data);
        } else {
          // 并行执行所有更新请求
          await Promise.all(promises);
        }

        // API调用成功后，同步项目状态以更新updated_at
        // 这样可以确保历史记录页面显示最新的更新时间
        const { syncProject } = get();
        await syncProject(projectId);
      } catch (error: any) {
        console.error('保存页面失败:', error);
        // 可以在这里添加错误提示，但为了避免频繁提示，暂时只记录日志
        // 如果需要，可以通过事件系统或toast通知用户
      }
    },
    1000
  );

  return {
    // 初始状态
    currentProject: null,
    isGlobalLoading: false,
    error: null,

    // Setters
    setCurrentProject: (project) => set({ currentProject: project }),
    setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),
    setError: (error) => set({ error }),

    // 初始化项目
    initializeProject: async (type, content, templateImage, templateStyle, productType) => {
      set({ isGlobalLoading: true, error: null });
      try {
        const request: any = {};

        if (type === 'idea') {
          request.idea_prompt = content;
        } else if (type === 'outline') {
          request.outline_text = content;
        } else if (type === 'description') {
          request.description_text = content;
        }

        // 添加风格描述（如果有）
        if (templateStyle && templateStyle.trim()) {
          request.template_style = templateStyle.trim();
        }

        if (productType) {
          request.product_type = productType;
        }

        // 1. 创建项目
        const response = await api.createProject(request);
        const projectId = response.data?.project_id;

        if (!projectId) {
          throw new Error('项目创建失败：未返回项目ID');
        }

        // 2. 如果有模板图片，上传模板
        if (templateImage) {
          try {
            await api.uploadTemplate(projectId, templateImage);
          } catch (error) {
            console.warn('模板上传失败:', error);
            // 模板上传失败不影响项目创建，继续执行
          }
        }

        // 3. 如果是 description 类型，自动生成大纲和页面描述
        if (type === 'description') {
          try {
            await api.generateFromDescription(projectId, content);
            console.log('[初始化项目] 从描述生成大纲和页面描述完成');
          } catch (error) {
            console.error('[初始化项目] 从描述生成失败:', error);
            // 继续执行，让用户可以手动操作
          }
        }

        // 4. 获取完整项目信息
        const projectResponse = await api.getProject(projectId);
        const project = normalizeProject(projectResponse.data);

        if (project) {
          set({ currentProject: project });
          // 保存到 localStorage
          localStorage.setItem('currentProjectId', project.id!);
        }
      } catch (error: any) {
        set({ error: normalizeErrorMessage(error.message || '创建项目失败') });
        throw error;
      } finally {
        set({ isGlobalLoading: false });
      }
    },

    // 同步项目数据
    syncProject: async (projectId?: string) => {
      const { currentProject } = get();

      // 如果没有提供 projectId，尝试从 currentProject 或 localStorage 获取
      let targetProjectId = projectId;
      if (!targetProjectId) {
        if (currentProject?.id) {
          targetProjectId = currentProject.id;
        } else {
          targetProjectId = localStorage.getItem('currentProjectId') || undefined;
        }
      }

      if (!targetProjectId) {
        console.warn('syncProject: 没有可用的项目ID');
        return;
      }

      try {
        const response = await api.getProject(targetProjectId);
        if (response.data) {
          const project = normalizeProject(response.data);
          console.log('[syncProject] 同步项目数据:', {
            projectId: project.id,
            pagesCount: project.pages?.length || 0,
            status: project.status,
          });
          set({ currentProject: project });
          // 确保 localStorage 中保存了项目ID
          localStorage.setItem('currentProjectId', project.id!);
        }
      } catch (error: any) {
        // 提取更详细的错误信息
        let errorMessage = '同步项目失败';
        let shouldClearStorage = false;

        if (error.response) {
          // 服务器返回了错误响应
          const errorData = error.response.data;
          if (error.response.status === 404) {
            // 404错误：项目不存在，清除localStorage
            errorMessage = errorData?.error?.message || '项目不存在，可能已被删除';
            shouldClearStorage = true;
          } else if (errorData?.error?.message) {
            // 从后端错误格式中提取消息
            errorMessage = errorData.error.message;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (errorData?.error) {
            errorMessage =
              typeof errorData.error === 'string'
                ? errorData.error
                : errorData.error.message || '请求失败';
          } else {
            errorMessage = `请求失败: ${error.response.status}`;
          }
        } else if (error.request) {
          // 请求已发送但没有收到响应
          errorMessage = '网络错误，请检查后端服务是否启动';
        } else if (error.message) {
          // 其他错误
          errorMessage = error.message;
        }

        // 如果项目不存在，清除localStorage并重置当前项目
        if (shouldClearStorage) {
          console.warn('[syncProject] 项目不存在，清除localStorage');
          localStorage.removeItem('currentProjectId');
          set({ currentProject: null, error: normalizeErrorMessage(errorMessage) });
        } else {
          set({ error: normalizeErrorMessage(errorMessage) });
        }
      }
    },

    // 本地更新页面（乐观更新）
    updatePageLocal: (pageId, data) => {
      const { currentProject } = get();
      if (!currentProject) return;

      const updatedPages = currentProject.pages.map((page) =>
        page.id === pageId ? { ...page, ...data } : page
      );

      set({
        currentProject: {
          ...currentProject,
          pages: updatedPages,
        },
      });

      // 防抖后调用API
      if (currentProject.id) {
        debouncedUpdatePage(currentProject.id, pageId, data);
      }
    },

    // 立即保存所有页面的更改（用于保存按钮）
    // 等待防抖完成，然后同步项目状态以确保updated_at更新
    saveAllPages: async () => {
      const { currentProject } = get();
      if (!currentProject || !currentProject.id) return;

      // 等待防抖延迟时间（1秒）+ 额外时间确保API调用完成
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 同步项目状态，这会从后端获取最新的updated_at
      await get().syncProject(currentProject.id);
    },

    // 重新排序页面
    reorderPages: async (newOrder) => {
      const { currentProject } = get();
      if (!currentProject || !currentProject.id) return;

      // 乐观更新
      const reorderedPages = newOrder
        .map((id) => currentProject.pages.find((p) => p.id === id))
        .filter(Boolean) as any[];

      set({
        currentProject: {
          ...currentProject,
          pages: reorderedPages,
        },
      });

      try {
        await api.updatePagesOrder(currentProject.id, newOrder);
      } catch (error: any) {
        set({ error: error.message || '更新顺序失败' });
        // 失败后重新同步
        await get().syncProject();
      }
    },

    // 添加新页面
    addNewPage: async () => {
      const { currentProject } = get();
      if (!currentProject || !currentProject.id) return;

      try {
        const newPage = {
          outline_content: { title: '新页面', points: [] },
          order_index: currentProject.pages.length,
        };

        const response = await api.addPage(currentProject.id, newPage);
        if (response.data) {
          await get().syncProject();
        }
      } catch (error: any) {
        set({ error: error.message || '添加页面失败' });
      }
    },

    // 删除页面
    deletePageById: async (pageId) => {
      const { currentProject } = get();
      if (!currentProject || !currentProject.id) return;

      try {
        await api.deletePage(currentProject.id, pageId);
        await get().syncProject();
      } catch (error: any) {
        set({ error: error.message || '删除页面失败' });
      }
    },
  };
};
