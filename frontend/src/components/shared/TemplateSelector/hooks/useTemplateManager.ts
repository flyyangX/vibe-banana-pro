import { useState, useEffect, useMemo, useCallback } from 'react';
import { listUserTemplates, uploadUserTemplate, deleteUserTemplate, generateTemplateVariants, getTaskStatus, uploadTemplateVariant, selectTemplateVariant, regenerateTemplateVariant, type UserTemplate } from '@/api/endpoints';
import type { Material } from '@/api/endpoints';
import { materialUrlToFile } from '@/components/shared/MaterialSelector/index';

const templateVariantsTaskKey = 'templateVariantsTask';
const templateVariantRegenerateTaskKey = 'templateVariantRegenerateTask';

export interface UseTemplateManagerProps {
  projectId?: string | null;
  productContext?: 'ppt' | 'xhs' | 'infographic';
  showAllTemplates: boolean;
  templateVariants?: Record<string, string>;
  templateVariantsHistory?: Record<string, string[]>;
  onTemplatesGenerated?: () => Promise<void> | void;
  onSelect: (templateFile: File | null, templateId?: string) => void;
  showToast: (options: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export const presetTemplates = [
  { id: '1', name: '复古卷轴', preview: '/templates/template_y.png', thumb: '/templates/template_y-thumb.webp', tags: ['ppt', 'universal'] },
  { id: '2', name: '矢量插画', preview: '/templates/template_vector_illustration.png', thumb: '/templates/template_vector_illustration-thumb.webp', tags: ['ppt', 'universal'] },
  { id: '3', name: '拟物玻璃', preview: '/templates/template_glass.png', thumb: '/templates/template_glass-thumb.webp', tags: ['ppt', 'universal'] },
  { id: '4', name: '科技蓝', preview: '/templates/template_b.png', thumb: '/templates/template_b-thumb.webp', tags: ['ppt', 'universal'] },
  { id: '5', name: '简约商务', preview: '/templates/template_s.png', thumb: '/templates/template_s-thumb.webp', tags: ['ppt', 'universal'] },
  { id: '6', name: '学术报告', preview: '/templates/template_academic.jpg', thumb: '/templates/template_academic-thumb.webp', tags: ['ppt', 'universal'] },
];

// Session storage helpers
const readStoredTask = (key: string) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { taskId?: string; startedAt?: number; projectId?: string | null };
    if (!parsed?.taskId || typeof parsed.startedAt !== 'number') return null;
    return parsed;
  } catch (error) {
    console.warn('[TemplateSelector] 读取生成任务失败:', error);
    return null;
  }
};

const writeStoredTask = (key: string, value: { taskId: string; startedAt: number; projectId?: string | null }) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('[TemplateSelector] 写入生成任务失败:', error);
  }
};

const clearStoredTask = (key: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key);
  } catch (error) {
    console.warn('[TemplateSelector] 清除生成任务失败:', error);
  }
};

