import { apiClient } from './client';
import type { ApiResponse, Page } from '@/types';
import type { OutputLanguage } from './types';

// Re-export OutputLanguage type for backwards compatibility
export type { OutputLanguage } from './types';

/**
 * 从后端 Settings 获取用户的输出语言偏好
 * 如果获取失败，返回默认值 'zh'
 */
export const getStoredOutputLanguage = async (): Promise<OutputLanguage> => {
  try {
    const response = await apiClient.get<ApiResponse<{ language: OutputLanguage }>>('/api/output-language');
    return response.data.data?.language || 'zh';
  } catch (error) {
    console.warn('Failed to load output language from settings, using default', error);
    return 'zh';
  }
};

// ===== 大纲生成 =====

/**
 * 生成大纲
 * @param projectId 项目ID
 * @param language 输出语言（可选，默认从 sessionStorage 获取）
 */
export const generateOutline = async (
  projectId: string,
  language?: OutputLanguage,
  options?: { pageCount?: number }
): Promise<ApiResponse> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/generate/outline`,
    {
      language: lang,
      ...(typeof options?.pageCount === 'number' ? { page_count: options.pageCount } : {}),
    }
  );
  return response.data;
};

// ===== 描述生成 =====

/**
 * 从描述文本生成大纲和页面描述（一次性完成）
 * @param projectId 项目ID
 * @param descriptionText 描述文本（可选）
 * @param language 输出语言（可选，默认从 sessionStorage 获取）
 */
export const generateFromDescription = async (projectId: string, descriptionText?: string, language?: OutputLanguage): Promise<ApiResponse> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/generate/from-description`,
    {
      ...(descriptionText ? { description_text: descriptionText } : {}),
      language: lang
    }
  );
  return response.data;
};

/**
 * 批量生成描述
 * @param projectId 项目ID
 * @param language 输出语言（可选，默认从 sessionStorage 获取）
 */
export const generateDescriptions = async (projectId: string, language?: OutputLanguage): Promise<ApiResponse> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/generate/descriptions`,
    { language: lang }
  );
  return response.data;
};

/**
 * 生成单页描述
 */
export const generatePageDescription = async (
  projectId: string,
  pageId: string,
  forceRegenerate: boolean = false,
  language?: OutputLanguage,
  extraRequirements?: string
): Promise<ApiResponse> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/pages/${pageId}/generate/description`,
    {
      force_regenerate: forceRegenerate,
      language: lang,
      ...(extraRequirements && extraRequirements.trim()
        ? { extra_requirements: extraRequirements }
        : {}),
    }
  );
  return response.data;
};

/**
 * 根据用户要求修改大纲
 * @param projectId 项目ID
 * @param userRequirement 用户要求
 * @param previousRequirements 历史要求（可选）
 * @param language 输出语言（可选，默认从 sessionStorage 获取）
 */
export const refineOutline = async (
  projectId: string,
  userRequirement: string,
  previousRequirements?: string[],
  language?: OutputLanguage
): Promise<ApiResponse<{ pages: Page[]; message: string }>> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.post<ApiResponse<{ pages: Page[]; message: string }>>(
    `/api/projects/${projectId}/refine/outline`,
    {
      user_requirement: userRequirement,
      previous_requirements: previousRequirements || [],
      language: lang
    }
  );
  return response.data;
};

/**
 * 根据用户要求修改页面描述
 * @param projectId 项目ID
 * @param userRequirement 用户要求
 * @param previousRequirements 历史要求（可选）
 * @param language 输出语言（可选，默认从 sessionStorage 获取）
 */
export const refineDescriptions = async (
  projectId: string,
  userRequirement: string,
  previousRequirements?: string[],
  language?: OutputLanguage
): Promise<ApiResponse<{ pages: Page[]; message: string }>> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.post<ApiResponse<{ pages: Page[]; message: string }>>(
    `/api/projects/${projectId}/refine/descriptions`,
    {
      user_requirement: userRequirement,
      previous_requirements: previousRequirements || [],
      language: lang
    }
  );
  return response.data;
};

// ===== 图片生成 =====

/**
 * 批量生成图片
 * @param projectId 项目ID
 * @param language 输出语言（可选，默认从 sessionStorage 获取）
 * @param pageIds 可选的页面ID列表，如果不提供则生成所有页面
 */
