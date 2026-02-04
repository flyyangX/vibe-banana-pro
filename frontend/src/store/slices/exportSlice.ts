import { StateCreator } from 'zustand';
import * as api from '@/api/endpoints';
import type { Project } from '@/types';

// 依赖的状态接口
interface RequiredState {
  currentProject: Project | null;
  isGlobalLoading: boolean;
  error: string | null;
  activeTaskId: string | null;
  taskProgress: { total: number; completed: number } | null;
  startAsyncTask: (apiCall: () => Promise<any>) => Promise<void>;
}

export interface ExportSlice {
  exportPPTX: (pageIds?: string[]) => Promise<void>;
  exportPDF: (pageIds?: string[]) => Promise<void>;
  exportEditablePPTX: (filename?: string, pageIds?: string[]) => Promise<void>;
}

export const createExportSlice: StateCreator<
  ExportSlice & RequiredState,
  [],
  [],
  ExportSlice
> = (set, get) => ({
  // 导出PPTX
  exportPPTX: async (pageIds?: string[]) => {
    const { currentProject } = get();
    if (!currentProject || !currentProject.id) return;

    set({ isGlobalLoading: true, error: null });
    try {
      const response = await api.exportPPTX(currentProject.id, pageIds);
      // 优先使用相对路径，避免 Docker 环境下的端口问题
      const downloadUrl =
        response.data?.download_url || response.data?.download_url_absolute;

      if (!downloadUrl) {
        throw new Error('导出链接获取失败');
      }

      // 使用浏览器直接下载链接，避免 axios 受带宽和超时影响
      window.open(downloadUrl, '_blank');
    } catch (error: any) {
      set({ error: error.message || '导出失败' });
    } finally {
      set({ isGlobalLoading: false });
    }
  },

  // 导出PDF
  exportPDF: async (pageIds?: string[]) => {
    const { currentProject } = get();
    if (!currentProject || !currentProject.id) return;

    set({ isGlobalLoading: true, error: null });
    try {
      const response = await api.exportPDF(currentProject.id, pageIds);
      // 优先使用相对路径，避免 Docker 环境下的端口问题
      const downloadUrl =
        response.data?.download_url || response.data?.download_url_absolute;

      if (!downloadUrl) {
        throw new Error('导出链接获取失败');
      }

      // 使用浏览器直接下载链接，避免 axios 受带宽和超时影响
      window.open(downloadUrl, '_blank');
    } catch (error: any) {
      set({ error: error.message || '导出失败' });
    } finally {
      set({ isGlobalLoading: false });
    }
  },

  // 导出可编辑PPTX（异步任务）
  exportEditablePPTX: async (filename?: string, pageIds?: string[]) => {
    const { currentProject, startAsyncTask } = get();
    if (!currentProject || !currentProject.id) return;

    const projectId = currentProject.id;
    try {
      console.log('[导出可编辑PPTX] 启动异步导出任务...');
      // startAsyncTask 中的 pollTask 会在任务完成时自动处理下载
      await startAsyncTask(() => api.exportEditablePPTX(projectId, filename, pageIds));
      console.log('[导出可编辑PPTX] 异步任务完成');
    } catch (error: any) {
      console.error('[导出可编辑PPTX] 导出失败:', error);
      set({ error: error.message || '导出可编辑PPTX失败' });
    }
  },
});
