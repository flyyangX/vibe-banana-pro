import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '@/store/useProjectStore';
import { useExportTasksStore } from '@/store/useExportTasksStore';
import { useToast, useConfirm } from '@/components/shared';
import { getPageImageVersions, setCurrentImageVersion, updateProject, listUserTemplates, type UserTemplate } from '@/api/endpoints';
import type { ImageVersion, DescriptionContent, ExportExtractorMethod, ExportInpaintMethod } from '@/types';

export interface EditContextByPage {
  prompt: string;
  contextImages: {
    templateUsageMode: 'auto' | 'template' | 'style';
    descImageUrls: string[];
    uploadedFiles: File[];
  };
}

export interface SelectedContextImages {
  templateUsageMode: 'auto' | 'template' | 'style';
  descImageUrls: string[];
  uploadedFiles: File[];
}

export function useSlidePreviewState() {
  const { projectId } = useParams<{ projectId: string }>();
  const {
    currentProject,
    syncProject,
    generateImages,
    generateSinglePageImage,
    editPageImage,
    deletePageById,
    updatePageLocal,
    saveAllPages,
    clearPageImage,
    isGlobalLoading,
    taskProgress,
    pageGeneratingTasks,
    pageGeneratingStartedAt,
  } = useProjectStore();

  const { addTask, pollTask: pollExportTask, tasks: exportTasks, restoreActiveTasks } = useExportTasksStore();
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  // 基础状态
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  // 模态框状态
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isMaterialSelectorOpen, setIsMaterialSelectorOpen] = useState(false);

  // 重新生成状态
  const [isSubmittingRegenerate, setIsSubmittingRegenerate] = useState(false);
  const [regenerateExtraPrompt, setRegenerateExtraPrompt] = useState('');
  const [regenerateRefImageUrls, setRegenerateRefImageUrls] = useState<string[]>([]);
  const [regenerateUploadedFiles, setRegenerateUploadedFiles] = useState<File[]>([]);
  const [isRegenerateMaterialSelectorOpen, setIsRegenerateMaterialSelectorOpen] = useState(false);

  // 编辑状态
  const [editPrompt, setEditPrompt] = useState('');
  const [editOutlineTitle, setEditOutlineTitle] = useState('');
  const [editOutlinePoints, setEditOutlinePoints] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [selectedContextImages, setSelectedContextImages] = useState<SelectedContextImages>({
    templateUsageMode: 'auto',
    descImageUrls: [],
    uploadedFiles: [],
  });
  const [editContextByPage, setEditContextByPage] = useState<Record<string, EditContextByPage>>({});

  // 导出状态
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showExportTasksPanel, setShowExportTasksPanel] = useState(false);

  // 多选状态
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());

  // 版本状态
  const [imageVersions, setImageVersions] = useState<ImageVersion[]>([]);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  // 模板状态
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedPresetTemplateId, setSelectedPresetTemplateId] = useState<string | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [isClearingTemplate, setIsClearingTemplate] = useState(false);
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);

  // 项目设置状态
  const [extraRequirements, setExtraRequirements] = useState<string>('');
  const [isSavingRequirements, setIsSavingRequirements] = useState(false);
  const isEditingRequirements = useRef(false);
  const [templateStyle, setTemplateStyle] = useState<string>('');
  const [templateUsageMode, setTemplateUsageMode] = useState<'auto' | 'template' | 'style'>('auto');
  const [isSavingTemplateStyle, setIsSavingTemplateStyle] = useState(false);
  const isEditingTemplateStyle = useRef(false);
  const lastProjectId = useRef<string | null>(null);

  // 导出设置
  const [exportExtractorMethod, setExportExtractorMethod] = useState<ExportExtractorMethod>(
    (currentProject?.export_extractor_method as ExportExtractorMethod) || 'hybrid'
  );
  const [exportInpaintMethod, setExportInpaintMethod] = useState<ExportInpaintMethod>(
    (currentProject?.export_inpaint_method as ExportInpaintMethod) || 'hybrid'
  );
  const [isSavingExportSettings, setIsSavingExportSettings] = useState(false);

  // 批量生成准备状态
  const [isBatchPreparing, setIsBatchPreparing] = useState(false);
  const [batchPreparingText, setBatchPreparingText] = useState('');
  const batchPreparingTargetPageIdsRef = useRef<string[]>([]);
  const batchPreparingIntervalRef = useRef<number | null>(null);
  const batchPreparingIndexRef = useRef(0);

  // Memoized values
  const hasTemplateResource = useMemo(() => {
    const variants = currentProject?.template_variants || {};
    const hasVariants = Object.values(variants).some(Boolean);
    return Boolean(currentProject?.template_image_path) || hasVariants;
  }, [currentProject?.template_image_path, currentProject?.template_variants]);

  const pagesWithImages = useMemo(() => {
    return currentProject?.pages.filter(p => p.id && p.generated_image_path) || [];
  }, [currentProject?.pages]);

  const pagesWithImagesIdSet = useMemo(() => {
    return new Set(pagesWithImages.map(p => p.id!).filter(Boolean));
  }, [pagesWithImages]);

  const hasGeneratingPages = useMemo(() => {
    return Object.keys(pageGeneratingTasks || {}).length > 0;
  }, [pageGeneratingTasks]);

  const hasAllImages = useMemo(() => {
    return currentProject?.pages.every((p) => p.generated_image_path) ?? false;
  }, [currentProject?.pages]);

  const selectedPage = currentProject?.pages[selectedIndex];

  const batchPreparingMessages = useMemo(
    () => [
      '无模板模式启动：先给整套 PPT 统一一下风格...',
      '正在写提示词：标题站左边，图表站右边...',
      '配色盘在挑选中：冷静、克制、但要好看...',
      '版式在排队：对齐、留白、层级，一个都不能少...',
      '给每一页发任务单：马上开始出图...',
    ],
    []
  );

  // Callbacks
  const stopBatchPreparing = useCallback(() => {
    if (batchPreparingIntervalRef.current) {
      window.clearInterval(batchPreparingIntervalRef.current);
      batchPreparingIntervalRef.current = null;
    }
    batchPreparingTargetPageIdsRef.current = [];
    batchPreparingIndexRef.current = 0;
    setIsBatchPreparing(false);
    setBatchPreparingText('');
  }, []);

  const startBatchPreparing = useCallback((targetPageIds: string[]) => {
    stopBatchPreparing();
    batchPreparingTargetPageIdsRef.current = targetPageIds;
    batchPreparingIndexRef.current = 0;
    setIsBatchPreparing(true);
    setBatchPreparingText(batchPreparingMessages[0] || '正在准备...');

    batchPreparingIntervalRef.current = window.setInterval(() => {
      batchPreparingIndexRef.current += 1;
      const nextText = batchPreparingMessages[batchPreparingIndexRef.current % batchPreparingMessages.length];
      setBatchPreparingText(nextText);
    }, 1200);
  }, [batchPreparingMessages, stopBatchPreparing]);

  const formatElapsed = useCallback((seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  const getElapsedSeconds = useCallback((pageId?: string | null) => {
    if (!pageId) return undefined;
    const startedAt = pageGeneratingStartedAt?.[pageId];
    if (!startedAt) return undefined;
    return Math.floor((now - startedAt) / 1000);
  }, [now, pageGeneratingStartedAt]);

  const handleRefresh = useCallback(async () => {
    const targetProjectId = projectId || currentProject?.id;
    if (!targetProjectId) {
      show({ message: '无法刷新：缺少项目ID', type: 'error' });
      return;
    }

    setIsRefreshing(true);
    try {
      await syncProject(targetProjectId);
      show({ message: '刷新成功', type: 'success' });
    } catch (error: any) {
      show({
        message: error.message || '刷新失败，请稍后重试',
        type: 'error'
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [projectId, currentProject?.id, syncProject, show]);

  const handleSwitchVersion = useCallback(async (versionId: string) => {
    if (!currentProject || !selectedPage?.id || !projectId) return;

    try {
      await setCurrentImageVersion(projectId, selectedPage.id, versionId);
      await syncProject(projectId);
      setIsVersionModalOpen(false);
      show({ message: '已切换到该版本', type: 'success' });
    } catch (error: any) {
      show({
        message: `切换失败: ${error.message || '未知错误'}`,
        type: 'error'
      });
    }
  }, [currentProject, selectedPage?.id, projectId, syncProject, show]);

  const handleSaveExtraRequirements = useCallback(async () => {
    if (!currentProject || !projectId) return;

    setIsSavingRequirements(true);
    try {
      await updateProject(projectId, { extra_requirements: extraRequirements || '' });
      isEditingRequirements.current = false;
      await syncProject(projectId);
      show({ message: '额外要求已保存', type: 'success' });
    } catch (error: any) {
      show({
        message: `保存失败: ${error.message || '未知错误'}`,
        type: 'error'
      });
    } finally {
      setIsSavingRequirements(false);
    }
  }, [currentProject, projectId, extraRequirements, syncProject, show]);

  const handleSaveTemplateStyle = useCallback(async () => {
    if (!currentProject || !projectId) return;

    setIsSavingTemplateStyle(true);
    try {
      await updateProject(projectId, { template_style: templateStyle || '' });
      isEditingTemplateStyle.current = false;
      await syncProject(projectId);
      show({ message: '风格描述已保存', type: 'success' });
    } catch (error: any) {
      show({
        message: `保存失败: ${error.message || '未知错误'}`,
        type: 'error'
      });
    } finally {
      setIsSavingTemplateStyle(false);
    }
  }, [currentProject, projectId, templateStyle, syncProject, show]);

  const handleSaveExportSettings = useCallback(async () => {
    if (!currentProject || !projectId) return;

    setIsSavingExportSettings(true);
    try {
      await updateProject(projectId, {
        export_extractor_method: exportExtractorMethod,
        export_inpaint_method: exportInpaintMethod
      });
      await syncProject(projectId);
      show({ message: '导出设置已保存', type: 'success' });
    } catch (error: any) {
      show({
        message: `保存失败: ${error.message || '未知错误'}`,
        type: 'error'
      });
    } finally {
      setIsSavingExportSettings(false);
    }
  }, [currentProject, projectId, exportExtractorMethod, exportInpaintMethod, syncProject, show]);

  // 多选相关函数
  const togglePageSelection = useCallback((pageId: string) => {
    setSelectedPageIds(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  }, []);

  const selectAllPages = useCallback(() => {
    const allPageIds = (currentProject?.pages || []).map(p => p.id!).filter(Boolean);
    setSelectedPageIds(new Set(allPageIds));
  }, [currentProject?.pages]);

  const deselectAllPages = useCallback(() => {
    setSelectedPageIds(new Set());
  }, []);

  const toggleMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(prev => {
      if (prev) {
        setSelectedPageIds(new Set());
      }
      return !prev;
    });
  }, []);

  const getSelectedPageIdsForExport = useCallback((): string[] | undefined => {
    if (!isMultiSelectMode || selectedPageIds.size === 0) {
      return undefined;
    }
    return Array.from(selectedPageIds);
  }, [isMultiSelectMode, selectedPageIds]);

  const selectedExportableCount = useMemo(() => {
    if (!isMultiSelectMode || selectedPageIds.size === 0) return 0;
    return Array.from(selectedPageIds).filter(id => pagesWithImagesIdSet.has(id)).length;
  }, [isMultiSelectMode, selectedPageIds, pagesWithImagesIdSet]);

  // 从描述内容中提取图片URL
  const extractImageUrlsFromDescription = useCallback((descriptionContent: DescriptionContent | undefined): string[] => {
    if (!descriptionContent) return [];

    let text: string = '';
    if ('text' in descriptionContent) {
      text = descriptionContent.text as string;
    } else if ('text_content' in descriptionContent && Array.isArray(descriptionContent.text_content)) {
      text = descriptionContent.text_content.join('\n');
    }

    if (!text) return [];

    const pattern = /!\[.*?\]\((.*?)\)/g;
    const matches: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const url = match[1]?.trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        matches.push(url);
      }
    }

    return matches;
  }, []);

  // Effects
  useEffect(() => {
    restoreActiveTasks();
  }, [restoreActiveTasks]);

  useEffect(() => {
    if (!hasGeneratingPages) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [hasGeneratingPages]);

  useEffect(() => {
    if (!isBatchPreparing) return;
    const ids = batchPreparingTargetPageIdsRef.current;
    if (!ids || ids.length === 0) return;
    const hasAnyTaskStarted = ids.some((id) => Boolean(pageGeneratingTasks?.[id]));
    if (hasAnyTaskStarted) {
      stopBatchPreparing();
      show({ message: '提示词准备完成，开始出图了。', type: 'success' });
    }
  }, [isBatchPreparing, pageGeneratingTasks, show, stopBatchPreparing]);

  useEffect(() => {
    if (projectId && (!currentProject || currentProject.id !== projectId)) {
      syncProject(projectId);
    }

    const loadTemplates = async () => {
      try {
        const response = await listUserTemplates();
        if (response.data?.templates) {
          setUserTemplates(response.data.templates);
        }
      } catch (error) {
        console.error('加载用户模板失败:', error);
      }
    };
    loadTemplates();
  }, [projectId, currentProject, syncProject]);

  useEffect(() => {
    if (currentProject) {
      const isNewProject = lastProjectId.current !== currentProject.id;

      if (isNewProject) {
        setExtraRequirements(currentProject.extra_requirements || '');
        setTemplateStyle(currentProject.template_style || '');
        setExportExtractorMethod((currentProject.export_extractor_method as ExportExtractorMethod) || 'hybrid');
        setExportInpaintMethod((currentProject.export_inpaint_method as ExportInpaintMethod) || 'hybrid');
        lastProjectId.current = currentProject.id || null;
        isEditingRequirements.current = false;
        isEditingTemplateStyle.current = false;
      } else {
        if (!isEditingRequirements.current) {
          setExtraRequirements(currentProject.extra_requirements || '');
        }
        if (!isEditingTemplateStyle.current) {
          setTemplateStyle(currentProject.template_style || '');
        }
      }
    }
  }, [
    currentProject?.id,
    currentProject?.extra_requirements,
    currentProject?.template_style,
  ]);

  useEffect(() => {
    const loadVersions = async () => {
      if (!currentProject || !projectId || selectedIndex < 0 || selectedIndex >= currentProject.pages.length) {
        setImageVersions([]);
        setIsVersionModalOpen(false);
        return;
      }

      const page = currentProject.pages[selectedIndex];
      if (!page?.id) {
        setImageVersions([]);
        setIsVersionModalOpen(false);
        return;
      }

      try {
        const response = await getPageImageVersions(projectId, page.id);
        if (response.data?.versions) {
          setImageVersions(response.data.versions);
        }
      } catch (error) {
        console.error('Failed to load image versions:', error);
        setImageVersions([]);
      }
    };

    loadVersions();
  }, [currentProject, selectedIndex, projectId]);

  return {
    // Basic state
    projectId,
    currentProject,
    selectedIndex,
    setSelectedIndex,
    selectedPage,
    isRefreshing,
    now,

    // Project store
    syncProject,
    generateImages,
    generateSinglePageImage,
    editPageImage,
    deletePageById,
    updatePageLocal,
    saveAllPages,
    clearPageImage,
    isGlobalLoading,
    taskProgress,
    pageGeneratingTasks,

    // Modal states
    isEditModalOpen,
    setIsEditModalOpen,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    isRegenerateModalOpen,
    setIsRegenerateModalOpen,
    isProjectSettingsOpen,
    setIsProjectSettingsOpen,
    isMaterialModalOpen,
    setIsMaterialModalOpen,
    isMaterialSelectorOpen,
    setIsMaterialSelectorOpen,

    // Regenerate states
    isSubmittingRegenerate,
    setIsSubmittingRegenerate,
    regenerateExtraPrompt,
    setRegenerateExtraPrompt,
    regenerateRefImageUrls,
    setRegenerateRefImageUrls,
    regenerateUploadedFiles,
    setRegenerateUploadedFiles,
    isRegenerateMaterialSelectorOpen,
    setIsRegenerateMaterialSelectorOpen,

    // Edit states
    editPrompt,
    setEditPrompt,
    editOutlineTitle,
    setEditOutlineTitle,
    editOutlinePoints,
    setEditOutlinePoints,
    editDescription,
    setEditDescription,
    isOutlineExpanded,
    setIsOutlineExpanded,
    isDescriptionExpanded,
    setIsDescriptionExpanded,
    selectedContextImages,
    setSelectedContextImages,
    editContextByPage,
    setEditContextByPage,

    // Export states
    showExportMenu,
    setShowExportMenu,
    showExportTasksPanel,
    setShowExportTasksPanel,
    exportTasks,
    addTask,
    pollExportTask,

    // Multi-select
    isMultiSelectMode,
    selectedPageIds,
    togglePageSelection,
    selectAllPages,
    deselectAllPages,
    toggleMultiSelectMode,
    getSelectedPageIdsForExport,
    selectedExportableCount,

    // Version states
    imageVersions,
    isVersionModalOpen,
    setIsVersionModalOpen,

    // Template states
    selectedTemplateId,
    setSelectedTemplateId,
    selectedPresetTemplateId,
    setSelectedPresetTemplateId,
    isUploadingTemplate,
    setIsUploadingTemplate,
    isClearingTemplate,
    setIsClearingTemplate,
    userTemplates,

    // Project settings
    extraRequirements,
    setExtraRequirements,
    isSavingRequirements,
    isEditingRequirements,
    templateStyle,
    setTemplateStyle,
    templateUsageMode,
    setTemplateUsageMode,
    isSavingTemplateStyle,
    isEditingTemplateStyle,
    exportExtractorMethod,
    setExportExtractorMethod,
    exportInpaintMethod,
    setExportInpaintMethod,
    isSavingExportSettings,

    // Batch preparing
    isBatchPreparing,
    batchPreparingText,
    startBatchPreparing,
    stopBatchPreparing,

    // Computed values
    hasTemplateResource,
    pagesWithImages,
    pagesWithImagesIdSet,
    hasGeneratingPages,
    hasAllImages,

    // Callbacks
    formatElapsed,
    getElapsedSeconds,
    handleRefresh,
    handleSwitchVersion,
    handleSaveExtraRequirements,
    handleSaveTemplateStyle,
    handleSaveExportSettings,
    extractImageUrlsFromDescription,

    // Toast & Confirm
    show,
    ToastContainer,
    confirm,
    ConfirmDialog,
  };
}
