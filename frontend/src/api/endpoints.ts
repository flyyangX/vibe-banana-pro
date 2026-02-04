import { apiClient } from './client';
import type { Task, ApiResponse, Page } from '@/types';
import type { Settings } from '../types/index';

// ===== Re-exports for backwards compatibility =====

// 从 project.ts 导出
export {
  createProject,
  uploadTemplate,
  deleteTemplate,
  generateTemplateVariants,
  listProjects,
  getProject,
  deleteProject,
  updateProject,
  updatePagesOrder,
} from './project';

// 从 generation.ts 导出
export {
  generateOutline,
  generateFromDescription,
  generateDescriptions,
  generatePageDescription,
  refineOutline,
  refineDescriptions,
  generateImages,
  generateInfographic,
  generateXhs,
  generateXhsCard,
  editXhsCardImage,
  generateXhsBlueprint,
  generatePageImage,
  editPageImage,
  getStoredOutputLanguage,
} from './generation';
export type { OutputLanguage } from './types';

// 从 export.ts 导出
export {
  exportPPTX,
  exportPDF,
  exportEditablePPTX,
  exportXhsZip,
} from './export';

/**
 * 兼容旧版调用：统一导出接口
 *
 * - pptx/pdf: 同步返回下载链接
 * - editable-pptx: 异步返回 task_id
 */
export const exportProject = async (
  projectId: string,
  type: 'pptx' | 'pdf' | 'editable-pptx',
  pageIds?: string[]
) => {
  const { exportPPTX, exportPDF, exportEditablePPTX } = await import('./export');
  if (type === 'pptx') return exportPPTX(projectId, pageIds);
  if (type === 'pdf') return exportPDF(projectId, pageIds);
  return exportEditablePPTX(projectId, undefined, pageIds);
};

// 从 material.ts 导出
export {
  generateMaterialImage,
  listMaterials,
  uploadMaterial,
  deleteMaterial,
  updateMaterialMeta,
  moveMaterial,
  copyMaterial,
  associateMaterialsToProject,
  editMaterialImage,
} from './material';
export type { Material } from './types';

// 从 template.ts 导出
export {
  uploadTemplateVariant,
  selectTemplateVariant,
  regenerateTemplateVariant,
  uploadUserTemplate,
  listUserTemplates,
  deleteUserTemplate,
} from './template';
export type { UserTemplate } from './types';

// 从 referenceFile.ts 导出
export {
  uploadReferenceFile,
  getReferenceFile,
  listProjectReferenceFiles,
  deleteReferenceFile,
  triggerFileParse,
  associateFileToProject,
  dissociateFileFromProject,
} from './referenceFile';
export type { ReferenceFile } from './types';

// 从 types.ts 导出类型和常量
export {
  OUTPUT_LANGUAGE_OPTIONS,
} from './types';
export type {
  OutputLanguageOption,
  XhsCardImageVersion,
} from './types';

// ===== 页面操作 API（尚未迁移）=====

/**
 * 更新页面
 */
export const updatePage = async (
  projectId: string,
  pageId: string,
  data: Partial<Page>
): Promise<ApiResponse<Page>> => {
  const response = await apiClient.put<ApiResponse<Page>>(
    `/api/projects/${projectId}/pages/${pageId}`,
    data
  );
  return response.data;
};

/**
 * 更新页面描述
 */
export const updatePageDescription = async (
  projectId: string,
  pageId: string,
  descriptionContent: any,
  language?: import('./generation').OutputLanguage
): Promise<ApiResponse<Page>> => {
  const { getStoredOutputLanguage } = await import('./generation');
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.put<ApiResponse<Page>>(
    `/api/projects/${projectId}/pages/${pageId}/description`,
    { description_content: descriptionContent, language: lang }
  );
  return response.data;
};

/**
 * 更新页面类型
 */
export const updatePageType = async (
  projectId: string,
  pageId: string,
  pageType: string
): Promise<ApiResponse<Page>> => {
  const response = await apiClient.put<ApiResponse<Page>>(
    `/api/projects/${projectId}/pages/${pageId}/type`,
    { page_type: pageType }
  );
  return response.data;
};

/**
 * 更新页面大纲
 */
export const updatePageOutline = async (
  projectId: string,
  pageId: string,
  outlineContent: any,
  language?: import('./generation').OutputLanguage
): Promise<ApiResponse<Page>> => {
  const { getStoredOutputLanguage } = await import('./generation');
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.put<ApiResponse<Page>>(
    `/api/projects/${projectId}/pages/${pageId}/outline`,
    { outline_content: outlineContent, language: lang }
  );
  return response.data;
};

/**
 * 删除页面
 */
export const deletePage = async (projectId: string, pageId: string): Promise<ApiResponse> => {
  const response = await apiClient.delete<ApiResponse>(
    `/api/projects/${projectId}/pages/${pageId}`
  );
  return response.data;
};

/**
 * 添加页面
 */
export const addPage = async (projectId: string, data: Partial<Page>): Promise<ApiResponse<Page>> => {
  const response = await apiClient.post<ApiResponse<Page>>(
    `/api/projects/${projectId}/pages`,
    data
  );
  return response.data;
};

// ===== 任务查询 API =====

/**
 * 查询任务状态
 */
export const getTaskStatus = async (projectId: string, taskId: string): Promise<ApiResponse<Task>> => {
  const response = await apiClient.get<ApiResponse<Task>>(`/api/projects/${projectId}/tasks/${taskId}`);
  return response.data;
};