export const generateImages = async (projectId: string, language?: OutputLanguage, pageIds?: string[]): Promise<ApiResponse> => {
  const lang = language || await getStoredOutputLanguage();
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/generate/images`,
    { language: lang, page_ids: pageIds }
  );
  return response.data;
};

/**
 * 生成信息图
 */
export const generateInfographic = async (
  projectId: string,
  options?: {
    mode?: 'single' | 'series';
    pageIds?: string[];
    language?: OutputLanguage;
    aspectRatio?: string;
    resolution?: string;
    maxWorkers?: number;
    useTemplate?: boolean;
  }
): Promise<ApiResponse> => {
  const lang = options?.language || await getStoredOutputLanguage();
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/generate/infographic`,
    {
      mode: options?.mode || 'single',
      language: lang,
      ...(options?.pageIds && options.pageIds.length > 0 ? { page_ids: options.pageIds } : {}),
      ...(options?.aspectRatio ? { aspect_ratio: options.aspectRatio } : {}),
      ...(options?.resolution ? { resolution: options.resolution } : {}),
      ...(options?.maxWorkers ? { max_workers: options.maxWorkers } : {}),
      ...(options?.useTemplate !== undefined ? { use_template: options.useTemplate } : {}),
    }
  );
  return response.data;
};

/**
 * 生成小红书图文（竖版轮播）
 */
export const generateXhs = async (
  projectId: string,
  options?: {
    imageCount?: number; // 6-9
    aspectRatio?: '4:5' | '3:4' | 'auto';
    resolution?: string;
    maxWorkers?: number;
    useTemplate?: boolean;
    templateUsageMode?: 'auto' | 'template' | 'style';
    language?: OutputLanguage;
  }
): Promise<ApiResponse> => {
  const lang = options?.language || await getStoredOutputLanguage();
  const safeAspectRatio = options?.aspectRatio && options.aspectRatio !== 'auto' ? options.aspectRatio : undefined;
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/generate/xhs`,
    {
      language: lang,
      ...(typeof options?.imageCount === 'number' ? { image_count: options.imageCount } : {}),
      ...(safeAspectRatio ? { aspect_ratio: safeAspectRatio } : {}),
      ...(options?.resolution ? { resolution: options.resolution } : {}),
      ...(options?.maxWorkers ? { max_workers: options.maxWorkers } : {}),
      ...(typeof options?.useTemplate === 'boolean' ? { use_template: options.useTemplate } : {}),
      ...(options?.templateUsageMode ? { template_usage_mode: options.templateUsageMode } : {}),
    }
  );
  return response.data;
};

/**
 * 生成单张小红书图文卡片
 */
export const generateXhsCard = async (
  projectId: string,
  options: {
    index: number;
    aspectRatio?: '4:5' | '3:4' | 'auto';
    resolution?: string;
    useTemplate?: boolean;
    templateUsageMode?: 'auto' | 'template' | 'style';
    language?: OutputLanguage;
  }
): Promise<ApiResponse> => {
  const lang = options?.language || await getStoredOutputLanguage();
  const safeAspectRatio = options?.aspectRatio && options.aspectRatio !== 'auto' ? options.aspectRatio : undefined;
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/generate/xhs/card`,
    {
      index: options.index,
      language: lang,
      ...(safeAspectRatio ? { aspect_ratio: safeAspectRatio } : {}),
      ...(options?.resolution ? { resolution: options.resolution } : {}),
      ...(typeof options?.useTemplate === 'boolean' ? { use_template: options.useTemplate } : {}),
      ...(options?.templateUsageMode ? { template_usage_mode: options.templateUsageMode } : {}),
    }
  );
  return response.data;
};

/**
 * 编辑单张小红书图文卡片（基于已生成图片）
 */
export const editXhsCardImage = async (
  projectId: string,
  options: {
    index: number;
    editInstruction: string;
    aspectRatio?: '4:5' | '3:4' | 'auto';
    resolution?: string;
    templateUsageMode?: 'auto' | 'template' | 'style';
    descImageUrls?: string[];
    uploadedFiles?: File[];
  }
): Promise<ApiResponse> => {
  const formData = new FormData();
  formData.append('index', String(options.index));
  formData.append('edit_instruction', options.editInstruction);
  if (options.aspectRatio && options.aspectRatio !== 'auto') {
    formData.append('aspect_ratio', options.aspectRatio);
  }
  if (options.resolution) {
    formData.append('resolution', options.resolution);
  }
  if (options.templateUsageMode) {
    formData.append('template_usage_mode', options.templateUsageMode);
  }
  if (options.descImageUrls && options.descImageUrls.length > 0) {
    formData.append('desc_image_urls', JSON.stringify(options.descImageUrls));
  }
  if (options.uploadedFiles && options.uploadedFiles.length > 0) {
    options.uploadedFiles.forEach((file) => formData.append('context_images', file));
  }
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/generate/xhs/card/edit`,
    formData
  );
  return response.data;
};

/**
 * 生成小红书图文蓝图（仅文案+卡片内容，不出图）
 */
export const generateXhsBlueprint = async (
  projectId: string,
  options?: {
    aspectRatio?: '4:5' | '3:4' | 'auto';
    language?: OutputLanguage;
    copywritingOnly?: boolean;
  }
): Promise<ApiResponse> => {
  const lang = options?.language || await getStoredOutputLanguage();
  const safeAspectRatio = options?.aspectRatio && options.aspectRatio !== 'auto' ? options.aspectRatio : undefined;
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/generate/xhs/blueprint`,
    {
      language: lang,
      ...(safeAspectRatio ? { aspect_ratio: safeAspectRatio } : {}),
      ...(options?.copywritingOnly ? { copywriting_only: true } : {}),
    }
  );
  return response.data;
};

