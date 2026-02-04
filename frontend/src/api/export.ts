import { apiClient } from './client';
import type { ApiResponse } from '@/types';

/**
 * Helper function to build query string with page_ids
 */
const buildPageIdsQuery = (pageIds?: string[]): string => {
  if (!pageIds || pageIds.length === 0) return '';
  const params = new URLSearchParams();
  params.set('page_ids', pageIds.join(','));
  return `?${params.toString()}`;
};

/**
 * 导出为PPTX
 * @param projectId 项目ID
 * @param pageIds 可选的页面ID列表，如果不提供则导出所有页面
 */
export const exportPPTX = async (
  projectId: string,
  pageIds?: string[]
): Promise<ApiResponse<{ download_url: string; download_url_absolute?: string }>> => {
  const url = `/api/projects/${projectId}/export/pptx${buildPageIdsQuery(pageIds)}`;
  const response = await apiClient.get<
    ApiResponse<{ download_url: string; download_url_absolute?: string }>
  >(url);
  return response.data;
};

/**
 * 导出为PDF
 * @param projectId 项目ID
 * @param pageIds 可选的页面ID列表，如果不提供则导出所有页面
 */
export const exportPDF = async (
  projectId: string,
  pageIds?: string[]
): Promise<ApiResponse<{ download_url: string; download_url_absolute?: string }>> => {
  const url = `/api/projects/${projectId}/export/pdf${buildPageIdsQuery(pageIds)}`;
  const response = await apiClient.get<
    ApiResponse<{ download_url: string; download_url_absolute?: string }>
  >(url);
  return response.data;
};

/**
 * 导出为可编辑PPTX（异步任务）
 * @param projectId 项目ID
 * @param filename 可选的文件名
 * @param pageIds 可选的页面ID列表，如果不提供则导出所有页面
 */
export const exportEditablePPTX = async (
  projectId: string,
  filename?: string,
  pageIds?: string[]
): Promise<ApiResponse<{ task_id: string }>> => {
  const response = await apiClient.post<
    ApiResponse<{ task_id: string }>
  >(`/api/projects/${projectId}/export/editable-pptx`, {
    filename,
    page_ids: pageIds
  });
  return response.data;
};

/**
 * 导出小红书图文（打包 ZIP）
 */
export const exportXhsZip = async (
  projectId: string,
  indices?: number[]
): Promise<ApiResponse<{ download_url: string; download_url_absolute?: string }>> => {
  const params = new URLSearchParams();
  if (indices && indices.length > 0) {
    params.set('indices', indices.join(','));
  }
  const response = await apiClient.get<
    ApiResponse<{ download_url: string; download_url_absolute?: string }>
  >(`/api/projects/${projectId}/export/xhs${params.toString() ? `?${params.toString()}` : ''}`);
  return response.data;
};