// ===== 小红书卡片版本 API =====

/**
 * 获取小红书卡片图片版本列表
 */
export const getXhsCardImageVersions = async (
  projectId: string,
  index: number
): Promise<ApiResponse<{ versions: import('./types').XhsCardImageVersion[] }>> => {
  const response = await apiClient.get<ApiResponse<{ versions: import('./types').XhsCardImageVersion[] }>>(
    `/api/projects/${projectId}/xhs/cards/${index}/image-versions`
  );
  return response.data;
};

/**
 * 设置小红书卡片当前图片版本
 */
export const setXhsCardCurrentImageVersion = async (
  projectId: string,
  index: number,
  versionId: string
): Promise<ApiResponse> => {
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/xhs/cards/${index}/image-versions/${versionId}/set-current`
  );
  return response.data;
};

/**
 * 更新小红书卡片素材（material_plan）
 */
export const updateXhsCardMaterials = async (
  projectId: string,
  index: number,
  payload: { material_ids: string[]; locked?: boolean }
): Promise<ApiResponse> => {
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/xhs/cards/${index}/materials`,
    payload
  );
  return response.data;
};

// ===== 页面图片版本 API =====

/**
 * 获取页面图片历史版本
 */
export const getPageImageVersions = async (
  projectId: string,
  pageId: string
): Promise<ApiResponse<{ versions: any[] }>> => {
  const response = await apiClient.get<ApiResponse<{ versions: any[] }>>(
    `/api/projects/${projectId}/pages/${pageId}/image-versions`
  );
  return response.data;
};

/**
 * 设置当前使用的图片版本
 */
export const setCurrentImageVersion = async (
  projectId: string,
  pageId: string,
  versionId: string
): Promise<ApiResponse> => {
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/pages/${pageId}/image-versions/${versionId}/set-current`
  );
  return response.data;
};

/**
 * 清除单页图片（重置为未生成）
 */
export const clearPageImage = async (
  projectId: string,
  pageId: string
): Promise<ApiResponse> => {
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/pages/${pageId}/clear-image`
  );
  return response.data;
};

// ===== 输出语言设置 API =====

/**
 * 获取默认输出语言设置（从服务器环境变量读取）
 *
 * 注意：这只返回服务器配置的默认语言。
 * 实际的语言选择应由前端在 sessionStorage 中管理，
 * 并在每次生成请求时通过 language 参数传递。
 */
export const getDefaultOutputLanguage = async (): Promise<ApiResponse<{ language: import('./generation').OutputLanguage }>> => {
  const response = await apiClient.get<ApiResponse<{ language: import('./generation').OutputLanguage }>>(
    '/api/output-language'
  );
  return response.data;
};

// ===== 系统设置 API =====

/**
 * 获取系统设置
 */
export const getSettings = async (): Promise<ApiResponse<Settings>> => {
  const response = await apiClient.get<ApiResponse<Settings>>('/api/settings');
  return response.data;
};

/**
 * 更新系统设置
 */
export const updateSettings = async (
  data: Partial<Omit<Settings, 'id' | 'api_key_length' | 'mineru_token_length' | 'baidu_ocr_api_key_length' | 'created_at' | 'updated_at'>> & {
    api_key?: string;
    mineru_token?: string;
    baidu_ocr_api_key?: string;
  }
): Promise<ApiResponse<Settings>> => {
  const response = await apiClient.put<ApiResponse<Settings>>('/api/settings', data);
  return response.data;
};

/**
 * 重置系统设置
 */
export const resetSettings = async (): Promise<ApiResponse<Settings>> => {
  const response = await apiClient.post<ApiResponse<Settings>>('/api/settings/reset');
  return response.data;
};

// ===== 设置测试 API =====

/**
 * 测试百度 OCR 服务
 */
export const testBaiduOcr = async (): Promise<ApiResponse<{ recognized_text: string }>> => {
  const response = await apiClient.post<ApiResponse<{ recognized_text: string }>>('/api/settings/tests/baidu-ocr');
  return response.data;
};

/**
 * 测试文本生成模型
 */
export const testTextModel = async (): Promise<ApiResponse<{ reply: string }>> => {
  const response = await apiClient.post<ApiResponse<{ reply: string }>>('/api/settings/tests/text-model');
  return response.data;
};

/**
 * 测试图片识别模型
 */
export const testCaptionModel = async (): Promise<ApiResponse<{ caption: string }>> => {
  const response = await apiClient.post<ApiResponse<{ caption: string }>>('/api/settings/tests/caption-model');
  return response.data;
};

/**
 * 测试百度图像修复
 */
export const testBaiduInpaint = async (): Promise<ApiResponse<{ image_size: [number, number] }>> => {
  const response = await apiClient.post<ApiResponse<{ image_size: [number, number] }>>('/api/settings/tests/baidu-inpaint');
  return response.data;
};

/**
 * 测试图像生成模型
 */
export const testImageModel = async (): Promise<ApiResponse<{ image_size: [number, number] }>> => {
  const response = await apiClient.post<ApiResponse<{ image_size: [number, number] }>>('/api/settings/tests/image-model');
  return response.data;
};

/**
 * 测试 MinerU PDF 解析
 */
export const testMineruPdf = async (): Promise<ApiResponse<{ batch_id: string; extract_id: string; content_preview: string }>> => {
  const response = await apiClient.post<ApiResponse<{ batch_id: string; extract_id: string; content_preview: string }>>('/api/settings/tests/mineru-pdf');
  return response.data;
};