/**
 * 生成单页图片
 */
export const generatePageImage = async (
  projectId: string,
  pageId: string,
  forceRegenerate: boolean = false,
  language?: OutputLanguage,
  options?: {
    useTemplate?: boolean;
    extraRequirements?: string;
    refImageUrls?: string[]; // /files/... 或 http(s)...
    uploadedFiles?: File[];
  }
): Promise<ApiResponse> => {
  const lang = language || await getStoredOutputLanguage();
  const useTemplate = options?.useTemplate;
  const extraRequirements = options?.extraRequirements;
  const refImageUrls = options?.refImageUrls;

  // 如果有上传文件，用 multipart/form-data
  if (options?.uploadedFiles && options.uploadedFiles.length > 0) {
    const formData = new FormData();
    formData.append('force_regenerate', String(forceRegenerate));
    formData.append('language', lang);
    if (useTemplate !== undefined) {
      formData.append('use_template', String(useTemplate));
    }
    if (extraRequirements && extraRequirements.trim()) {
      formData.append('extra_requirements', extraRequirements);
    }
    if (refImageUrls && refImageUrls.length > 0) {
      formData.append('ref_image_urls', JSON.stringify(refImageUrls));
    }
    options.uploadedFiles.forEach((file) => {
      formData.append('context_images', file);
    });

    const response = await apiClient.post<ApiResponse>(
      `/api/projects/${projectId}/pages/${pageId}/generate/image`,
      formData
    );
    return response.data;
  }

  // 否则用 JSON
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/pages/${pageId}/generate/image`,
    {
      force_regenerate: forceRegenerate,
      language: lang,
      ...(useTemplate !== undefined ? { use_template: useTemplate } : {}),
      ...(extraRequirements && extraRequirements.trim()
        ? { extra_requirements: extraRequirements }
        : {}),
      ...(refImageUrls && refImageUrls.length > 0 ? { ref_image_urls: refImageUrls } : {}),
    }
  );
  return response.data;
};

/**
 * 编辑图片（自然语言修改）
 */
export const editPageImage = async (
  projectId: string,
  pageId: string,
  editPrompt: string,
  contextImages?: {
    templateUsageMode?: 'auto' | 'template' | 'style';
    descImageUrls?: string[];
    uploadedFiles?: File[];
  }
): Promise<ApiResponse> => {
  // 如果有上传的文件，使用 multipart/form-data
  if (contextImages?.uploadedFiles && contextImages.uploadedFiles.length > 0) {
    const formData = new FormData();
    formData.append('edit_instruction', editPrompt);
    if (contextImages.templateUsageMode) {
      formData.append('template_usage_mode', contextImages.templateUsageMode);
    }
    if (contextImages.descImageUrls && contextImages.descImageUrls.length > 0) {
      formData.append('desc_image_urls', JSON.stringify(contextImages.descImageUrls));
    }
    // 添加上传的文件
    contextImages.uploadedFiles.forEach((file) => {
      formData.append('context_images', file);
    });

    const response = await apiClient.post<ApiResponse>(
      `/api/projects/${projectId}/pages/${pageId}/edit/image`,
      formData
    );
    return response.data;
  } else {
    // 使用 JSON
    const response = await apiClient.post<ApiResponse>(
      `/api/projects/${projectId}/pages/${pageId}/edit/image`,
      {
        edit_instruction: editPrompt,
        context_images: {
          ...(contextImages?.templateUsageMode ? { template_usage_mode: contextImages.templateUsageMode } : {}),
          desc_image_urls: contextImages?.descImageUrls || [],
        },
      }
    );
    return response.data;
  }
};

