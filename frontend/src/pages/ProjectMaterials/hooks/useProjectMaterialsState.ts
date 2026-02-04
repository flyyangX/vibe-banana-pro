import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useConfirm, useToast } from '@/components/shared';
import {
  listMaterials,
  uploadMaterial,
  deleteMaterial,
  updateMaterialMeta,
  moveMaterial,
  copyMaterial,
  listProjects,
  type Material,
} from '@/api/endpoints';
import type { Project } from '@/types';
import { normalizeProject } from '@/utils';
import { getProjectTitle } from '@/utils/projectUtils';

export type MaterialScope = 'project' | 'global' | 'all';
export type ActionType = 'move' | 'copy';

type UseProjectMaterialsStateResult = {
  projectId?: string;
  currentProjectTitle: string;
  materials: Material[];
  isLoading: boolean;
  scope: MaterialScope;
  setScope: (value: MaterialScope) => void;
  search: string;
  setSearch: (value: string) => void;
  isGeneratorOpen: boolean;
  setIsGeneratorOpen: (value: boolean) => void;
  isUploading: boolean;
  uploadInputRef: RefObject<HTMLInputElement>;
  isMultiSelect: boolean;
  setIsMultiSelect: Dispatch<SetStateAction<boolean>>;
  selectedIds: Set<string>;
  projects: Project[];
  editingMaterial: Material | null;
  editDisplayName: string;
  editNote: string;
  actionMaterial: Material | null;
  actionType: ActionType | null;
  targetProjectId: string;
  setEditDisplayName: (value: string) => void;
  setEditNote: (value: string) => void;
  setTargetProjectId: (value: string) => void;
  getMaterialDisplayName: (material: Material) => string;
  handleUploadClick: () => void;
  handleUploadChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDelete: (materialId: string) => Promise<void>;
  openEditModal: (material: Material) => void;
  closeEditModal: () => void;
  handleSaveMeta: () => Promise<void>;
  openActionModal: (material: Material, type: ActionType) => void;
  openBulkActionModal: (type: ActionType) => void;
  closeActionModal: () => void;
  handleConfirmAction: () => Promise<void>;
  handleConfirmBulkAction: () => Promise<void>;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  selectAllFiltered: () => void;
  handleBulkDelete: () => Promise<void>;
  reloadMaterials: () => Promise<void>;
  ToastContainer: JSX.Element;
  ConfirmDialog: JSX.Element;
};

