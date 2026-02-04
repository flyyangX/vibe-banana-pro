import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/shared';
import {
  listMaterials,
  uploadMaterial,
  listProjects,
  deleteMaterial,
  updateMaterialMeta,
  type Material,
} from '@/api/endpoints';
import type { Project } from '@/types';

interface UseMaterialManagerOptions {
  projectId?: string;
  isOpen: boolean;
}

export const useMaterialManager = ({ projectId, isOpen }: UseMaterialManagerOptions) => {
  const { show } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);

  const getMaterialKey = useCallback((m: Material): string => m.id, []);

  const getMaterialDisplayName = useCallback(
    (m: Material) =>
      (m.prompt && m.prompt.trim()) ||
      (m.name && m.name.trim()) ||
      (m.original_filename && m.original_filename.trim()) ||
      (m.source_filename && m.source_filename.trim()) ||
      m.filename ||
      m.url,
    []
  );

  const loadProjects = useCallback(async () => {
    try {
      const response = await listProjects(100, 0);
      if (response.data?.projects) {
        setProjects(response.data.projects);
        setProjectsLoaded(true);
      }
    } catch (error: any) {
      console.error('加载项目列表失败:', error);
    }
  }, []);

  const loadMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const targetProjectId =
        filterProjectId === 'all' ? 'all' : filterProjectId === 'none' ? 'none' : filterProjectId;
      const response = await listMaterials(targetProjectId);
      if (response.data?.materials) {
        setMaterials(response.data.materials);
      }
    } catch (error: any) {
      console.error('加载素材列表失败:', error);
      show({
        message: error?.response?.data?.error?.message || error.message || '加载素材列表失败',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filterProjectId, show]);

  useEffect(() => {
    if (isOpen) {
      if (!projectsLoaded) {
        loadProjects();
      }
      loadMaterials();
      setShowAllProjects(false);
    }
  }, [isOpen, filterProjectId, projectsLoaded, loadProjects, loadMaterials]);

  const handleSelectMaterial = useCallback(
    (material: Material, multiple: boolean, maxSelection?: number) => {
      const key = getMaterialKey(material);
      if (multiple) {
        setSelectedMaterials((prev) => {
          const newSelected = new Set(prev);
          if (newSelected.has(key)) {
            newSelected.delete(key);
          } else {
            if (maxSelection && newSelected.size >= maxSelection) {
              show({
                message: `最多只能选择 ${maxSelection} 个素材`,
                type: 'info',
              });
              return prev;
            }
            newSelected.add(key);
          }
          return newSelected;
        });
      } else {
        setSelectedMaterials(new Set([key]));
      }
    },
    [getMaterialKey, show]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedMaterials(new Set());
  }, []);

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const allowedTypes = [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/svg+xml',
      ];
      const invalidFiles = files.filter((item) => !allowedTypes.includes(item.type));
      if (invalidFiles.length > 0) {
        show({ message: '不支持的图片格式', type: 'error' });
        return;
      }

      setIsUploading(true);
      try {
        const targetProjectId =
          filterProjectId === 'all' || filterProjectId === 'none' ? null : filterProjectId;

        const results = await Promise.allSettled(
          files.map((item) =>
            uploadMaterial(item, targetProjectId, {
              displayName: item.name,
              note: JSON.stringify({ type: 'asset', source: 'material_upload' }),
            })
          )
        );
        const successCount = results.filter(
          (result) => result.status === 'fulfilled' && result.value?.data
        ).length;
        const failedCount = results.length - successCount;

        if (successCount > 0) {
          await Promise.allSettled(
            results
              .filter(
                (result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled'
              )
              .map((result) => {
                const material = result.value?.data;
                if (!material?.id) return Promise.resolve();
                return updateMaterialMeta(material.id, {
                  note: JSON.stringify({ type: 'asset', source: 'material_upload' }),
                });
              })
          );
          show({ message: `素材上传成功 ${successCount} 个`, type: 'success' });
          loadMaterials();
        }
        if (failedCount > 0) {
          show({ message: `素材上传失败 ${failedCount} 个`, type: 'error' });
        }
      } catch (error: any) {
        console.error('上传素材失败:', error);
        show({
          message: error?.response?.data?.error?.message || error.message || '上传素材失败',
          type: 'error',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [filterProjectId, loadMaterials, show]
  );

  const handleDeleteMaterial = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, material: Material) => {
      e.stopPropagation();
      const materialId = material.id;
      const key = getMaterialKey(material);

      if (!materialId) {
        show({ message: '无法删除：缺少素材ID', type: 'error' });
        return;
      }

      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.add(materialId);
        return next;
      });

      try {
        await deleteMaterial(materialId);
        setMaterials((prev) => prev.filter((m) => getMaterialKey(m) !== key));
        setSelectedMaterials((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        show({ message: '素材已删除', type: 'success' });
      } catch (error: any) {
        console.error('删除素材失败:', error);
        show({
          message: error?.response?.data?.error?.message || error.message || '删除素材失败',
          type: 'error',
        });
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(materialId);
          return next;
        });
      }
    },
    [getMaterialKey, show]
  );

  const getSelectedMaterials = useCallback(() => {
    return materials.filter((m) => selectedMaterials.has(getMaterialKey(m)));
  }, [materials, selectedMaterials, getMaterialKey]);

  const renderProjectLabel = useCallback((p: Project) => {
    const text = p.idea_prompt || p.outline_text || `项目 ${p.project_id.slice(0, 8)}`;
    return text.length > 20 ? `${text.slice(0, 20)}...` : text;
  }, []);

  return {
    // State
    materials,
    selectedMaterials,
    deletingIds,
    isLoading,
    isUploading,
    filterProjectId,
    projects,
    showAllProjects,
    projectId,

    // Setters
    setFilterProjectId,
    setShowAllProjects,

    // Actions
    loadMaterials,
    handleSelectMaterial,
    handleClearSelection,
    handleUpload,
    handleDeleteMaterial,
    getSelectedMaterials,

    // Helpers
    getMaterialKey,
    getMaterialDisplayName,
    renderProjectLabel,
  };
};

export type MaterialManagerReturn = ReturnType<typeof useMaterialManager>;
