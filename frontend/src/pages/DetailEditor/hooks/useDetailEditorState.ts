import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useConfirm, useToast } from '@/components/shared';
import { refineDescriptions, updateProject, generateXhsBlueprint } from '@/api/endpoints';
import { useProjectStore } from '@/store/useProjectStore';
import { exportDescriptionsToMarkdown } from '@/utils/projectUtils';
import type { Page } from '@/types';

type XhsCopywritingPayload = {
  title?: string;
  body?: string;
  hashtags?: string[];
};

type XhsPayload = {
  product_type?: string;
  copywriting?: XhsCopywritingPayload;
  [key: string]: unknown;
};

export const useDetailEditorState = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const fromHistory = (location.state as { from?: string } | null)?.from === 'history';
  const {
    currentProject,
    syncProject,
    updatePageLocal,
    generateDescriptions,
    generatePageDescription,
    pageDescriptionGeneratingTasks,
    taskProgress,
  } = useProjectStore();
  const descriptionTasks = pageDescriptionGeneratingTasks || {};
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [isAiRefining, setIsAiRefining] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [regenerateTargetPageId, setRegenerateTargetPageId] = useState<string | null>(null);
  const [regenerateExtraPrompt, setRegenerateExtraPrompt] = useState('');
  const [isSubmittingRegenerate, setIsSubmittingRegenerate] = useState(false);
  const [xhsTitle, setXhsTitle] = useState('');
  const [xhsBody, setXhsBody] = useState('');
  const [xhsHashtags, setXhsHashtags] = useState('');
  const [isSavingXhsCopywriting, setIsSavingXhsCopywriting] = useState(false);
  const [isGeneratingXhsBlueprint, setIsGeneratingXhsBlueprint] = useState(false);

  const isXhsProject = currentProject?.product_type === 'xiaohongshu';
  const isInfographicProject = currentProject?.product_type === 'infographic';
  const isPptProject = !isXhsProject && !isInfographicProject;
  const pages = currentProject?.pages ?? [];

  const isBatchGeneratingDescriptions = useMemo(
    () => Object.keys(descriptionTasks).length > 0,
    [descriptionTasks]
  );

  const xhsPayload = useMemo<XhsPayload | null>(() => {
    if (!currentProject?.product_payload) return null;
    try {
      return JSON.parse(currentProject.product_payload) as XhsPayload;
    } catch {
      return null;
    }
  }, [currentProject?.product_payload]);

  useEffect(() => {
    if (projectId && (!currentProject || currentProject.id !== projectId)) {
      syncProject(projectId);
      return;
    }

    if (projectId && currentProject && currentProject.id === projectId) {
      const shouldSync = !currentProject.pages.some((page: Page) => page.description_content);
      if (shouldSync) {
        syncProject(projectId);
      }
    }
  }, [projectId, currentProject?.id, syncProject]);

  useEffect(() => {
    if (!isXhsProject) return;
    const copywriting = xhsPayload?.copywriting || {};
    const title = (copywriting.title || '').trim();
    const body = (copywriting.body || '').trim();
    const hashtagsArray = Array.isArray(copywriting.hashtags) ? copywriting.hashtags : [];
    const hashtags = hashtagsArray.filter(Boolean).join(' ');
    setXhsTitle(title);
    setXhsBody(body);
    setXhsHashtags(hashtags);
  }, [isXhsProject, xhsPayload]);

  const handleGenerateAll = async () => {
    const hasDescriptions = pages.some((page: Page) => page.description_content);

    const executeGenerate = async () => {
      try {
        if (isXhsProject && currentProject?.id) {
          await handleGenerateXhsBlueprint(false);
          return;
        }
        await generateDescriptions();
        show({ message: '已开始批量生成描述，请稍候…', type: 'info' });
      } catch (error: any) {
        show({ message: error?.message || '生成失败', type: 'error' });
      }
    };

    if (hasDescriptions) {
      confirm(
        '部分页面已有描述，重新生成将覆盖，确定继续吗？',
        executeGenerate,
        { title: '确认重新生成', variant: 'warning' }
      );
    } else {
      await executeGenerate();
    }
  };

  const handleSaveXhsCopywriting = async () => {
    if (!currentProject || !currentProject.id) return;
    setIsSavingXhsCopywriting(true);
    try {
      const existingPayload = xhsPayload && typeof xhsPayload === 'object' ? xhsPayload : {};
      const hashtags = xhsHashtags
        .split(/\s+/)
        .map((tag) => tag.trim())
        .filter(Boolean);
      const nextPayload = {
        ...existingPayload,
        product_type: 'xiaohongshu',
        copywriting: {
          ...(existingPayload.copywriting || {}),
          title: xhsTitle.trim(),
          body: xhsBody.trim(),
          hashtags,
        },
      };
      await updateProject(currentProject.id, {
        product_payload: JSON.stringify(nextPayload),
      });
      await syncProject(currentProject.id);
      show({ message: '文案已保存', type: 'success' });
    } catch (error: any) {
      show({ message: `保存失败: ${error.message || '未知错误'}`, type: 'error' });
    } finally {
      setIsSavingXhsCopywriting(false);
    }
  };

  const handleGenerateXhsBlueprint = async (copywritingOnly: boolean = false) => {
    if (!currentProject || !currentProject.id || isGeneratingXhsBlueprint) return;
    setIsGeneratingXhsBlueprint(true);
    try {
      await generateXhsBlueprint(currentProject.id, { copywritingOnly });
      await syncProject(currentProject.id);
      show({ message: copywritingOnly ? '已重新生成文案' : '已生成文案与卡片内容', type: 'success' });
    } catch (error: any) {
      show({ message: error.message || '生成失败', type: 'error' });
    } finally {
      setIsGeneratingXhsBlueprint(false);
    }
  };

  const openRegenerateModal = (pageId: string) => {
    setRegenerateTargetPageId(pageId);
    setRegenerateExtraPrompt('');
    setIsRegenerateModalOpen(true);
  };

  const closeRegenerateModal = () => {
    setIsRegenerateModalOpen(false);
  };

  const handleRegeneratePage = async (pageId: string) => {
    if (!currentProject) return;
    if (descriptionTasks[pageId]) {
      show({ message: '该页面正在生成中，请稍候...', type: 'info' });
      return;
    }

    const page = currentProject.pages.find((item: Page) => item.id === pageId);
    if (!page) return;

    if (page.description_content) {
      confirm(
        '该页面已有描述，重新生成将覆盖现有内容，确定继续吗？',
        () => openRegenerateModal(pageId),
        { title: '确认重新生成', variant: 'warning' }
      );
      return;
    }

    openRegenerateModal(pageId);
  };

  const handleConfirmRegenerate = async () => {
    if (!regenerateTargetPageId || isSubmittingRegenerate) return;
    setIsSubmittingRegenerate(true);
    setIsRegenerateModalOpen(false);

    try {
      await generatePageDescription(regenerateTargetPageId, {
        extraRequirements: regenerateExtraPrompt,
        forceRegenerate: true,
      });
      show({ message: '已开始生成该页描述，请稍候...', type: 'success' });
    } catch (error: any) {
      show({ message: `生成失败: ${error.message || '未知错误'}`, type: 'error' });
    } finally {
      setIsSubmittingRegenerate(false);
    }
  };

  const handleAiRefineDescriptions = useCallback(
    async (requirement: string, previousRequirements: string[]) => {
      if (!currentProject || !projectId) return;

      try {
        const response = await refineDescriptions(projectId, requirement, previousRequirements);
        await syncProject(projectId);
        show({
          message: response.data?.message || '页面描述修改成功',
          type: 'success',
        });
      } catch (error: any) {
        console.error('修改页面描述失败:', error);
        const errorMessage = error?.response?.data?.error?.message
          || error?.message
          || '修改失败，请稍后重试';
        show({ message: errorMessage, type: 'error' });
        throw error;
      }
    },
    [currentProject, projectId, syncProject, show]
  );

  const handleExportDescriptions = useCallback(() => {
    if (!currentProject) return;
    exportDescriptionsToMarkdown(currentProject);
    show({ message: '导出成功', type: 'success' });
  }, [currentProject, show]);

  const hasAllDescriptions = pages.every((page: Page) => page.description_content);
  const canProceedToPreview = isPptProject ? hasAllDescriptions : pages.length > 0;
  const completedPagesCount = pages.filter((page: Page) => page.description_content).length;
  const totalPagesCount = pages.length;
  const hasAnyDescriptions = completedPagesCount > 0;

  const progressTotal = Number((taskProgress as any)?.total ?? totalPagesCount);
  const progressCompleted = Math.min(
    Number((taskProgress as any)?.completed ?? 0),
    progressTotal
  );
  const progressPercent = Math.min(
    100,
    Math.round((progressCompleted / Math.max(1, progressTotal)) * 100)
  );

  return {
    projectId,
    fromHistory,
    currentProject,
    pages,
    updatePageLocal,
    pageDescriptionGeneratingTasks: descriptionTasks,
    taskProgress,
    isXhsProject,
    isInfographicProject,
    isPptProject,
    canProceedToPreview,
    hasAllDescriptions,
    isBatchGeneratingDescriptions,
    isAiRefining,
    setIsAiRefining,
    previewFileId,
    setPreviewFileId,
    isRegenerateModalOpen,
    regenerateExtraPrompt,
    setRegenerateExtraPrompt,
    isSubmittingRegenerate,
    xhsTitle,
    xhsBody,
    xhsHashtags,
    setXhsTitle,
    setXhsBody,
    setXhsHashtags,
    isSavingXhsCopywriting,
    isGeneratingXhsBlueprint,
    handleGenerateAll,
    handleExportDescriptions,
    handleGenerateXhsBlueprint,
    handleSaveXhsCopywriting,
    handleRegeneratePage,
    handleConfirmRegenerate,
    openRegenerateModal,
    closeRegenerateModal,
    handleAiRefineDescriptions,
    ToastContainer,
    ConfirmDialog,
    completedPagesCount,
    totalPagesCount,
    hasAnyDescriptions,
    progressCompleted,
    progressTotal,
    progressPercent,
  };
};
