import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  deleteTemplate,
  editXhsCardImage,
  exportXhsZip,
  generateXhsCard,
  getPageImageVersions,
  getSettings,
  getTaskStatus,
  getXhsCardImageVersions,
  listMaterials,
  listUserTemplates,
  setCurrentImageVersion,
  setXhsCardCurrentImageVersion,
  updateProject,
  updateXhsCardMaterials,
  uploadTemplate,
} from '@/api/endpoints';
import { getTemplateFile } from '@/components/shared/TemplateSelector/index';
import type { Material, UserTemplate, XhsCardImageVersion } from '@/api/endpoints';
import { getImageUrl } from '@/api/client';
import { useProjectStore } from '@/store/useProjectStore';
import { useToast, useConfirm } from '@/components/shared';
import { materialUrlToFile } from '@/components/shared/MaterialSelector/index';
import type { XhsAspectRatio, XhsVersionItem } from '@/pages/XhsPreview/types';
import type { MaterialWithNote, XhsDisplayCard } from '@/pages/XhsPreview/types';
import { parseNote, parsePayload, normalizeFilesUrl } from '@/pages/XhsPreview/utils';

export function useXhsPreviewState() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, syncProject, updatePageLocal, saveAllPages } = useProjectStore();
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [aspectRatio, setAspectRatio] = useState<XhsAspectRatio>(() => {
    const ratio = (location.state as any)?.aspectRatio;
    if (ratio === '3:4' || ratio === '4:5' || ratio === 'auto') return ratio;
    return '3:4';
  });
  const imageCount = useMemo(() => {
    const count = currentProject?.pages?.length;
    if (typeof count === 'number' && count > 0) return count;
    const n = Number((location.state as any)?.imageCount);
    return Number.isFinite(n) && n > 0 ? n : 7;
  }, [currentProject?.pages?.length, location.state]);
  const [materials, setMaterials] = useState<MaterialWithNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ total?: number; completed?: number; failed?: number } | null>(null);
  const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [regeneratingIndex, setRegeneratingIndex] = useState<Record<number, boolean>>({});
  const [regeneratingStartedAt, setRegeneratingStartedAt] = useState<Record<number, number>>({});
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isMaterialPlanModalOpen, setIsMaterialPlanModalOpen] = useState(false);
  const [materialPlanTargetIndex, setMaterialPlanTargetIndex] = useState<number | null>(null);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [lockAfterReplace, setLockAfterReplace] = useState(true);
  const [isUpdatingMaterialPlan, setIsUpdatingMaterialPlan] = useState(false);
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedPresetTemplateId, setSelectedPresetTemplateId] = useState<string | null>(null);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [isClearingTemplate, setIsClearingTemplate] = useState(false);
  const [extraRequirements, setExtraRequirements] = useState<string>('');
  const [templateStyle, setTemplateStyle] = useState<string>('');
  const [templateUsageMode, setTemplateUsageMode] = useState<'auto' | 'template' | 'style'>('auto');
  const [editTemplateUsageMode, setEditTemplateUsageMode] = useState<'auto' | 'template' | 'style'>('auto');
  const [isSavingRequirements, setIsSavingRequirements] = useState(false);
  const [isSavingTemplateStyle, setIsSavingTemplateStyle] = useState(false);
  const isEditingRequirements = useRef(false);
  const isEditingTemplateStyle = useRef(false);
  const lastProjectId = useRef<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [editOutlineTitle, setEditOutlineTitle] = useState('');
  const [editOutlinePoints, setEditOutlinePoints] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [editDescImageUrls, setEditDescImageUrls] = useState<string[]>([]);
  const [selectedDescImageUrls, setSelectedDescImageUrls] = useState<string[]>([]);
  const [editUploadedFiles, setEditUploadedFiles] = useState<File[]>([]);
  const [isEditMaterialSelectorOpen, setIsEditMaterialSelectorOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionTargetIndex, setVersionTargetIndex] = useState<number | null>(null);
  const [versionList, setVersionList] = useState<XhsVersionItem[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isSwitchingVersion, setIsSwitchingVersion] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'zip' | 'single'>('zip');
  const [exportSelectedIndices, setExportSelectedIndices] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [xhsMaxConcurrent, setXhsMaxConcurrent] = useState(3);

  const openExportModal = useCallback(() => {
    setExportMode('zip');
    setIsExportModalOpen(true);
  }, []);

  const xhsPayload = useMemo(() => parsePayload(currentProject?.product_payload || null), [currentProject?.product_payload]);
  const materialPlanList = useMemo(() => xhsPayload?.material_plan || [], [xhsPayload?.material_plan]);

  useEffect(() => {
    const stateRatio = (location.state as any)?.aspectRatio;
    if (stateRatio === '4:5' || stateRatio === '3:4' || stateRatio === 'auto') return;
    const ratio = (xhsPayload?.aspect_ratio || '').trim();
    if (ratio === '4:5' || ratio === '3:4') {
      setAspectRatio(ratio);
    } else if (ratio === 'auto') {
      setAspectRatio('auto');
    }
  }, [xhsPayload?.aspect_ratio, location.state]);

  const hasTemplateResource = useMemo(() => {
    const variants = currentProject?.template_variants || {};
    const hasVariants = Object.values(variants).some(Boolean);
    return Boolean(currentProject?.template_image_path) || hasVariants;
  }, [currentProject?.template_image_path, currentProject?.template_variants]);

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
      console.error('加载小红书图文失败:', error);
      show({ message: '加载素材失败', type: 'error' });
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
    const loadSettings = async () => {
      try {
        const response = await getSettings();
        if (response.data) {
          const raw = response.data.max_image_workers;
          const parsed = Number.isFinite(raw) ? Number(raw) : 3;
          const normalized = Math.min(16, Math.max(1, parsed || 3));
          setXhsMaxConcurrent(normalized);
        }
      } catch {
        // 读取失败时使用默认值
      }
    };
    loadSettings();
  }, []);

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
    if (currentProject) {
      const isNewProject = lastProjectId.current !== currentProject.id;
      if (isNewProject) {
        setExtraRequirements(currentProject.extra_requirements || '');
        setTemplateStyle(currentProject.template_style || '');
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
  }, [currentProject?.id, currentProject?.extra_requirements, currentProject?.template_style]);

  const xhsMaterials = useMemo(() => {
    const list = materials.filter((m) => m.noteData?.type === 'xhs' && m.noteData?.mode === 'vertical_carousel');
    const latestByIndex = new Map<number, MaterialWithNote>();
    const byId = new Map<string, MaterialWithNote>();
    list.forEach((m) => {
      byId.set(m.id, m);
      const idx = Number(m.noteData?.index) || 0;
      const existing = latestByIndex.get(idx);
      if (!existing) {
        latestByIndex.set(idx, m);
        return;
      }
      const prevTime = new Date(existing.created_at || 0).getTime();
      const nextTime = new Date(m.created_at || 0).getTime();
      if (nextTime >= prevTime) {
        latestByIndex.set(idx, m);
      }
    });
    const payloadMaterials = xhsPayload?.materials || [];
    const resultMap = new Map<number, MaterialWithNote>();
    payloadMaterials.forEach((entry) => {
      const idx = Number(entry.index) || 0;
      const materialId = entry.material_id as string | undefined;
      const preferred = materialId ? byId.get(materialId) : undefined;
      const fallback = latestByIndex.get(idx);
      if (preferred) {
        resultMap.set(idx, preferred);
      } else if (fallback) {
        resultMap.set(idx, fallback);
      }
    });
    if (resultMap.size === 0) {
      latestByIndex.forEach((value, key) => resultMap.set(key, value));
    }
    return Array.from(resultMap.values()).sort((a, b) => (Number(a.noteData?.index) || 0) - (Number(b.noteData?.index) || 0));
  }, [materials, xhsPayload?.materials]);

  const assetMaterials = useMemo(() => materials.filter((m) => m.noteData?.type === 'asset'), [materials]);
  const assetMaterialIdSet = useMemo(() => new Set(assetMaterials.map((m) => m.id)), [assetMaterials]);
  const assetMaterialIdByUrl = useMemo(() => {
    const map = new Map<string, string>();
    assetMaterials.forEach((m) => {
      const u = normalizeFilesUrl(m.url);
      if (u) map.set(u, m.id);
    });
    return map;
  }, [assetMaterials]);
  const materialById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const materialPlanByIndex = useMemo(() => {
    const map = new Map<number, { material_ids?: string[]; locked?: boolean; reason?: string }>();
    materialPlanList.forEach((entry, idx) => {
      if (entry) map.set(idx, entry);
    });
    return map;
  }, [materialPlanList]);

  const xhsMaterialByIndex = useMemo(() => {
    const map = new Map<number, MaterialWithNote>();
    xhsMaterials.forEach((m) => {
      const idx = Number(m.noteData?.index) || 0;
      if (!map.has(idx)) map.set(idx, m);
    });
    return map;
  }, [xhsMaterials]);

  const xhsDisplayCards = useMemo((): XhsDisplayCard[] => {
    const pages = currentProject?.pages || [];
    const result: XhsDisplayCard[] = [];
    for (let i = 0; i < imageCount; i += 1) {
      const label = i === 0 ? '封面' : `第 ${i + 1} 张`;
      const page = pages[i];
      const pageImageUrl = page?.generated_image_url ? getImageUrl(page.generated_image_url, page.updated_at) : null;
      if (pageImageUrl) {
        result.push({ index: i, label, imageUrl: pageImageUrl, source: 'page', pageId: page?.id });
        continue;
      }
      const fallback = xhsMaterialByIndex.get(i);
      if (fallback) {
        result.push({
          index: i,
          label,
          imageUrl: getImageUrl(fallback.url, fallback.created_at),
          source: 'material',
          material: fallback,
          pageId: page?.id,
        });
        continue;
      }
      result.push({ index: i, label, imageUrl: null, source: 'none', pageId: page?.id });
    }
    return result;
  }, [currentProject?.pages, imageCount, xhsMaterialByIndex]);

  const copywritingText = useMemo(() => {
    const cw = xhsPayload?.copywriting;
    const title = (cw?.title || '').trim();
    const body = (cw?.body || '').trim();
    const hashtags = Array.isArray(cw?.hashtags) ? cw!.hashtags!.filter(Boolean).join(' ') : '';
    const parts = [];
    if (title) parts.push(title);
    if (body) parts.push(body);
    if (hashtags) parts.push(hashtags);
    return parts.join('\n\n');
  }, [xhsPayload]);

  const handleCopy = useCallback(async () => {
    if (!copywritingText) {
      show({ message: '暂无文案可复制', type: 'info' });
      return;
    }
    try {
      await navigator.clipboard.writeText(copywritingText);
      show({ message: '已复制文案', type: 'success' });
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = copywritingText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        show({ message: '已复制文案', type: 'success' });
      } catch {
        show({ message: '复制失败，请手动复制', type: 'error' });
      }
    }
  }, [copywritingText, show]);

  const toggleExportIndex = useCallback((idx: number) => {
    setExportSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const selectableIndices = useMemo(
    () => xhsDisplayCards.filter((c) => Boolean(c.imageUrl)).map((c) => c.index),
    [xhsDisplayCards]
  );
  const allSelected = useMemo(() => {
    if (selectableIndices.length === 0) return false;
    return selectableIndices.every((idx) => exportSelectedIndices.has(idx));
  }, [exportSelectedIndices, selectableIndices]);

  const handleToggleSelectAll = useCallback(() => {
    if (allSelected) {
      setExportSelectedIndices(new Set());
      return;
    }
    setExportSelectedIndices(new Set(selectableIndices));
  }, [allSelected, selectableIndices]);

  useEffect(() => {
    if (!isExportModalOpen) return;
    setExportSelectedIndices(new Set(selectableIndices));
  }, [isExportModalOpen, selectableIndices]);

  const triggerSingleDownload = useCallback((url: string, index: number) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${String(index + 1).padStart(2, '0')}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const pollTaskForCard = useCallback(
    (taskId: string, index: number, onFinish?: (status: 'completed' | 'failed') => void) => {
      if (!projectId) return Promise.resolve('failed' as const);
      return new Promise<'completed' | 'failed'>((resolve) => {
        const poll = async () => {
          try {
            const response = await getTaskStatus(projectId, taskId);
            const task = response.data;
            if (task?.status === 'COMPLETED') {
              setRegeneratingIndex((prev) => ({ ...prev, [index]: false }));
              setRegeneratingStartedAt((prev) => {
                const next = { ...prev };
                delete next[index];
                return next;
              });
              await syncProject(projectId);
              await loadMaterials();
              show({ message: `第 ${index + 1} 张已生成`, type: 'success' });
              onFinish?.('completed');
              resolve('completed');
              return;
            }
            if (task?.status === 'FAILED') {
              setRegeneratingIndex((prev) => ({ ...prev, [index]: false }));
              setRegeneratingStartedAt((prev) => {
                const next = { ...prev };
                delete next[index];
                return next;
              });
              show({ message: task.error_message || task.error || '生成失败', type: 'error' });
              onFinish?.('failed');
              resolve('failed');
              return;
            }
            setTimeout(poll, 2000);
          } catch (error: any) {
            setRegeneratingIndex((prev) => ({ ...prev, [index]: false }));
            setRegeneratingStartedAt((prev) => {
              const next = { ...prev };
              delete next[index];
              return next;
            });
            show({ message: error.message || '任务查询失败', type: 'error' });
            onFinish?.('failed');
            resolve('failed');
          }
        };
        poll();
      });
    },
    [projectId, loadMaterials, show, syncProject]
  );

  const handleConfirmExport = useCallback(async () => {
    if (!projectId || isExporting) return;
    const indices = Array.from(exportSelectedIndices).sort((a, b) => a - b);
    if (indices.length === 0) {
      show({ message: '请先选择要导出的图片', type: 'info' });
      return;
    }
    if (exportMode === 'zip') {
      setIsExporting(true);
      try {
        const response = await exportXhsZip(projectId, indices);
        const downloadUrl = response.data?.download_url || response.data?.download_url_absolute;
        if (!downloadUrl) throw new Error('导出链接获取失败');
        window.open(downloadUrl, '_blank');
        show({ message: '已开始下载 ZIP', type: 'success' });
        setIsExportModalOpen(false);
      } catch (error: any) {
        show({ message: error.message || '导出失败', type: 'error' });
      } finally {
        setIsExporting(false);
      }
      return;
    }
    const cardsByIndex = new Map(xhsDisplayCards.map((c) => [c.index, c]));
    show({ message: '正在准备逐张下载（推荐 ZIP，若失败请尝试 ZIP 导出）', type: 'info' });
    indices.forEach((idx, i) => {
      const url = cardsByIndex.get(idx)?.imageUrl;
      if (!url) return;
      window.setTimeout(() => triggerSingleDownload(url, idx), i * 600);
    });
    setIsExportModalOpen(false);
  }, [exportMode, exportSelectedIndices, isExporting, projectId, show, xhsDisplayCards, triggerSingleDownload]);

  const useTemplateOption = useMemo(() => {
    if (templateUsageMode === 'template') return true;
    if (templateUsageMode === 'style') return false;
    return undefined;
  }, [templateUsageMode]);

  const handleSaveExtraRequirements = useCallback(async () => {
    if (!projectId) return;
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
  }, [projectId, extraRequirements, syncProject, show]);

  const handleSaveTemplateStyle = useCallback(async () => {
    if (!projectId) return;
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
  }, [projectId, templateStyle, syncProject, show]);

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
      if (!file) return;
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
    confirm(
      '确定取消当前选中的模板吗？取消后将使用无模板模式生成（不会影响已生成页面）。',
      async () => {
        setIsClearingTemplate(true);
        try {
          await deleteTemplate(projectId);
          await syncProject(projectId);
          setSelectedTemplateId(null);
          setSelectedPresetTemplateId(null);
          show({ message: '已取消当前模板，可使用无模板模式生成', type: 'success' });
        } catch (error: any) {
          show({ message: `清除失败: ${error.message || '未知错误'}`, type: 'error' });
        } finally {
          setIsClearingTemplate(false);
        }
      },
      { title: '取消模板', variant: 'warning' }
    );
  }, [confirm, hasTemplateResource, projectId, show, syncProject]);

  const handleGenerate = useCallback(async () => {
    if (!projectId || isGenerating) return;
    setIsGenerating(true);
    setProgress({ total: imageCount, completed: 0, failed: 0 });
    setGenerationStartedAt(Date.now());
    const maxConcurrent = Math.min(imageCount, Math.max(1, xhsMaxConcurrent));
    const indices = Array.from({ length: imageCount }, (_, i) => i);
    let cursor = 0;
    let active = 0;
    let completed = 0;
    let failed = 0;
    const launchNext = () => {
      while (active < maxConcurrent && cursor < indices.length) {
        const index = indices[cursor++];
        active += 1;
        setRegeneratingIndex((prev) => ({ ...prev, [index]: true }));
        setRegeneratingStartedAt((prev) => ({ ...prev, [index]: Date.now() }));
        (async () => {
          try {
            const response = await generateXhsCard(projectId, {
              index,
              aspectRatio: aspectRatio === 'auto' ? undefined : aspectRatio,
              useTemplate: useTemplateOption,
              templateUsageMode,
            });
            const taskId = response.data?.task_id;
            if (!taskId) throw new Error('未获取任务ID');
            show({ message: `已开始生成第 ${index + 1} 张，请稍候…`, type: 'info' });
            await pollTaskForCard(taskId, index, (status) => {
              if (status === 'completed') completed += 1;
              else failed += 1;
              setProgress({ total: imageCount, completed, failed });
            });
          } catch (error: any) {
            setRegeneratingIndex((prev) => ({ ...prev, [index]: false }));
            setRegeneratingStartedAt((prev) => {
              const next = { ...prev };
              delete next[index];
              return next;
            });
            failed += 1;
            setProgress({ total: imageCount, completed, failed });
            show({ message: error.message || '生成失败', type: 'error' });
          } finally {
            active -= 1;
            if (cursor >= indices.length && active === 0) {
              setIsGenerating(false);
              setGenerationStartedAt(null);
              setProgress(null);
              show({ message: failed === 0 ? '小红书图文生成完成' : `生成完成（失败 ${failed} 张）`, type: failed === 0 ? 'success' : 'info' });
            } else {
              launchNext();
            }
          }
        })();
      }
    };
    launchNext();
  }, [
    projectId,
    isGenerating,
    imageCount,
    xhsMaxConcurrent,
    aspectRatio,
    useTemplateOption,
    templateUsageMode,
    show,
    pollTaskForCard,
  ]);

  const openMaterialPlanModal = useCallback(
    (index: number) => {
      const entry = materialPlanByIndex.get(index);
      const ids = (entry?.material_ids || []).filter((id) => assetMaterialIdSet.has(id));
      setMaterialPlanTargetIndex(index);
      setSelectedMaterialIds(ids);
      setLockAfterReplace(true);
      setIsMaterialPlanModalOpen(true);
    },
    [assetMaterialIdSet, materialPlanByIndex]
  );

  const toggleMaterialSelection = useCallback(
    (materialId: string) => {
      setSelectedMaterialIds((prev) => {
        if (prev.includes(materialId)) return prev.filter((id) => id !== materialId);
        if (prev.length >= 8) {
          show({ message: '最多选择 8 个素材', type: 'info' });
          return prev;
        }
        return [...prev, materialId];
      });
    },
    [show]
  );

  const handleReplaceMaterials = useCallback(async () => {
    if (!projectId || materialPlanTargetIndex === null) return;
    if (selectedMaterialIds.length === 0) {
      show({ message: '请先选择素材', type: 'info' });
      return;
    }
    setIsUpdatingMaterialPlan(true);
    try {
      await updateXhsCardMaterials(projectId, materialPlanTargetIndex, {
        material_ids: selectedMaterialIds,
        locked: lockAfterReplace,
      });
      await syncProject(projectId);
      show({ message: '素材已更新', type: 'success' });
      setIsMaterialPlanModalOpen(false);
    } catch (error: any) {
      show({ message: error.message || '更新素材失败', type: 'error' });
    } finally {
      setIsUpdatingMaterialPlan(false);
    }
  }, [projectId, materialPlanTargetIndex, selectedMaterialIds, lockAfterReplace, syncProject, show]);

  const handleClearMaterials = useCallback(
    async (index: number) => {
      if (!projectId) return;
      setIsUpdatingMaterialPlan(true);
      try {
        await updateXhsCardMaterials(projectId, index, { material_ids: [], locked: false });
        await syncProject(projectId);
        show({ message: '已清空素材', type: 'success' });
      } catch (error: any) {
        show({ message: error.message || '清空素材失败', type: 'error' });
      } finally {
        setIsUpdatingMaterialPlan(false);
      }
    },
    [projectId, syncProject, show]
  );

  const handleToggleMaterialLock = useCallback(
    async (index: number, locked: boolean) => {
      if (!projectId) return;
      const entry = materialPlanByIndex.get(index);
      const materialIds = entry?.material_ids || [];
      setIsUpdatingMaterialPlan(true);
      try {
        await updateXhsCardMaterials(projectId, index, { material_ids: materialIds, locked });
        await syncProject(projectId);
        show({ message: locked ? '已锁定素材' : '已解除锁定', type: 'success' });
      } catch (error: any) {
        show({ message: error.message || '更新锁定状态失败', type: 'error' });
      } finally {
        setIsUpdatingMaterialPlan(false);
      }
    },
    [projectId, materialPlanByIndex, syncProject, show]
  );

  const handleRegenerateCard = useCallback(
    async (index: number) => {
      if (!projectId || regeneratingIndex[index]) return;
      setRegeneratingIndex((prev) => ({ ...prev, [index]: true }));
      setRegeneratingStartedAt((prev) => ({ ...prev, [index]: Date.now() }));
      try {
        const response = await generateXhsCard(projectId, {
          index,
          aspectRatio: aspectRatio === 'auto' ? undefined : aspectRatio,
          useTemplate: useTemplateOption,
          templateUsageMode,
        });
        const taskId = response.data?.task_id;
        if (!taskId) {
          setRegeneratingIndex((prev) => ({ ...prev, [index]: false }));
          setRegeneratingStartedAt((prev) => {
            const next = { ...prev };
            delete next[index];
            return next;
          });
          show({ message: '未获取任务ID', type: 'error' });
          return;
        }
        show({ message: `已开始生成第 ${index + 1} 张，请稍候…`, type: 'info' });
        await pollTaskForCard(taskId, index);
      } catch (error: any) {
        setRegeneratingIndex((prev) => ({ ...prev, [index]: false }));
        setRegeneratingStartedAt((prev) => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
        show({ message: error.message || '生成失败', type: 'error' });
      }
    },
    [projectId, regeneratingIndex, aspectRatio, useTemplateOption, templateUsageMode, show, pollTaskForCard]
  );

  const extractImageUrlsFromDescription = useCallback((descriptionContent: any): string[] => {
    if (!descriptionContent) return [];
    let text = '';
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
      if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/files/'))) {
        matches.push(url);
      }
    }
    return matches;
  }, []);

  const handleEditCard = useCallback(
    (index: number) => {
      if (!currentProject?.pages || index < 0 || index >= currentProject.pages.length) {
        show({ message: '无法编辑该卡片', type: 'error' });
        return;
      }
      const page = currentProject.pages[index];
      const descUrls = extractImageUrlsFromDescription(page?.description_content);
      setEditIndex(index);
      setEditInstruction('');
      setEditOutlineTitle(page?.outline_content?.title || '');
      setEditOutlinePoints((page?.outline_content?.points || []).join('\n'));
      setEditDescription(
        typeof page.description_content === 'object' && page.description_content && 'text' in page.description_content
          ? (page.description_content.text as string) || ''
          : ''
      );
      setIsOutlineExpanded(false);
      setIsDescriptionExpanded(false);
      setEditDescImageUrls(descUrls);
      setSelectedDescImageUrls([]);
      setEditUploadedFiles([]);
      setEditTemplateUsageMode(templateUsageMode);
      setIsEditModalOpen(true);
    },
    [currentProject?.pages, templateUsageMode, show, extractImageUrlsFromDescription]
  );

  const handleSaveOutlineAndDescription = useCallback(async () => {
    if (!projectId || editIndex === null) return;
    const page = currentProject?.pages?.[editIndex];
    if (!page?.id) return;

    const updatedOutline = {
      title: editOutlineTitle,
      points: editOutlinePoints.split('\n').filter((p) => p.trim()),
    };
    const updatedDescription = { text: editDescription };

    try {
      updatePageLocal(page.id, {
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
    editIndex,
    currentProject?.pages,
    editOutlineTitle,
    editOutlinePoints,
    editDescription,
    updatePageLocal,
    saveAllPages,
    syncProject,
    show,
  ]);

  const handleEditSelectMaterials = useCallback(
    async (materialsToAdd: Material[]) => {
      try {
        const files = await Promise.all(materialsToAdd.map((material) => materialUrlToFile(material)));
        setEditUploadedFiles((prev) => [...prev, ...files]);
        show({ message: `已添加 ${materialsToAdd.length} 个素材`, type: 'success' });
      } catch (error: any) {
        show({ message: error.message || '加载素材失败', type: 'error' });
      }
    },
    [show]
  );

  const handleSubmitEdit = useCallback(async () => {
    if (!projectId || editIndex === null || !editInstruction.trim()) return;
    if (isSubmittingEdit) return;
    setIsSubmittingEdit(true);
    setRegeneratingIndex((prev) => ({ ...prev, [editIndex]: true }));
    setRegeneratingStartedAt((prev) => ({ ...prev, [editIndex]: Date.now() }));
    try {
      await handleSaveOutlineAndDescription();
      const response = await editXhsCardImage(projectId, {
        index: editIndex,
        editInstruction,
        aspectRatio,
        templateUsageMode: editTemplateUsageMode,
        descImageUrls: selectedDescImageUrls,
        uploadedFiles: editUploadedFiles,
      });
      const taskId = response.data?.task_id;
      if (!taskId) {
        setRegeneratingIndex((prev) => ({ ...prev, [editIndex]: false }));
        setRegeneratingStartedAt((prev) => {
          const next = { ...prev };
          delete next[editIndex];
          return next;
        });
        show({ message: '未获取任务ID', type: 'error' });
        return;
      }
      setIsEditModalOpen(false);
      show({ message: `已开始编辑第 ${editIndex + 1} 张，请稍候…`, type: 'info' });
      await pollTaskForCard(taskId, editIndex);
    } catch (error: any) {
      setRegeneratingIndex((prev) => ({ ...prev, [editIndex]: false }));
      setRegeneratingStartedAt((prev) => {
        const next = { ...prev };
        delete next[editIndex];
        return next;
      });
      show({ message: error.message || '编辑失败', type: 'error' });
    } finally {
      setIsSubmittingEdit(false);
    }
  }, [
    projectId,
    editIndex,
    editInstruction,
    editTemplateUsageMode,
    selectedDescImageUrls,
    editUploadedFiles,
    aspectRatio,
    isSubmittingEdit,
    show,
    pollTaskForCard,
    handleSaveOutlineAndDescription,
  ]);

  const loadXhsCardVersions = useCallback(
    async (index: number) => {
      if (!projectId) return;
      setIsLoadingVersions(true);
      try {
        const page = currentProject?.pages?.[index];
        if (page?.id && page.generated_image_url) {
          const response = await getPageImageVersions(projectId, page.id);
          const versions = (response.data?.versions || []).map((v: any) => ({ ...v, source: 'page' as const }));
          setVersionList(versions);
        } else {
          const response = await getXhsCardImageVersions(projectId, index);
          const versions = (response.data?.versions || []).map((v: XhsCardImageVersion) => ({ ...v, source: 'xhs' as const }));
          setVersionList(versions);
        }
        setVersionTargetIndex(index);
        setIsVersionModalOpen(true);
      } catch (error: any) {
        show({ message: error.message || '加载版本失败', type: 'error' });
      } finally {
        setIsLoadingVersions(false);
      }
    },
    [projectId, currentProject?.pages, show]
  );

  const handleSwitchVersion = useCallback(
    async (version: XhsVersionItem, index: number) => {
      if (!projectId || isSwitchingVersion) return;
      setIsSwitchingVersion(true);
      try {
        if (version.source === 'page') {
          const page = currentProject?.pages?.[index];
          if (!page?.id) throw new Error('未找到页面ID');
          await setCurrentImageVersion(projectId, page.id, version.version_id);
        } else {
          await setXhsCardCurrentImageVersion(projectId, index, version.version_id);
        }
        await syncProject(projectId);
        await loadMaterials();
        await loadXhsCardVersions(index);
        show({ message: '已切换到该版本', type: 'success' });
      } catch (error: any) {
        show({ message: error.message || '切换失败', type: 'error' });
      } finally {
        setIsSwitchingVersion(false);
      }
    },
    [projectId, isSwitchingVersion, currentProject?.pages, syncProject, loadMaterials, loadXhsCardVersions, show]
  );

  const handleRegenerateAll = useCallback(() => {
    confirm('将重新生成全部图片（已生成的图片会保留历史版本），确定继续吗？', handleGenerate, {
      title: '确认重新生成',
      variant: 'warning',
    });
  }, [confirm, handleGenerate]);

  const aspectRatioClass = useMemo(() => {
    const effectiveRatio = aspectRatio === 'auto' ? '3:4' : aspectRatio;
    switch (effectiveRatio) {
      case '3:4':
        return 'aspect-[3/4]';
      default:
        return 'aspect-[4/5]';
    }
  }, [aspectRatio]);

  const isRegeneratingAny = useMemo(() => Object.values(regeneratingIndex).some(Boolean), [regeneratingIndex]);

  useEffect(() => {
    if (!isGenerating && !isRegeneratingAny) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isGenerating, isRegeneratingAny]);

  const formatElapsed = useCallback(
    (start?: number | null) => {
      if (!start) return '';
      const seconds = Math.max(0, Math.floor((now - start) / 1000));
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    },
    [now]
  );

  const editCard = useMemo(() => {
    if (editIndex === null) return null;
    return xhsDisplayCards.find((c) => c.index === editIndex) || null;
  }, [editIndex, xhsDisplayCards]);
  const editImageUrl = editCard?.imageUrl ?? null;

  const handleSyncDescMaterials = useCallback(
    async (index: number, materialIds: string[]) => {
      if (!projectId) return;
      try {
        setIsUpdatingMaterialPlan(true);
        await updateXhsCardMaterials(projectId, index, { material_ids: materialIds, locked: false });
        await syncProject(projectId);
        show({ message: '已同步为素材编排', type: 'success' });
      } catch (e: any) {
        show({ message: e?.message || '同步失败', type: 'error' });
      } finally {
        setIsUpdatingMaterialPlan(false);
      }
    },
    [projectId, syncProject, show]
  );

  return {
    // router & global
    navigate,
    projectId,
    currentProject,
    syncProject,
    show,
    ToastContainer,
    confirm,
    ConfirmDialog,

    // aspect & count
    aspectRatio,
    setAspectRatio,
    imageCount,
    aspectRatioClass,

    // materials & loading
    materials,
    isLoading,
    loadMaterials,
    xhsMaterials,
    assetMaterials,
    assetMaterialIdSet,
    assetMaterialIdByUrl,
    materialById,
    materialPlanByIndex,
    xhsMaterialByIndex,
    xhsDisplayCards,
    xhsPayload,
    hasTemplateResource,

    // generation
    isGenerating,
    progress,
    generationStartedAt,
    now,
    regeneratingIndex,
    regeneratingStartedAt,
    handleGenerate,
    handleRegenerateAll,
    handleRegenerateCard,
    pollTaskForCard,
    useTemplateOption,
    templateUsageMode,
    setTemplateUsageMode,
    formatElapsed,

    // copywriting
    copywritingText,
    handleCopy,

    // preview
    previewImageUrl,
    setPreviewImageUrl,
    previewTitle,
    setPreviewTitle,

    // template
    userTemplates,
    selectedTemplateId,
    setSelectedTemplateId,
    selectedPresetTemplateId,
    setSelectedPresetTemplateId,
    handleTemplateSelect,
    handleClearTemplate,
    isUploadingTemplate,
    isClearingTemplate,

    // project settings
    extraRequirements,
    setExtraRequirements,
    templateStyle,
    setTemplateStyle,
    isSavingRequirements,
    isSavingTemplateStyle,
    handleSaveExtraRequirements,
    handleSaveTemplateStyle,
    isProjectSettingsOpen,
    setIsProjectSettingsOpen,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    isMaterialModalOpen,
    setIsMaterialModalOpen,

    // material plan modal
    isMaterialPlanModalOpen,
    setIsMaterialPlanModalOpen,
    materialPlanTargetIndex,
    selectedMaterialIds,
    setSelectedMaterialIds,
    lockAfterReplace,
    setLockAfterReplace,
    isUpdatingMaterialPlan,
    openMaterialPlanModal,
    toggleMaterialSelection,
    handleReplaceMaterials,
    handleClearMaterials,
    handleToggleMaterialLock,
    handleSyncDescMaterials,

    // edit modal
    isEditModalOpen,
    setIsEditModalOpen,
    editIndex,
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
    editTemplateUsageMode,
    setEditTemplateUsageMode,
    editImageUrl,
    isEditMaterialSelectorOpen,
    setIsEditMaterialSelectorOpen,
    isSubmittingEdit,
    handleEditCard,
    handleEditSelectMaterials,
    handleSaveOutlineAndDescription,
    handleSubmitEdit,
    extractImageUrlsFromDescription,
    isEditingRequirements,
    isEditingTemplateStyle,

    // version modal
    isVersionModalOpen,
    setIsVersionModalOpen,
    versionTargetIndex,
    versionList,
    isLoadingVersions,
    isSwitchingVersion,
    loadXhsCardVersions,
    handleSwitchVersion,

    // export
    isExportModalOpen,
    setIsExportModalOpen,
    exportMode,
    setExportMode,
    exportSelectedIndices,
    setExportSelectedIndices,
    isExporting,
    openExportModal,
    toggleExportIndex,
    selectableIndices,
    allSelected,
    handleToggleSelectAll,
    handleConfirmExport,
    triggerSingleDownload,
    xhsMaxConcurrent,
  };
}
