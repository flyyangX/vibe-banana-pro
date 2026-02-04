import { apiClient } from './client';
import type { ApiResponse } from '@/types';
import type { Material } from './types';

// Re-export Material type for backwards compatibility
export type { Material } from './types';

/**
 * 获取素材列表
 * @param projectId 项目ID，可选
 *   - If provided and not 'all' or 'none': Get materials for specific project via /api/projects/{projectId}/materials
 *   - If 'all': Get all materials via /api/materials?project_id=all
 *   - If 'none': Get global materials (not bound to any project) via /api/materials?project_id=none
 *   - If not provided: Get all materials via /api/materials
 */
export const listMaterials = async (
  projectId?: string
): Promise<ApiResponse<{ materials: Material[]; count: number }>> => {
  let url: string;

  if (!projectId || projectId === 'all') {
    // Get all materials using global endpoint
    url = '/api/materials?project_id=all';
  } else if (projectId === 'none') {
    // Get global materials (not bound to any project)
    url = '/api/materials?project_id=none';
  } else {
    // Get materials for specific project
    url = `/api/projects/${projectId}/materials`;
  }

  const response = await apiClient.get<ApiResponse<{ materials: Material[]; count: number }>>(url);
  return response.data;
};

/**
 * 上传素材图片
 * @param file 图片文件
 * @param projectId 可选的项目ID
 *   - If provided: Upload material bound to the project
 *   - If not provided or 'none': Upload as global material (not bound to any project)
 */
export const uploadMaterial = async (
  file: File,
  projectId?: string | null,
  metadata?: { displayName?: string | null; note?: string | null },
  onProgress?: (progress: number) => void
): Promise<ApiResponse<Material>> => {
  const formData = new FormData();
  formData.append('file', file);
  if (metadata?.displayName) {
    formData.append('display_name', metadata.displayName);
  }
  if (metadata?.note) {
    formData.append('note', metadata.note);
  }

  let url: string;
  if (!projectId || projectId === 'none') {
    // Use global upload endpoint for materials not bound to any project
    url = '/api/materials/upload';
  } else {
    // Use project-specific upload endpoint
    url = `/api/projects/${projectId}/materials/upload`;
  }

  const response = await apiClient.post<ApiResponse<Material>>(
    url,
    formData,
    onProgress
      ? {
          onUploadProgress: (event) => {
            if (!event.total) return;
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          },
        }
      : undefined
  );
  return response.data;
};

/**
 * 生成素材图片（异步任务）
 * @param projectId 项目ID，可为 'none' 生成全局素材
 * @param prompt 文本提示词
 * @param refImage 可选主参考图
 * @param extraImages 可选额外参考图
 */
export const generateMaterialImage = async (
  projectId: string | null,
  prompt: string,
  refImage?: File | null,
  extraImages?: File[]
): Promise<ApiResponse<{ task_id: string; status: string }>> => {
  const formData = new FormData();
  formData.append('prompt', prompt);
  if (refImage) {
    formData.append('ref_image', refImage);
  }
  if (extraImages && extraImages.length > 0) {
    extraImages.forEach(file => formData.append('extra_images', file));
  }

  const targetProjectId = projectId || 'none';
  const response = await apiClient.post<ApiResponse<{ task_id: string; status: string }>>(
    `/api/projects/${targetProjectId}/materials/generate`,
    formData
  );
  return response.data;
};

/**
 * 删除素材
 */
export const deleteMaterial = async (materialId: string): Promise<ApiResponse<{ id: string }>> => {
  const response = await apiClient.delete<ApiResponse<{ id: string }>>(`/api/materials/${materialId}`);
  return response.data;
};

/**
 * 更新素材元数据
 */
export const updateMaterialMeta = async (
  materialId: string,
  payload: { display_name?: string | null; note?: string | null }
): Promise<ApiResponse<{ material: Material }>> => {
  const response = await apiClient.patch<ApiResponse<{ material: Material }>>(
    `/api/materials/${materialId}`,
    payload
  );
  return response.data;
};

/**
 * 移动素材到目标项目（或全局）
 */
export const moveMaterial = async (
  materialId: string,
  targetProjectId?: string | null
): Promise<ApiResponse<{ material: Material }>> => {
  const response = await apiClient.post<ApiResponse<{ material: Material }>>(
    `/api/materials/${materialId}/move`,
    { target_project_id: targetProjectId ?? 'none' }
  );
  return response.data;
};

/**
 * 复制素材到目标项目（或全局）
 */
export const copyMaterial = async (
  materialId: string,
  targetProjectId?: string | null
): Promise<ApiResponse<{ material: Material }>> => {
  const response = await apiClient.post<ApiResponse<{ material: Material }>>(
    `/api/materials/${materialId}/copy`,
    { target_project_id: targetProjectId ?? 'none' }
  );
  return response.data;
};

/**
 * 关联素材到项目（通过URL）
 * @param projectId 项目ID
 * @param materialUrls 素材URL列表
 */
export const associateMaterialsToProject = async (
  projectId: string,
  materialUrls: string[]
): Promise<ApiResponse<{ updated_ids: string[]; count: number }>> => {
  const response = await apiClient.post<ApiResponse<{ updated_ids: string[]; count: number }>>(
    '/api/materials/associate',
    { project_id: projectId, material_urls: materialUrls }
  );
  return response.data;
};

/**
 * 编辑素材图片（异步任务），用于信息图等 Material 图片
 */
export const editMaterialImage = async (
  projectId: string,
  materialId: string,
  options: {
    editInstruction: string;
    templateUsageMode?: 'auto' | 'template' | 'style';
    descImageUrls?: string[];
    uploadedFiles?: File[];
    aspectRatio?: string;
    resolution?: string;
  }
): Promise<ApiResponse<{ task_id: string; status: string }>> => {
  const formData = new FormData();
  formData.append('edit_instruction', options.editInstruction);
  if (options.templateUsageMode) {
    formData.append('template_usage_mode', options.templateUsageMode);
  }
  if (options.descImageUrls && options.descImageUrls.length > 0) {
    formData.append('desc_image_urls', JSON.stringify(options.descImageUrls));
  }
  if (options.aspectRatio) {
    formData.append('aspect_ratio', options.aspectRatio);
  }
  if (options.resolution) {
    formData.append('resolution', options.resolution);
  }
  if (options.uploadedFiles && options.uploadedFiles.length > 0) {
    options.uploadedFiles.forEach((file) => formData.append('context_images', file));
  }
  const response = await apiClient.post<ApiResponse<{ task_id: string; status: string }>>(
    `/api/projects/${projectId}/materials/${materialId}/edit/image`,
    formData
  );
  return response.data;
};
