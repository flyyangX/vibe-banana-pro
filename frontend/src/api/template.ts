import { apiClient } from './client';
import type { ApiResponse } from '@/types';

// ===== 项目模板 API =====

/**
 * 上传模板图片
 */
export const uploadTemplate = async (
  projectId: string,
  templateImage: File,
  templateKey?: string
): Promise<ApiResponse<{ template_image_url: string }>> => {
  const formData = new FormData();
  formData.append('template_image', templateImage);
  if (templateKey) {
    formData.append('template_key', templateKey);
  }

  const response = await apiClient.post<ApiResponse<{ template_image_url: string }>>(
    `/api/projects/${projectId}/template`,
    formData
  );
  return response.data;
};

/**
 * 清除项目模板
 */
export const deleteTemplate = async (projectId: string): Promise<ApiResponse> => {
  const response = await apiClient.delete<ApiResponse>(`/api/projects/${projectId}/template`);
  return response.data;
};

/**
 * 生成模板套装
 */
export const generateTemplateVariants = async (
  projectId: string,
  types: string[],
  options?: { extraRequirements?: string }
): Promise<ApiResponse<{ task_id: string; status: string; total: number }>> => {
  const response = await apiClient.post<ApiResponse<{ task_id: string; status: string; total: number }>>(
    `/api/projects/${projectId}/templates/generate`,
    {
      types,
      ...(options?.extraRequirements && options.extraRequirements.trim()
        ? { extra_requirements: options.extraRequirements }
        : {}),
    }
  );
  return response.data;
};

/**
 * 上传并替换模板套装变体图
 */
export const uploadTemplateVariant = async (
  projectId: string,
  variantType: 'cover' | 'content' | 'transition' | 'ending',
  file: File
): Promise<ApiResponse> => {
  const formData = new FormData();
  formData.append('variant_image', file);
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/templates/variant/${variantType}/upload`,
    formData
  );
  return response.data;
};

/**
 * 从历史版本中选择模板套装单图
 */
export const selectTemplateVariant = async (
  projectId: string,
  variantType: 'cover' | 'content' | 'transition' | 'ending',
  variantUrl: string
): Promise<ApiResponse> => {
  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/templates/variant/${variantType}/select`,
    { variant_url: variantUrl }
  );
  return response.data;
};

/**
 * 重新生成模板套装单图（支持额外提示词/参考图）
 */
export const regenerateTemplateVariant = async (
  projectId: string,
  variantType: 'cover' | 'content' | 'transition' | 'ending',
  options?: {
    extraRequirements?: string;
    refImageUrls?: string[];
    uploadedFiles?: File[];
  }
): Promise<ApiResponse> => {
  const extraRequirements = options?.extraRequirements;
  const refImageUrls = options?.refImageUrls;

  if (options?.uploadedFiles && options.uploadedFiles.length > 0) {
    const formData = new FormData();
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
      `/api/projects/${projectId}/templates/variant/${variantType}/regenerate`,
      formData
    );
    return response.data;
  }

  const response = await apiClient.post<ApiResponse>(
    `/api/projects/${projectId}/templates/variant/${variantType}/regenerate`,
    {
      ...(extraRequirements && extraRequirements.trim()
        ? { extra_requirements: extraRequirements }
        : {}),
      ...(refImageUrls && refImageUrls.length > 0 ? { ref_image_urls: refImageUrls } : {}),
    }
  );
  return response.data;
};

// ===== 用户模板 API =====

import type { UserTemplate } from './types';

// Re-export UserTemplate type for backwards compatibility
export type { UserTemplate } from './types';

/**
 * 上传用户模板
 */
export const uploadUserTemplate = async (
  templateImage: File,
  name?: string,
  productTags?: string[]
): Promise<ApiResponse<UserTemplate>> => {
  const formData = new FormData();
  formData.append('template_image', templateImage);
  if (name) {
    formData.append('name', name);
  }
  if (productTags && productTags.length > 0) {
    formData.append('product_tags', JSON.stringify(productTags));
  }

  const response = await apiClient.post<ApiResponse<UserTemplate>>(
    '/api/user-templates',
    formData
  );
  return response.data;
};

/**
 * 获取用户模板列表
 */
export const listUserTemplates = async (productTag?: string): Promise<ApiResponse<{ templates: UserTemplate[] }>> => {
  const response = await apiClient.get<ApiResponse<{ templates: UserTemplate[] }>>(
    '/api/user-templates',
    productTag ? { params: { product_tag: productTag } } : undefined
  );
  return response.data;
};

/**
 * 删除用户模板
 */
export const deleteUserTemplate = async (templateId: string): Promise<ApiResponse> => {
  const response = await apiClient.delete<ApiResponse>(`/api/user-templates/${templateId}`);
  return response.data;
};