export const useProjectMaterialsState = (): UseProjectMaterialsStateResult => {
  const { projectId } = useParams<{ projectId: string }>();
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scope, setScope] = useState<MaterialScope>('project');
  const [search, setSearch] = useState('');
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editNote, setEditNote] = useState('');

  const [actionMaterial, setActionMaterial] = useState<Material | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [targetProjectId, setTargetProjectId] = useState<string>('none');

  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getMaterialDisplayName = useCallback((material: Material) => {
    return (
      (material.display_name && material.display_name.trim()) ||
      (material.name && material.name.trim()) ||
      (material.original_filename && material.original_filename.trim()) ||
      (material.source_filename && material.source_filename.trim()) ||
      material.filename ||
      material.url
    );
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const response = await listProjects(100, 0);
      if (response.data?.projects) {
        setProjects(response.data.projects.map(normalizeProject));
        setProjectsLoaded(true);
      }
    } catch (error: any) {
      console.error('加载项目列表失败:', error);
    }
  }, []);

  const loadMaterials = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      let target: string | undefined;
      if (scope === 'project') {
        target = projectId;
      } else if (scope === 'global') {
        target = 'none';
      } else {
        target = undefined;
      }
      const response = await listMaterials(target);
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
  }, [projectId, scope, show]);

  useEffect(() => {
    if (!projectsLoaded) {
      loadProjects();
    }
  }, [projectsLoaded, loadProjects]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const filteredMaterials = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const list = [...materials];
    list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    if (!keyword) return list;
    return list.filter((material) => {
      const haystack = [
        material.display_name,
        material.note,
        material.filename,
        material.name,
        material.original_filename,
        material.source_filename,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [materials, search]);

  const currentProjectTitle = useMemo(() => {
    const pid = projectId;
    if (!pid) return '项目素材库';
    const found = projects.find((project) => (project.id || project.project_id) === pid);
    return found ? getProjectTitle(found) : pid;
  }, [projectId, projects]);

  const handleUploadClick = () => {
    uploadInputRef.current?.click();
  };

  const handleUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length || !projectId) return;
    setIsUploading(true);
    try {
      await Promise.all(files.map((file) => uploadMaterial(file, projectId)));
      show({ message: `已上传 ${files.length} 个素材`, type: 'success' });
      await loadMaterials();
    } catch (error: any) {
      show({ message: error.message || '上传素材失败', type: 'error' });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (materialId: string) => {
    confirm(
      '确定要删除这个素材吗？此操作不可撤销。',
      async () => {
        try {
          await deleteMaterial(materialId);
          setMaterials((prev) => prev.filter((material) => material.id !== materialId));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(materialId);
            return next;
          });
          show({ message: '素材已删除', type: 'success' });
        } catch (error: any) {
          show({ message: error.message || '删除失败', type: 'error' });
        }
      },
      { title: '删除素材', confirmText: '删除', variant: 'danger' }
    );
  };

  const openEditModal = (material: Material) => {
    setEditingMaterial(material);
    setEditDisplayName(material.display_name || '');
    setEditNote(material.note || '');
  };

  const closeEditModal = () => setEditingMaterial(null);

  const handleSaveMeta = async () => {
    if (!editingMaterial) return;
    try {
      const response = await updateMaterialMeta(editingMaterial.id, {
        display_name: editDisplayName.trim() || null,
        note: editNote.trim() || null,
      });
      if (response.data?.material) {
        setMaterials((prev) =>
          prev.map((material) => (material.id === editingMaterial.id ? response.data!.material : material))
        );
      }
      show({ message: '已更新素材信息', type: 'success' });
      setEditingMaterial(null);
    } catch (error: any) {
      show({ message: error.message || '更新失败', type: 'error' });
    }
  };

  const openActionModal = (material: Material, type: ActionType) => {
    setActionMaterial(material);
    setActionType(type);
    setTargetProjectId(projectId || 'none');
  };

  const openBulkActionModal = (type: ActionType) => {
    if (selectedIds.size === 0) return;
    setActionMaterial(null);
    setActionType(type);
    setTargetProjectId(projectId || 'none');
  };

  const closeActionModal = () => {
    setActionMaterial(null);
    setActionType(null);
  };

  const handleConfirmAction = async () => {
    if (!actionMaterial || !actionType) return;
    try {
      if (actionType === 'move') {
        await moveMaterial(actionMaterial.id, targetProjectId);
      } else {
        await copyMaterial(actionMaterial.id, targetProjectId);
      }
      show({ message: actionType === 'move' ? '已移动素材' : '已复制素材', type: 'success' });
      await loadMaterials();
      setActionMaterial(null);
      setActionType(null);
    } catch (error: any) {
      show({ message: error.message || '操作失败', type: 'error' });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredMaterials.map((material) => material.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    confirm(
      `确定要删除选中的 ${ids.length} 个素材吗？此操作不可撤销。`,
      async () => {
        try {
          await Promise.all(ids.map((id) => deleteMaterial(id)));
          setMaterials((prev) => prev.filter((material) => !selectedIds.has(material.id)));
          clearSelection();
          show({ message: `已删除 ${ids.length} 个素材`, type: 'success' });
        } catch (error: any) {
          show({ message: error.message || '批量删除失败', type: 'error' });
        }
      },
      { title: '批量删除素材', confirmText: '删除', variant: 'danger' }
    );
  };

  const handleConfirmBulkAction = async () => {
    if (!actionType || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      if (actionType === 'move') {
        await Promise.all(ids.map((id) => moveMaterial(id, targetProjectId)));
      } else {
        await Promise.all(ids.map((id) => copyMaterial(id, targetProjectId)));
      }
      show({
        message: actionType === 'move' ? `已移动 ${ids.length} 个素材` : `已复制 ${ids.length} 个素材`,
        type: 'success',
      });
      await loadMaterials();
      clearSelection();
      setActionType(null);
    } catch (error: any) {
      show({ message: error.message || '批量操作失败', type: 'error' });
    }
  };

  const reloadMaterials = () => loadMaterials();

  return {
    projectId,
    currentProjectTitle,
    materials: filteredMaterials,
    isLoading,
    scope,
    setScope,
    search,
    setSearch,
    isGeneratorOpen,
    setIsGeneratorOpen,
    isUploading,
    uploadInputRef,
    isMultiSelect,
    setIsMultiSelect,
    selectedIds,
    projects,
    editingMaterial,
    editDisplayName,
    editNote,
    actionMaterial,
    actionType,
    targetProjectId,
    setEditDisplayName,
    setEditNote,
    setTargetProjectId,
    getMaterialDisplayName,
    handleUploadClick,
    handleUploadChange,
    handleDelete,
    openEditModal,
    closeEditModal,
    handleSaveMeta,
    openActionModal,
    openBulkActionModal,
    closeActionModal,
    handleConfirmAction,
    handleConfirmBulkAction,
    toggleSelect,
    clearSelection,
    selectAllFiltered,
    handleBulkDelete,
    reloadMaterials,
    ToastContainer,
    ConfirmDialog,
  };
};
