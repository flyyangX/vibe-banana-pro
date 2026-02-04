import { useCallback, useEffect, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, useConfirm } from '@/components/shared';
import { useProjectStore } from '@/store/useProjectStore';
import * as api from '@/api/endpoints';
import { normalizeProject } from '@/utils';
import { getProjectTitle, getProjectRoute } from '@/utils/projectUtils';
import type { Project } from '@/types';

export const useHistoryState = () => {
  const navigate = useNavigate();
  const { syncProject, setCurrentProject } = useProjectStore();
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.listProjects(50, 0);
      if (response.data?.projects) {
        setProjects(response.data.projects.map(normalizeProject));
      }
    } catch (err: any) {
      console.error('加载历史项目失败:', err);
      setError(err.message || '加载历史项目失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const navigateHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const clearSelection = useCallback(() => {
    setSelectedProjects(new Set());
  }, []);

  const handleSelectProject = useCallback(
    async (project: Project) => {
      const projectId = project.id || project.project_id;
      if (!projectId) return;

      if (selectedProjects.size > 0) return;
      if (editingProjectId === projectId) return;

      try {
        setCurrentProject(project);
        localStorage.setItem('currentProjectId', projectId);
        await syncProject(projectId);

        const route = getProjectRoute(project);
        navigate(route, { state: { from: 'history' } });
      } catch (err: any) {
        console.error('打开项目失败:', err);
        show({
          message: '打开项目失败: ' + (err.message || '未知错误'),
          type: 'error',
        });
      }
    },
    [selectedProjects, editingProjectId, setCurrentProject, syncProject, navigate, show]
  );

  const handleToggleSelect = useCallback((projectId: string) => {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedProjects((prev) => {
      if (prev.size === projects.length) {
        return new Set();
      }
      const allIds = projects.map((p) => p.id || p.project_id).filter(Boolean) as string[];
      return new Set(allIds);
    });
  }, [projects]);

  const deleteProjects = useCallback(
    async (projectIds: string[]) => {
      setIsDeleting(true);
      const currentProjectId = localStorage.getItem('currentProjectId');
      let deletedCurrentProject = false;

      try {
        await Promise.all(projectIds.map((projectId) => api.deleteProject(projectId)));

        if (currentProjectId && projectIds.includes(currentProjectId)) {
          localStorage.removeItem('currentProjectId');
          setCurrentProject(null);
          deletedCurrentProject = true;
        }

        setProjects((prev) =>
          prev.filter((p) => {
            const id = p.id || p.project_id;
            return id && !projectIds.includes(id);
          })
        );

        setSelectedProjects(new Set());

        show({
          message: deletedCurrentProject
            ? '已删除项目，包括当前打开的项目'
            : `成功删除 ${projectIds.length} 个项目`,
          type: deletedCurrentProject ? 'info' : 'success',
        });
      } catch (err: any) {
        console.error('删除项目失败:', err);
        show({
          message: '删除项目失败: ' + (err.message || '未知错误'),
          type: 'error',
        });
      } finally {
        setIsDeleting(false);
      }
    },
    [setCurrentProject, show]
  );

  const handleDeleteProject = useCallback(
    async (event: MouseEvent, project: Project) => {
      event.stopPropagation();

      const projectId = project.id || project.project_id;
      if (!projectId) return;

      const projectTitle = getProjectTitle(project);
      confirm(
        `确定要删除项目"${projectTitle}"吗？此操作不可恢复。`,
        async () => {
          await deleteProjects([projectId]);
        },
        { title: '确认删除', variant: 'danger' }
      );
    },
    [confirm, deleteProjects]
  );

  const handleBatchDelete = useCallback(async () => {
    if (selectedProjects.size === 0) return;

    const count = selectedProjects.size;
    confirm(
      `确定要删除选中的 ${count} 个项目吗？此操作不可恢复。`,
      async () => {
        const projectIds = Array.from(selectedProjects);
        await deleteProjects(projectIds);
      },
      { title: '确认批量删除', variant: 'danger' }
    );
  }, [selectedProjects, confirm, deleteProjects]);

  const handleStartEdit = useCallback(
    (event: MouseEvent, project: Project) => {
      event.stopPropagation();
      if (selectedProjects.size > 0) return;

      const projectId = project.id || project.project_id;
      if (!projectId) return;

      setEditingProjectId(projectId);
      setEditingTitle(getProjectTitle(project));
    },
    [selectedProjects]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingProjectId(null);
    setEditingTitle('');
  }, []);

  const handleSaveEdit = useCallback(
    async (projectId: string) => {
      if (!editingTitle.trim()) {
        show({ message: '项目名称不能为空', type: 'error' });
        return;
      }

      try {
        await api.updateProject(projectId, { idea_prompt: editingTitle.trim() });

        setProjects((prev) =>
          prev.map((p) => {
            const id = p.id || p.project_id;
            if (id === projectId) {
              return { ...p, idea_prompt: editingTitle.trim() };
            }
            return p;
          })
        );

        setEditingProjectId(null);
        setEditingTitle('');
        show({ message: '项目名称已更新', type: 'success' });
      } catch (err: any) {
        console.error('更新项目名称失败:', err);
        show({
          message: '更新项目名称失败: ' + (err.message || '未知错误'),
          type: 'error',
        });
      }
    },
    [editingTitle, show]
  );

  const handleTitleKeyDown = useCallback(
    (event: KeyboardEvent, projectId: string) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSaveEdit(projectId);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  return {
    projects,
    isLoading,
    error,
    selectedProjects,
    isDeleting,
    editingProjectId,
    editingTitle,
    ToastContainer,
    ConfirmDialog,
    loadProjects,
    navigateHome,
    clearSelection,
    setEditingTitle,
    handleSelectProject,
    handleToggleSelect,
    handleSelectAll,
    handleDeleteProject,
    handleBatchDelete,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleTitleKeyDown,
  };
};
