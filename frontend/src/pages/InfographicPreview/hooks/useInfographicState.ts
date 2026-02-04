import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '@/components/shared';
import {
  listMaterials,
  generateInfographic,
  getTaskStatus,
  updateProject,
  getSettings,
  listUserTemplates,
  uploadTemplate,
  deleteTemplate,
  editMaterialImage,
} from '@/api/endpoints';
import type { Material, UserTemplate } from '@/api/endpoints';
import type { ExportExtractorMethod, ExportInpaintMethod } from '@/types';
import { useProjectStore } from '@/store/useProjectStore';
import { getTemplateFile } from '@/components/shared/TemplateSelector/index';

export type InfographicMode = 'single' | 'series';

export type MaterialWithNote = Material & {
  noteData?: {
    type?: string;
    mode?: string;
    page_id?: string | null;
    order_index?: number;
  };
};

const parseNote = (note?: string | null) => {
  if (!note) return undefined;
  try {
    return JSON.parse(note);
  } catch {
    return undefined;
  }
};

export function useInfographicState() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, syncProject, updatePageLocal, saveAllPages } = useProjectStore();
  const { show, ToastContainer } = useToast();

  const [mode, setMode] = useState<InfographicMode>('single');
  const [materials, setMaterials] = useState<MaterialWithNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ total?: number; completed?: number } | null>(null);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [extraRequirements, setExtraRequirements] = useState('');
  const [templateStyle, setTemplateStyle] = useState('');
  const [templateUsageMode, setTemplateUsageMode] = useState<'auto' | 'template' | 'style'>('auto');
  const [isSavingRequirements, setIsSavingRequirements] = useState(false);
  const [isSavingTemplateStyle, setIsSavingTemplateStyle] = useState(false);
  const [exportExtractorMethod, setExportExtractorMethod] = useState<ExportExtractorMethod>(
    (currentProject?.export_extractor_method as ExportExtractorMethod) || 'hybrid'
  );
  const [exportInpaintMethod, setExportInpaintMethod] = useState<ExportInpaintMethod>(
    (currentProject?.export_inpaint_method as ExportInpaintMethod) || 'hybrid'
  );
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [resolution, setResolution] = useState('2K');
  const [isSavingExportSettings, setIsSavingExportSettings] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedPresetTemplateId, setSelectedPresetTemplateId] = useState<string | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [isClearingTemplate, setIsClearingTemplate] = useState(false);
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);

  const isEditingRequirements = useRef(false);
  const isEditingTemplateStyle = useRef(false);
  const lastProjectId = useRef<string | null>(null);

  // 编辑状态（复用 Slide 的统一编辑弹窗）
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTargetMaterial, setEditTargetMaterial] = useState<MaterialWithNote | null>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [editOutlineTitle, setEditOutlineTitle] = useState('');
  const [editOutlinePoints, setEditOutlinePoints] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [editDescImageUrls, setEditDescImageUrls] = useState<string[]>([]);
  const [selectedDescImageUrls, setSelectedDescImageUrls] = useState<string[]>([]);
  const [editUploadedFiles, setEditUploadedFiles] = useState<File[]>([]);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isEditingGenerating, setIsEditingGenerating] = useState(false);
  const [editingMaterialIds, setEditingMaterialIds] = useState<string[]>([]);

  const payloadMode = useMemo(() => {
    if (!currentProject?.product_payload) return null;
    try {
      const obj = JSON.parse(currentProject.product_payload);
      const m = obj?.mode;
      return m === 'series' ? ('series' as InfographicMode) : m === 'single' ? ('single' as InfographicMode) : null;
    } catch {
      return null;
    }
  }, [currentProject?.product_payload]);

  useEffect(() => {
    if (payloadMode) {
      setMode(payloadMode);
    }
  }, [payloadMode]);

  const loadMaterials = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const response = await listMaterials(projectId);
      const raw = response.data?.materials || [];
      const parsed = raw.map((m: Material) => ({
        ...m,
        noteData: parseNote(m.note),
      }));
      setMaterials(parsed);
    } catch (error: any) {
      console.error('加载信息图失败:', error);
      show({ message: '加载信息图失败', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, show]);

  useEffect(() => {
    if (!projectId) return;
    if (!currentProject || currentProject.id !== projectId) {
      syncProject(projectId);
    }
    loadMaterials();
  }, [projectId, currentProject?.id, syncProject, loadMaterials]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await getSettings();
        if (response.data) {
          setAspectRatio(response.data.image_aspect_ratio || '16:9');
          setResolution(response.data.image_resolution || '2K');
        }
      } catch (error) {
        // 如果读取失败，使用默认值即可
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (!currentProject) return;
    const isNewProject = lastProjectId.current !== currentProject.id;
    if (isNewProject) {
      setExtraRequirements(currentProject.extra_requirements || '');
      setTemplateStyle(currentProject.template_style || '');
      setSelectedTemplateId(null);
      setSelectedPresetTemplateId(null);
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
  }, [
    currentProject?.id,
    currentProject?.extra_requirements,
    currentProject?.template_style,
    currentProject?.export_extractor_method,
    currentProject?.export_inpaint_method,
  ]);

  const filteredMaterials = useMemo(() => {
    const list = materials.filter((m) => m.noteData?.type === 'infographic' && m.noteData?.mode === mode);
    if (mode === 'series') {
      // 对每个 page_id 只取最新一张，避免生成/编辑后出现重复
      const latestByPageId = new Map<string, MaterialWithNote>();
      list.forEach((m) => {
        const pid = m.noteData?.page_id || m.id;
        const existing = latestByPageId.get(pid);
        if (!existing) {
          latestByPageId.set(pid, m);
          return;
        }
        const prevTime = new Date(existing.created_at || 0).getTime();
        const nextTime = new Date(m.created_at || 0).getTime();
        if (nextTime >= prevTime) {
          latestByPageId.set(pid, m);
        }
      });
      return Array.from(latestByPageId.values()).sort((a, b) => (a.noteData?.order_index ?? 0) - (b.noteData?.order_index ?? 0));
    }
    return list.sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
  }, [materials, mode]);

  const displayMaterials = useMemo(
    () => (mode === 'single' ? filteredMaterials.slice(0, 1) : filteredMaterials),
    [filteredMaterials, mode]
  );

  const hasTemplateResource = useMemo(() => {
    const variants = currentProject?.template_variants || {};
    const hasVariants = Object.values(variants).some(Boolean);
    return Boolean(currentProject?.template_image_path) || hasVariants;
  }, [currentProject?.template_image_path, currentProject?.template_variants]);

  const pollTask = useCallback(
    async (taskId: string) => {
      if (!projectId) return;
      const poll = async () => {
        try {
          const response = await getTaskStatus(projectId, taskId);
          const task = response.data;
          if (task?.progress) {
            setProgress(task.progress);
          }
          if (task?.status === 'COMPLETED') {
            setIsGenerating(false);
            setProgress(null);
            await loadMaterials();
            show({ message: '信息图生成完成', type: 'success' });
            return;
          }
          if (task?.status === 'FAILED') {
            setIsGenerating(false);
            setProgress(null);
            show({ message: task.error_message || task.error || '生成失败', type: 'error' });
            return;
          }
          setTimeout(poll, 2000);
        } catch (error: any) {
          setIsGenerating(false);
          setProgress(null);
          show({ message: error.message || '任务查询失败', type: 'error' });
        }
      };
      poll();
    },
    [projectId, loadMaterials, show]
  );

  const handleGenerate = useCallback(async () => {
    if (!projectId || isGenerating) return;
    setIsGenerating(true);
    setProgress(null);
    try {
      const useTemplateOption =
        templateUsageMode === 'auto' ? undefined : templateUsageMode === 'template';
      const response = await generateInfographic(projectId, {
        mode,
        useTemplate: useTemplateOption,
        aspectRatio: aspectRatio.trim() || undefined,
        resolution: resolution.trim() || undefined,
      });
      const taskId = response.data?.task_id;
      if (!taskId) {
        setIsGenerating(false);
        show({ message: '未获取任务ID', type: 'error' });
        return;
      }
      show({ message: '信息图生成任务已开始', type: 'info' });
      await pollTask(taskId);
    } catch (error: any) {
      setIsGenerating(false);
      show({ message: error.message || '生成失败', type: 'error' });
    }
  }, [projectId, isGenerating, templateUsageMode, mode, aspectRatio, resolution, show, pollTask]);

  const extractImageUrlsFromDescription = useCallback((descriptionContent: any): string[] => {
    if (!descriptionContent) return [];
    let text = '';
    if (typeof descriptionContent === 'object' && descriptionContent && 'text' in descriptionContent) {
      text = String((descriptionContent as any).text || '');
    } else if (
      typeof descriptionContent === 'object' &&
      descriptionContent &&
      'text_content' in descriptionContent &&
      Array.isArray((descriptionContent as any).text_content)
    ) {
      text = (descriptionContent as any).text_content.join('\n');
    }
    if (!text) return [];
    const pattern = /!\[.*?\]\((.*?)\)/g;
    const matches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const url = match[1]?.trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/files/'))) {
        matches.push(url);
      }
    }
    return matches;
  }, []);

  const openEditModal = useCallback(
    (material: MaterialWithNote) => {
      setEditTargetMaterial(material);
      setEditInstruction('');
      setSelectedDescImageUrls([]);
      setEditUploadedFiles([]);
      setIsOutlineExpanded(false);
      setIsDescriptionExpanded(false);

      const pageId = material.noteData?.page_id;
      const page = pageId ? currentProject?.pages?.find((p) => p.id === pageId) : undefined;
      setEditOutlineTitle((page as any)?.outline_content?.title || '');
      setEditOutlinePoints((((page as any)?.outline_content?.points || []) as string[]).join('\n'));
      setEditDescription(
        typeof (page as any)?.description_content === 'object' && (page as any)?.description_content && 'text' in (page as any).description_content
          ? String((page as any).description_content.text || '')
          : ''
      );
      const descUrls = page ? extractImageUrlsFromDescription((page as any).description_content) : [];
      setEditDescImageUrls(descUrls);

      setIsEditModalOpen(true);
    },
    [currentProject?.pages, extractImageUrlsFromDescription]
  );

  const handleSaveOutlineAndDescription = useCallback(async () => {
    if (!projectId || !editTargetMaterial) return;
    const pageId = editTargetMaterial.noteData?.page_id;
    if (!pageId) return;

    const updatedOutline = {
      title: editOutlineTitle,
      points: editOutlinePoints.split('\n').filter((p) => p.trim()),
    };
    const updatedDescription = { text: editDescription };

    try {
      updatePageLocal(pageId, {
        outline_content: updatedOutline,
        description_content: updatedDescription,
      });
      await saveAllPages();
      await syncProject(projectId);
      show({ message: '已保存', type: 'success' });
    } catch (error: any) {
      show({ message: error.message || '保存失败', type: 'error' });
    }
  }, [
    projectId,
    editTargetMaterial,
    editOutlineTitle,
    editOutlinePoints,
    editDescription,
    updatePageLocal,
    saveAllPages,
    syncProject,
    show,
  ]);

  const handleSubmitEdit = useCallback(async () => {
    if (!projectId || !editTargetMaterial || !editInstruction.trim() || isSubmittingEdit) return;
    setIsSubmittingEdit(true);
    try {
      await handleSaveOutlineAndDescription();
      const response = await editMaterialImage(projectId, editTargetMaterial.id, {
        editInstruction,
        templateUsageMode,
        descImageUrls: selectedDescImageUrls,
        uploadedFiles: editUploadedFiles,
        aspectRatio,
        resolution,
      });
      const taskId = response.data?.task_id;
      if (!taskId) throw new Error('未获取任务ID');
      // “提交中”结束，进入“生成中”
      setIsSubmittingEdit(false);
      setIsEditModalOpen(false);
      setIsEditingGenerating(true);
      setEditingMaterialIds((prev) => (prev.includes(editTargetMaterial.id) ? prev : [...prev, editTargetMaterial.id]));
      show({ message: '已开始生成（信息图编辑）…', type: 'info' });

      const poll = async () => {
        try {
          const r = await getTaskStatus(projectId, taskId);
          const task = r.data;
          if (task?.status === 'COMPLETED') {
            setEditingMaterialIds((prev) => prev.filter((id) => id !== editTargetMaterial.id));
            setIsEditingGenerating(false);
            // 优先用任务返回的 material_id / image_url 做一次“乐观刷新”，避免列表刷新延迟或缓存导致看不到最新图
            const newMaterialId = (task as any)?.progress?.material_id as string | undefined;
            const newImageUrl = (task as any)?.progress?.image_url as string | undefined;
            if (newMaterialId && newImageUrl) {
              const baseNoteData = editTargetMaterial.noteData || {};
              const optimisticNoteData = {
                ...baseNoteData,
                source: 'edit',
                parent_material_id: editTargetMaterial.id,
              } as any;
              setMaterials((prev) => {
                const next = prev.filter((m) => m.id !== newMaterialId);
                next.unshift({
                  ...editTargetMaterial,
                  id: newMaterialId,
                  url: newImageUrl,
                  created_at: new Date().toISOString(),
                  note: JSON.stringify(optimisticNoteData),
                  noteData: optimisticNoteData,
                });
                return next;
              });
            }
            await loadMaterials();
            // 再补一枪：某些环境下 sqlite/文件落盘略慢，二次刷新更稳
            setTimeout(() => {
              loadMaterials();
            }, 1200);
            show({ message: '编辑完成', type: 'success' });
            return;
          }
          if (task?.status === 'FAILED') {
            setEditingMaterialIds((prev) => prev.filter((id) => id !== editTargetMaterial.id));
            setIsEditingGenerating(false);
            show({ message: task.error_message || task.error || '编辑失败', type: 'error' });
            return;
          }
          setTimeout(poll, 2000);
        } catch (e: any) {
          setEditingMaterialIds((prev) => prev.filter((id) => id !== editTargetMaterial.id));
          setIsEditingGenerating(false);
          show({ message: e.message || '任务查询失败', type: 'error' });
        }
      };
      poll();
    } catch (error: any) {
      setIsSubmittingEdit(false);
      // 404 场景：通常是后端没重启到最新代码或代理端口不对
      const msg = error?.response?.status === 404 ? '接口不存在（请确认后端已启动且已更新）' : error.message || '编辑失败';
      show({ message: msg, type: 'error' });
    }
  }, [
    projectId,
    editTargetMaterial,
    editInstruction,
    isSubmittingEdit,
    handleSaveOutlineAndDescription,
    editMaterialImage,
    templateUsageMode,
    selectedDescImageUrls,
    editUploadedFiles,
    aspectRatio,
    resolution,
    getTaskStatus,
    loadMaterials,
    show,
  ]);

  const handleSaveExtraRequirements = useCallback(async () => {
    if (!currentProject || !projectId) return;
    setIsSavingRequirements(true);
    try {
      await updateProject(projectId, { extra_requirements: extraRequirements || '' });
      isEditingRequirements.current = false;
      await syncProject(projectId);
      show({ message: '额外要求已保存', type: 'success' });
    } catch (error: any) {
      show({ message: `保存失败: ${error.message || '未知错误'}`, type: 'error' });
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
      show({ message: `保存失败: ${error.message || '未知错误'}`, type: 'error' });
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
        export_inpaint_method: exportInpaintMethod,
      });
      await syncProject(projectId);
      show({ message: '导出设置已保存', type: 'success' });
    } catch (error: any) {
      show({ message: `保存失败: ${error.message || '未知错误'}`, type: 'error' });
    } finally {
      setIsSavingExportSettings(false);
    }
  }, [currentProject, projectId, exportExtractorMethod, exportInpaintMethod, syncProject, show]);

  const handleTemplateSelect = useCallback(
    async (templateFile: File | null, templateId?: string) => {
      if (!projectId) return;
      let file = templateFile;
      if (templateId && !file) {
        file = await getTemplateFile(templateId, userTemplates);
        if (!file) {
          show({ message: '加载模板失败', type: 'error' });
          return;
        }
      }
      if (!file) {
        return;
      }

      setIsUploadingTemplate(true);
      try {
        await uploadTemplate(projectId, file, templateId);
        await syncProject(projectId);
        setIsTemplateModalOpen(false);
        show({ message: '模板更换成功', type: 'success' });
        if (templateId) {
          if (templateId.length <= 3 && /^\d+$/.test(templateId)) {
            setSelectedPresetTemplateId(templateId);
            setSelectedTemplateId(null);
          } else {
            setSelectedTemplateId(templateId);
            setSelectedPresetTemplateId(null);
          }
        }
      } catch (error: any) {
        show({ message: `更换模板失败: ${error.message || '未知错误'}`, type: 'error' });
      } finally {
        setIsUploadingTemplate(false);
      }
    },
    [projectId, userTemplates, syncProject, show]
  );

  const handleClearTemplate = useCallback(() => {
    if (!projectId) return;
    if (!hasTemplateResource) {
      show({ message: '当前项目没有模板可清除', type: 'info' });
      return;
    }
    setIsClearingTemplate(true);
    deleteTemplate(projectId)
      .then(async () => {
        await syncProject(projectId);
        setSelectedTemplateId(null);
        setSelectedPresetTemplateId(null);
        show({ message: '已取消当前模板', type: 'success' });
      })
      .catch((error: any) => {
        show({ message: `清除失败: ${error.message || '未知错误'}`, type: 'error' });
      })
      .finally(() => {
        setIsClearingTemplate(false);
      });
  }, [hasTemplateResource, projectId, show, syncProject]);

  const handleExtraRequirementsChange = useCallback((value: string) => {
    isEditingRequirements.current = true;
    setExtraRequirements(value);
  }, []);

  const handleTemplateStyleChange = useCallback((value: string) => {
    isEditingTemplateStyle.current = true;
    setTemplateStyle(value);
  }, []);

  return {
    // IDs and project
    projectId,
    currentProject,
    syncProject,

    // Toast
    show,
    ToastContainer,

    // Mode
    mode,
    setMode,

    // Materials
    materials,
    displayMaterials,
    isLoading,
    loadMaterials,

    // Generation
    isGenerating,
    progress,
    handleGenerate,

    // Modals
    isProjectSettingsOpen,
    setIsProjectSettingsOpen,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    isMaterialModalOpen,
    setIsMaterialModalOpen,

    // Requirements
    extraRequirements,
    handleExtraRequirementsChange,
    handleSaveExtraRequirements,
    isSavingRequirements,

    // Template style
    templateStyle,
    handleTemplateStyleChange,
    handleSaveTemplateStyle,
    isSavingTemplateStyle,
    templateUsageMode,
    setTemplateUsageMode,

    // Export settings
    exportExtractorMethod,
    setExportExtractorMethod,
    exportInpaintMethod,
    setExportInpaintMethod,
    handleSaveExportSettings,
    isSavingExportSettings,

    // Image settings
    aspectRatio,
    setAspectRatio,
    resolution,
    setResolution,

    // Template selection
    selectedTemplateId,
    selectedPresetTemplateId,
    userTemplates,
    handleTemplateSelect,
    handleClearTemplate,
    isUploadingTemplate,
    isClearingTemplate,
    hasTemplateResource,

    // Edit modal (infographic material edit)
    isEditingGenerating,
    editingMaterialIds,
    isEditModalOpen,
    setIsEditModalOpen,
    editTargetMaterial,
    openEditModal,
    editInstruction,
    setEditInstruction,
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
    editDescImageUrls,
    selectedDescImageUrls,
    setSelectedDescImageUrls,
    editUploadedFiles,
    setEditUploadedFiles,
    isSubmittingEdit,
    handleSaveOutlineAndDescription,
    handleSubmitEdit,
  };
}