export const formatElapsed = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export function useTemplateManager({
  projectId,
  productContext,
  showAllTemplates,
  templateVariants = {},
  templateVariantsHistory = {},
  onTemplatesGenerated,
  onSelect,
  showToast,
}: UseTemplateManagerProps) {
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [saveToLibrary, setSaveToLibrary] = useState(true);

  // Variant generation state
  const [selectedVariantTypes, setSelectedVariantTypes] = useState<string[]>(['cover', 'content', 'transition', 'ending']);
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [variantsExtraPrompt, setVariantsExtraPrompt] = useState('');
  const [variantGenerateStartedAt, setVariantGenerateStartedAt] = useState<number | null>(null);

  // Single variant modal state
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [previewVariantType, setPreviewVariantType] = useState<'cover' | 'content' | 'transition' | 'ending' | null>(null);
  const [variantExtraPrompt, setVariantExtraPrompt] = useState('');
  const [variantRefImageUrls, setVariantRefImageUrls] = useState<string[]>([]);
  const [variantUploadedFiles, setVariantUploadedFiles] = useState<File[]>([]);
  const [isVariantRegenerating, setIsVariantRegenerating] = useState(false);
  const [isVariantUploading, setIsVariantUploading] = useState(false);
  const [isVariantSelecting, setIsVariantSelecting] = useState(false);
  const [variantRegenerateStartedAt, setVariantRegenerateStartedAt] = useState<number | null>(null);

  // Timer for elapsed time display
  const [now, setNow] = useState(Date.now());

  // Filter logic
  const filterByTag = useCallback((tags?: string[]) => {
    if (showAllTemplates || !productContext) return true;
    const safeTags = tags || [];
    return safeTags.includes(productContext) || safeTags.includes('universal');
  }, [productContext, showAllTemplates]);

  const filteredUserTemplates = useMemo(() => userTemplates.filter((t) => filterByTag(t.product_tags)), [userTemplates, filterByTag]);
  const filteredPresetTemplates = useMemo(() => presetTemplates.filter((t) => filterByTag(t.tags)), [filterByTag]);

  // Computed values
  const currentVariantUrl = previewVariantType ? templateVariants?.[previewVariantType] : undefined;
  const variantHistoryList = previewVariantType ? (templateVariantsHistory?.[previewVariantType] || []) : [];
  const variantGenerateElapsed = variantGenerateStartedAt ? Math.floor((now - variantGenerateStartedAt) / 1000) : 0;
  const variantRegenerateElapsed = variantRegenerateStartedAt ? Math.floor((now - variantRegenerateStartedAt) / 1000) : 0;

  // Load user templates on mount
  useEffect(() => {
    loadUserTemplates();
  }, []);

  // Timer effect
  useEffect(() => {
    if (!isGeneratingVariants && !isVariantRegenerating) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isGeneratingVariants, isVariantRegenerating]);

  // Restore tasks from session storage
  useEffect(() => {
    if (!projectId) return;
    const storedVariantsTask = readStoredTask(templateVariantsTaskKey);
    if (storedVariantsTask?.projectId === projectId && storedVariantsTask.taskId) {
      setIsGeneratingVariants(true);
      setVariantGenerateStartedAt(storedVariantsTask.startedAt || Date.now());
      pollTemplateTask(storedVariantsTask.taskId);
    } else if (storedVariantsTask?.projectId) {
      clearStoredTask(templateVariantsTaskKey);
    }

    const storedRegenerateTask = readStoredTask(templateVariantRegenerateTaskKey);
    if (storedRegenerateTask?.projectId === projectId && storedRegenerateTask.taskId) {
      setIsVariantRegenerating(true);
      setVariantRegenerateStartedAt(storedRegenerateTask.startedAt || Date.now());
      pollVariantTask(storedRegenerateTask.taskId);
    } else if (storedRegenerateTask?.projectId) {
      clearStoredTask(templateVariantRegenerateTaskKey);
    }
  }, [projectId]);

  const loadUserTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await listUserTemplates();
      if (response.data?.templates) {
        setUserTemplates(response.data.templates);
      }
    } catch (error: any) {
      console.error('加载用户模板失败:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleTemplateUpload = async (file: File, showUpload: boolean) => {
    try {
      if (showUpload) {
        const response = await uploadUserTemplate(file, undefined, productContext ? [productContext] : undefined);
        if (response.data) {
          const template = response.data;
          setUserTemplates(prev => [template, ...prev]);
          onSelect(null, template.template_id);
          showToast({ message: '模板上传成功', type: 'success' });
        }
      } else {
        if (saveToLibrary) {
          const response = await uploadUserTemplate(file, undefined, productContext ? [productContext] : undefined);
          if (response.data) {
            const template = response.data;
            setUserTemplates(prev => [template, ...prev]);
            onSelect(file, template.template_id);
            showToast({ message: '模板已保存到模板库', type: 'success' });
          }
        } else {
          onSelect(file);
        }
      }
    } catch (error: any) {
      console.error('上传模板失败:', error);
      showToast({ message: '模板上传失败: ' + (error.message || '未知错误'), type: 'error' });
    }
  };

  const handleSelectUserTemplate = (template: UserTemplate, selectedTemplateId?: string | null) => {
    if (selectedTemplateId === template.template_id) {
      onSelect(null);
      return;
    }
    onSelect(null, template.template_id);
  };

  const handleSelectPresetTemplate = (templateId: string, preview: string, selectedPresetTemplateId?: string | null) => {
    if (!preview) return;
    if (selectedPresetTemplateId === templateId) {
      onSelect(null);
      return;
    }
    onSelect(null, templateId);
  };

  const handleSelectMaterials = async (materials: Material[], saveAsTemplate?: boolean) => {
    if (materials.length === 0) return;
    try {
      const file = await materialUrlToFile(materials[0]);
      if (saveAsTemplate) {
        const response = await uploadUserTemplate(file, undefined, productContext ? [productContext] : undefined);
        if (response.data) {
          const template = response.data;
          setUserTemplates(prev => [template, ...prev]);
          onSelect(file, template.template_id);
          showToast({ message: '素材已保存到模板库', type: 'success' });
        }
      } else {
        onSelect(file);
        showToast({ message: '已从素材库选择作为模板', type: 'success' });
      }
    } catch (error: any) {
      console.error('加载素材失败:', error);
      showToast({ message: '加载素材失败: ' + (error.message || '未知错误'), type: 'error' });
    }
  };

  const handleDeleteUserTemplate = async (template: UserTemplate, selectedTemplateId?: string | null) => {
    if (selectedTemplateId === template.template_id) {
      showToast({ message: '当前使用中的模板不能删除，请先取消选择或切换', type: 'info' });
      return;
    }
    setDeletingTemplateId(template.template_id);
    try {
      await deleteUserTemplate(template.template_id);
      setUserTemplates((prev) => prev.filter((t) => t.template_id !== template.template_id));
      showToast({ message: '模板已删除', type: 'success' });
    } catch (error: any) {
      console.error('删除模板失败:', error);
      showToast({ message: '删除模板失败: ' + (error.message || '未知错误'), type: 'error' });
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const toggleVariantType = (type: string) => {
    setSelectedVariantTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
    );
  };

  // Polling functions
  const pollTemplateTask = async (taskId: string) => {
    if (!projectId) return;
    try {
      const response = await getTaskStatus(projectId, taskId);
      const task = response.data;
      if (!task) return;

      if (task.status === 'COMPLETED' || task.status === 'PARTIAL') {
        setIsGeneratingVariants(false);
        setVariantGenerateStartedAt(null);
        clearStoredTask(templateVariantsTaskKey);
        if (onTemplatesGenerated) {
          await onTemplatesGenerated();
        }
        showToast({ message: '模板套装生成完成', type: 'success' });
        return;
      }
      if (task.status === 'FAILED') {
        setIsGeneratingVariants(false);
        setVariantGenerateStartedAt(null);
        clearStoredTask(templateVariantsTaskKey);
        showToast({ message: task.error_message || '模板套装生成失败', type: 'error' });
        return;
      }
      setTimeout(() => pollTemplateTask(taskId), 1500);
    } catch (error: any) {
      setIsGeneratingVariants(false);
      setVariantGenerateStartedAt(null);
      clearStoredTask(templateVariantsTaskKey);
      showToast({ message: error.message || '模板套装生成失败', type: 'error' });
    }
  };

  const pollVariantTask = async (taskId: string) => {
    if (!projectId) return;
    try {
      const response = await getTaskStatus(projectId, taskId);
      const task = response.data;
      if (!task) return;

      if (task.status === 'COMPLETED') {
        setIsVariantRegenerating(false);
        setVariantRegenerateStartedAt(null);
        clearStoredTask(templateVariantRegenerateTaskKey);
        showToast({ message: '模板单图生成完成', type: 'success' });
        if (onTemplatesGenerated) {
          await onTemplatesGenerated();
        }
        return;
      }
      if (task.status === 'FAILED') {
        setIsVariantRegenerating(false);
        setVariantRegenerateStartedAt(null);
        clearStoredTask(templateVariantRegenerateTaskKey);
        showToast({ message: task.error_message || '模板单图生成失败', type: 'error' });
        return;
      }
      setTimeout(() => pollVariantTask(taskId), 1500);
    } catch (error: any) {
      setIsVariantRegenerating(false);
      setVariantRegenerateStartedAt(null);
      clearStoredTask(templateVariantRegenerateTaskKey);
      showToast({ message: error.message || '模板单图生成失败', type: 'error' });
    }
  };

  const handleGenerateVariants = async () => {
    if (!projectId) return;
    if (selectedVariantTypes.length === 0) {
      showToast({ message: '请至少选择一种模板类型', type: 'info' });
      return;
    }
    setIsGeneratingVariants(true);
    setVariantGenerateStartedAt(Date.now());
    try {
      const response = await generateTemplateVariants(projectId, selectedVariantTypes, {
        extraRequirements: variantsExtraPrompt,
      });
      if (response.data?.task_id) {
        writeStoredTask(templateVariantsTaskKey, {
          taskId: response.data.task_id,
          startedAt: Date.now(),
          projectId,
        });
        pollTemplateTask(response.data.task_id);
      } else {
        setIsGeneratingVariants(false);
        setVariantGenerateStartedAt(null);
        clearStoredTask(templateVariantsTaskKey);
        showToast({ message: '模板套装任务创建失败', type: 'error' });
      }
    } catch (error: any) {
      setIsGeneratingVariants(false);
      setVariantGenerateStartedAt(null);
      clearStoredTask(templateVariantsTaskKey);
      showToast({ message: error.message || '模板套装生成失败', type: 'error' });
    }
  };

  const openVariantModal = (variantType: 'cover' | 'content' | 'transition' | 'ending') => {
    setPreviewVariantType(variantType);
    setVariantExtraPrompt('');
    setVariantRefImageUrls([]);
    setVariantUploadedFiles([]);
    setIsVariantModalOpen(true);
  };

  const handleVariantUpload = async (file: File) => {
    if (!projectId || !previewVariantType) return;
    setIsVariantUploading(true);
    try {
      await uploadTemplateVariant(projectId, previewVariantType, file);
      showToast({ message: '模板已替换', type: 'success' });
      if (onTemplatesGenerated) {
        await onTemplatesGenerated();
      }
    } catch (error: any) {
      showToast({ message: error.message || '替换失败', type: 'error' });
    } finally {
      setIsVariantUploading(false);
    }
  };

  const handleSelectVariantHistory = async (variantUrl: string) => {
    if (!projectId || !previewVariantType || !variantUrl) return;
    setIsVariantSelecting(true);
    try {
      await selectTemplateVariant(projectId, previewVariantType, variantUrl);
      showToast({ message: '已切换到历史版本', type: 'success' });
      if (onTemplatesGenerated) {
        await onTemplatesGenerated();
      }
    } catch (error: any) {
      showToast({ message: error.message || '切换失败', type: 'error' });
    } finally {
      setIsVariantSelecting(false);
    }
  };

  const addVariantFiles = (files: File[]) => {
    setVariantUploadedFiles((prev) => [...prev, ...files]);
  };

  const removeVariantFile = (index: number) => {
    setVariantUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const addVariantUrls = (urls: string[]) => {
    setVariantRefImageUrls((prev) => {
      const merged = [...prev];
      urls.forEach((u) => {
        if (u && !merged.includes(u)) merged.push(u);
      });
      return merged;
    });
  };

  const removeVariantUrl = (index: number) => {
    setVariantRefImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariantRegenerate = async () => {
    if (!projectId || !previewVariantType) return;
    setIsVariantRegenerating(true);
    setVariantRegenerateStartedAt(Date.now());
    try {
      const response = await regenerateTemplateVariant(projectId, previewVariantType, {
        extraRequirements: variantExtraPrompt,
        refImageUrls: variantRefImageUrls,
        uploadedFiles: variantUploadedFiles,
      });
      if (response.data?.task_id) {
        writeStoredTask(templateVariantRegenerateTaskKey, {
          taskId: response.data.task_id,
          startedAt: Date.now(),
          projectId,
        });
        pollVariantTask(response.data.task_id);
      } else {
        setIsVariantRegenerating(false);
        setVariantRegenerateStartedAt(null);
        clearStoredTask(templateVariantRegenerateTaskKey);
        showToast({ message: '任务创建失败', type: 'error' });
      }
    } catch (error: any) {
      setIsVariantRegenerating(false);
      setVariantRegenerateStartedAt(null);
      clearStoredTask(templateVariantRegenerateTaskKey);
      showToast({ message: error.message || '模板单图生成失败', type: 'error' });
    }
  };

  return {
    // User templates
    userTemplates,
    filteredUserTemplates,
    filteredPresetTemplates,
    isLoadingTemplates,
    deletingTemplateId,
    saveToLibrary,
    setSaveToLibrary,

    // Template actions
    handleTemplateUpload,
    handleSelectUserTemplate,
    handleSelectPresetTemplate,
    handleSelectMaterials,
    handleDeleteUserTemplate,

    // Variant generation
    selectedVariantTypes,
    toggleVariantType,
    isGeneratingVariants,
    variantsExtraPrompt,
    setVariantsExtraPrompt,
    variantGenerateElapsed,
    handleGenerateVariants,

    // Single variant modal
    isVariantModalOpen,
    setIsVariantModalOpen,
    previewVariantType,
    openVariantModal,
    variantExtraPrompt,
    setVariantExtraPrompt,
    variantRefImageUrls,
    variantUploadedFiles,
    currentVariantUrl,
    variantHistoryList,
    isVariantRegenerating,
    isVariantUploading,
    isVariantSelecting,
    variantRegenerateElapsed,
    handleVariantUpload,
    handleSelectVariantHistory,
    addVariantFiles,
    removeVariantFile,
    addVariantUrls,
    removeVariantUrl,
    handleVariantRegenerate,
  };
}
