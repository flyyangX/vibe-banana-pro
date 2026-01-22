import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Download, RefreshCw, Sparkles, Maximize2, RotateCcw, Upload, ImagePlus, Settings, Edit2 } from 'lucide-react';
import { Button, Loading, Modal, Textarea, useToast, useConfirm, MaterialSelector, ProjectSettingsModal, Skeleton } from '@/components/shared';
import { MaterialGeneratorModal } from '@/components/shared/MaterialGeneratorModal';
import { TemplateSelector, getTemplateFile } from '@/components/shared/TemplateSelector';
import { deleteTemplate, editXhsCardImage, generateXhsCard, getTaskStatus, getXhsCardImageVersions, listMaterials, listUserTemplates, setXhsCardCurrentImageVersion, updateProject, uploadTemplate, getPageImageVersions, setCurrentImageVersion } from '@/api/endpoints';
import type { Material, UserTemplate, XhsCardImageVersion } from '@/api/endpoints';
import { getImageUrl } from '@/api/client';
import { useProjectStore } from '@/store/useProjectStore';
import { materialUrlToFile } from '@/components/shared/MaterialSelector';

type XhsAspectRatio = '4:5' | '3:4' | '9:16';

type MaterialWithNote = Material & {
  noteData?: {
    type?: string;
    mode?: string;
    index?: number;
    role?: string;
    aspect_ratio?: string;
  };
};

type XhsVersionItem = {
  source: 'page' | 'xhs';
  version_id: string;
  version_number: number;
  is_current: boolean;
  created_at?: string;
  image_url?: string;
  material_url?: string;
  material_created_at?: string;
  index?: number;
};

type XhsPayload = {
  product_type?: string;
  mode?: string;
  aspect_ratio?: string;
  image_count?: number;
  copywriting?: {
    title?: string;
    body?: string;
    hashtags?: string[];
  };
  materials?: Array<{
    index?: number;
    material_id?: string;
    url?: string;
    display_name?: string;
    role?: string;
  }>;
};

export const XhsPreview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, syncProject } = useProjectStore();
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const [aspectRatio, setAspectRatio] = useState<XhsAspectRatio>(() => {
    const ratio = (location.state as any)?.aspectRatio;
    if (ratio === '3:4' || ratio === '9:16') return ratio;
    return '4:5';
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
  const [editDescImageUrls, setEditDescImageUrls] = useState<string[]>([]);
  const [selectedDescImageUrls, setSelectedDescImageUrls] = useState<string[]>([]);
  const [editRefImageUrls, setEditRefImageUrls] = useState<string[]>([]);
  const [editUploadedFiles, setEditUploadedFiles] = useState<File[]>([]);
  const [isEditMaterialSelectorOpen, setIsEditMaterialSelectorOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isRegionSelectionMode, setIsRegionSelectionMode] = useState(false);
  const [isSelectingRegion, setIsSelectingRegion] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionTargetIndex, setVersionTargetIndex] = useState<number | null>(null);
  const [versionList, setVersionList] = useState<XhsVersionItem[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isSwitchingVersion, setIsSwitchingVersion] = useState(false);

  const parseNote = (note?: string | null) => {
    if (!note) return undefined;
    try {
      return JSON.parse(note);
    } catch {
      return undefined;
    }
  };

  const parsePayload = (raw?: string | null): XhsPayload | null => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const xhsPayload = useMemo(() => parsePayload(currentProject?.product_payload || null), [currentProject?.product_payload]);

  // 若未通过路由 state 指定比例，则从 product_payload 恢复默认值
  useEffect(() => {
    const stateRatio = (location.state as any)?.aspectRatio;
    if (stateRatio === '4:5' || stateRatio === '3:4' || stateRatio === '9:16') return;
    const ratio = (xhsPayload?.aspect_ratio || '').trim();
    if (ratio === '4:5' || ratio === '3:4' || ratio === '9:16') {
      setAspectRatio(ratio);
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
  }, [
    currentProject?.id,
    currentProject?.extra_requirements,
    currentProject?.template_style,
  ]);

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

  const xhsMaterialByIndex = useMemo(() => {
    const map = new Map<number, MaterialWithNote>();
    xhsMaterials.forEach((m) => {
      const idx = Number(m.noteData?.index) || 0;
      if (!map.has(idx)) map.set(idx, m);
    });
    return map;
  }, [xhsMaterials]);

  const xhsDisplayCards = useMemo(() => {
    const pages = currentProject?.pages || [];
    const result: Array<{
      index: number;
      label: string;
      imageUrl: string | null;
      source: 'page' | 'material' | 'none';
      pageId?: string;
      material?: MaterialWithNote;
    }> = [];
    for (let i = 0; i < imageCount; i += 1) {
      const label = i === 0 ? '封面' : `第 ${i + 1} 张`;
      const page = pages[i];
      const pageImageUrl = page?.generated_image_url
        ? getImageUrl(page.generated_image_url, page.updated_at)
        : null;
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

  const handleCopy = async () => {
    if (!copywritingText) {
      show({ message: '暂无文案可复制', type: 'info' });
      return;
    }
    try {
      await navigator.clipboard.writeText(copywritingText);
      show({ message: '已复制文案', type: 'success' });
    } catch (e) {
      // Fallback
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
  };

  const pollTaskForCard = useCallback((taskId: string, index: number, onFinish?: (status: 'completed' | 'failed') => void) => {
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
  }, [projectId, loadMaterials, show, syncProject]);

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

  const handleTemplateSelect = async (templateFile: File | null, templateId?: string) => {
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
  };

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

  const handleGenerate = async () => {
    if (!projectId || isGenerating) return;
    setIsGenerating(true);
    setProgress({ total: imageCount, completed: 0, failed: 0 });
    setGenerationStartedAt(Date.now());
    const maxConcurrent = 3;
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
              aspectRatio,
              useTemplate: useTemplateOption,
              templateUsageMode,
            });
            const taskId = response.data?.task_id;
            if (!taskId) {
              throw new Error('未获取任务ID');
            }
            show({ message: `已开始生成第 ${index + 1} 张，请稍候…`, type: 'info' });
            await pollTaskForCard(taskId, index, (status) => {
              if (status === 'completed') {
                completed += 1;
              } else {
                failed += 1;
              }
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
              if (failed === 0) {
                show({ message: '小红书图文生成完成', type: 'success' });
              } else {
                show({ message: `生成完成（失败 ${failed} 张）`, type: 'info' });
              }
            } else {
              launchNext();
            }
          }
        })();
      }
    };

    launchNext();
  };

  const handleRegenerateCard = async (index: number) => {
    if (!projectId || regeneratingIndex[index]) return;
    setRegeneratingIndex((prev) => ({ ...prev, [index]: true }));
    setRegeneratingStartedAt((prev) => ({ ...prev, [index]: Date.now() }));
    try {
      const response = await generateXhsCard(projectId, {
        index,
        aspectRatio,
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
  };

  const handleEditCard = (index: number) => {
    if (!currentProject?.pages || index < 0 || index >= currentProject.pages.length) {
      show({ message: '无法编辑该卡片', type: 'error' });
      return;
    }
    const page = currentProject.pages[index];
    const descUrls = extractImageUrlsFromDescription(page?.description_content);
    setEditIndex(index);
    setEditInstruction('');
    setEditDescImageUrls(descUrls);
    setSelectedDescImageUrls([]);
    setEditRefImageUrls([]);
    setEditUploadedFiles([]);
    setEditTemplateUsageMode(templateUsageMode);
    setIsRegionSelectionMode(false);
    setSelectionStart(null);
    setSelectionRect(null);
    setIsSelectingRegion(false);
    setIsEditModalOpen(true);
  };

  const handleEditAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setEditUploadedFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const removeEditFile = (index: number) => {
    setEditUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeEditUrl = (index: number) => {
    setEditRefImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditSelectMaterials = async (materials: Material[]) => {
    try {
      const files = await Promise.all(materials.map((material) => materialUrlToFile(material)));
      setEditUploadedFiles((prev) => [...prev, ...files]);
      show({ message: `已添加 ${materials.length} 个素材`, type: 'success' });
    } catch (error: any) {
      show({ message: error.message || '加载素材失败', type: 'error' });
    }
  };

  const handleSelectionMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRegionSelectionMode || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    setIsSelectingRegion(true);
    setSelectionStart({ x, y });
    setSelectionRect(null);
  };

  const handleSelectionMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRegionSelectionMode || !isSelectingRegion || !selectionStart || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const clampedX = Math.max(0, Math.min(x, rect.width));
    const clampedY = Math.max(0, Math.min(y, rect.height));
    const left = Math.min(selectionStart.x, clampedX);
    const top = Math.min(selectionStart.y, clampedY);
    const width = Math.abs(clampedX - selectionStart.x);
    const height = Math.abs(clampedY - selectionStart.y);
    setSelectionRect({ left, top, width, height });
  };

  const handleSelectionMouseUp = async () => {
    if (!isRegionSelectionMode || !isSelectingRegion || !selectionRect || !imageRef.current) {
      setIsSelectingRegion(false);
      setSelectionStart(null);
      return;
    }
    setIsSelectingRegion(false);
    setSelectionStart(null);
    try {
      const img = imageRef.current;
      const { left, top, width, height } = selectionRect;
      if (width < 10 || height < 10) {
        return;
      }
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      const displayWidth = img.clientWidth;
      const displayHeight = img.clientHeight;
      if (!naturalWidth || !naturalHeight || !displayWidth || !displayHeight) return;
      const scaleX = naturalWidth / displayWidth;
      const scaleY = naturalHeight / displayHeight;
      const sx = left * scaleX;
      const sy = top * scaleY;
      const sWidth = width * scaleX;
      const sHeight = height * scaleY;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sWidth));
      canvas.height = Math.max(1, Math.round(sHeight));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], `crop-${Date.now()}.png`, { type: 'image/png' });
        setEditUploadedFiles((prev) => [...prev, file]);
        show({ message: '已将选中区域添加为参考图片', type: 'success' });
      }, 'image/png');
    } catch (error) {
      show({ message: '裁剪失败，请手动上传参考图', type: 'error' });
    }
  };

  const handleSubmitEdit = async () => {
    if (!projectId || editIndex === null || !editInstruction.trim()) return;
    if (isSubmittingEdit) return;
    setIsSubmittingEdit(true);
    try {
      const mergedUrls = [...selectedDescImageUrls, ...editRefImageUrls];
      const response = await editXhsCardImage(projectId, {
        index: editIndex,
        editInstruction,
        aspectRatio,
        templateUsageMode: editTemplateUsageMode,
        descImageUrls: mergedUrls,
        uploadedFiles: editUploadedFiles,
      });
      const taskId = response.data?.task_id;
      if (!taskId) {
        show({ message: '未获取任务ID', type: 'error' });
        return;
      }
      setIsEditModalOpen(false);
      show({ message: `已开始编辑第 ${editIndex + 1} 张，请稍候…`, type: 'info' });
      await pollTaskForCard(taskId, editIndex);
    } catch (error: any) {
      show({ message: error.message || '编辑失败', type: 'error' });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const loadXhsCardVersions = async (index: number) => {
    if (!projectId) return;
    setIsLoadingVersions(true);
    try {
      const page = currentProject?.pages?.[index];
      if (page?.id && page.generated_image_url) {
        const response = await getPageImageVersions(projectId, page.id);
        const versions = (response.data?.versions || []).map((v: any) => ({
          ...v,
          source: 'page' as const,
        }));
        setVersionList(versions);
      } else {
        const response = await getXhsCardImageVersions(projectId, index);
        const versions = (response.data?.versions || []).map((v: XhsCardImageVersion) => ({
          ...v,
          source: 'xhs' as const,
        }));
        setVersionList(versions);
      }
      setVersionTargetIndex(index);
      setIsVersionModalOpen(true);
    } catch (error: any) {
      show({ message: error.message || '加载版本失败', type: 'error' });
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleSwitchVersion = async (version: XhsVersionItem, index: number) => {
    if (!projectId || isSwitchingVersion) return;
    setIsSwitchingVersion(true);
    try {
      if (version.source === 'page') {
        const page = currentProject?.pages?.[index];
        if (!page?.id) {
          throw new Error('未找到页面ID');
        }
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
  };

  const handleRegenerateAll = async () => {
    confirm(
      '将重新生成全部图片（已生成的图片会保留历史版本），确定继续吗？',
      handleGenerate,
      { title: '确认重新生成', variant: 'warning' }
    );
  };

  const aspectRatioClass = useMemo(() => {
    switch (aspectRatio) {
      case '3:4':
        return 'aspect-[3/4]';
      case '9:16':
        return 'aspect-[9/16]';
      case '4:5':
      default:
        return 'aspect-[4/5]';
    }
  }, [aspectRatio]);

  const isRegeneratingAny = useMemo(
    () => Object.values(regeneratingIndex).some(Boolean),
    [regeneratingIndex]
  );

  useEffect(() => {
    if (!isGenerating && !isRegeneratingAny) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isGenerating, isRegeneratingAny]);

  const formatElapsed = useCallback((start?: number | null) => {
    if (!start) return '';
    const seconds = Math.max(0, Math.floor((now - start) / 1000));
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [now]);

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

  const totalCount = progress?.total || imageCount;
  const completedCount = progress?.completed || 0;
  const failedCount = progress?.failed || 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const editCard = useMemo(() => {
    if (editIndex === null) return null;
    return xhsDisplayCards.find((c) => c.index === editIndex) || null;
  }, [editIndex, xhsDisplayCards]);

  const editImageUrl = useMemo(() => {
    return editCard?.imageUrl || null;
  }, [editCard]);

  if (!projectId) {
    return <Loading fullscreen message="缺少项目ID" />;
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="h-14 md:h-16 bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-3 md:px-6 flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={() => navigate(`/project/${projectId}/detail`)}
            className="flex-shrink-0"
          >
            上一步
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl md:text-2xl">📌</span>
            <span className="text-base md:text-xl font-bold truncate">小红书图文</span>
          </div>
          <span className="text-gray-400 hidden md:inline">|</span>
          <span className="text-sm md:text-lg font-semibold truncate hidden sm:inline">
            {currentProject?.idea_prompt || '项目'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            icon={<Settings size={16} />}
            onClick={() => setIsProjectSettingsOpen(true)}
            className="hidden md:inline-flex"
          >
            项目设置
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Upload size={16} />}
            onClick={() => setIsTemplateModalOpen(true)}
            className="hidden md:inline-flex"
          >
            更换模板
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<ImagePlus size={16} />}
            onClick={() => setIsMaterialModalOpen(true)}
            className="hidden md:inline-flex"
          >
            素材生成
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />}
            onClick={async () => {
              await syncProject(projectId);
              await loadMaterials();
            }}
            disabled={isLoading}
          >
            刷新
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<RotateCcw size={16} />}
            onClick={handleRegenerateAll}
            disabled={isGenerating}
          >
            重新生成
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles size={16} />}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? '生成中...' : '生成图文'}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* 参数 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="font-medium">竖图比例：</span>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as XhsAspectRatio)}
                  className="px-2 py-1 border border-gray-200 rounded text-xs"
                >
                  <option value="4:5">4:5</option>
                  <option value="3:4">3:4</option>
                  <option value="9:16">9:16</option>
                </select>
              </div>
              <div className="text-xs text-gray-500">
                张数：{imageCount}（由编辑页页面数决定）
              </div>
              {progress?.total ? (
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span>进度 {completedCount}/{totalCount} {failedCount ? `(失败 ${failedCount})` : ''}</span>
                  {isGenerating && generationStartedAt ? (
                    <span className="text-gray-400">已运行 {formatElapsed(generationStartedAt)}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
            {progress?.total ? (
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-banana-500 transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            ) : null}
          </div>

          {/* 文案 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">文案</div>
              <Button
                variant="ghost"
                size="sm"
                icon={<Copy size={16} />}
                onClick={handleCopy}
              >
                复制
              </Button>
            </div>
            {copywritingText ? (
              <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">
                {copywritingText}
              </pre>
            ) : (
              <div className="text-sm text-gray-500">尚未生成文案，点击右上角“生成图文”。</div>
            )}
          </div>

          {/* 图片 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-800 mb-3">图片（竖版轮播）</div>
            {isLoading ? (
              <div className="py-10">
                <Loading message="加载中..." />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {xhsDisplayCards.map((card) => {
                  const idx = card.index;
                  const label = card.label;
                  const imageUrl = card.imageUrl;
                  const isCardGenerating = Boolean(regeneratingIndex[idx]);
                  const cardElapsedStart = regeneratingStartedAt[idx] || null;
                  return (
                    <div key={`xhs-card-${idx}`} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className={`relative ${aspectRatioClass} bg-gray-50`}>
                        {isCardGenerating ? (
                          <Skeleton className="w-full h-full" />
                        ) : imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={label}
                            className="w-full h-full object-cover"
                            onClick={() => {
                              setPreviewImageUrl(imageUrl);
                              setPreviewTitle(label);
                            }}
                            role="button"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                            暂无图片
                          </div>
                        )}
                        <div className="absolute top-2 left-2 text-xs px-2 py-1 rounded bg-white/80 border border-gray-200">
                          {label}
                        </div>
                        {isCardGenerating && cardElapsedStart && (
                          <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded bg-black/60 text-white">
                            ⏱ {formatElapsed(cardElapsedStart)}
                          </div>
                        )}
                        {!isCardGenerating && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!imageUrl) return;
                              setPreviewImageUrl(imageUrl);
                              setPreviewTitle(label);
                            }}
                            className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-white/80 border border-gray-200 hover:bg-white disabled:opacity-60"
                            title="放大预览"
                            disabled={!imageUrl}
                          >
                            <Maximize2 size={14} />
                          </button>
                        )}
                        <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white/80 border border-gray-200 rounded px-2 py-0.5">
                          {isCardGenerating
                            ? '生成中'
                            : imageUrl ? '已生成' : '未生成'}
                        </div>
                      </div>
                      <div className="p-2 flex items-center justify-between">
                        <div className="text-xs text-gray-600 truncate pr-2">
                          {card.source === 'page' ? '页面图片' : card.source === 'material' ? (card.material?.display_name || card.material?.filename) : '等待生成'}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditCard(idx)}
                            className="text-gray-600 hover:text-banana-600 disabled:opacity-50"
                            title="编辑"
                            disabled={isCardGenerating}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => loadXhsCardVersions(idx)}
                            className="text-gray-600 hover:text-banana-600 disabled:opacity-50"
                            title="历史版本"
                            disabled={isCardGenerating}
                          >
                            <RefreshCw size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => imageUrl && window.open(imageUrl, '_blank')}
                            className="text-gray-600 hover:text-banana-600 disabled:opacity-50"
                            title="下载/打开"
                            disabled={!imageUrl || isCardGenerating}
                          >
                            <Download size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRegenerateCard(idx)}
                            className="text-gray-600 hover:text-banana-600 disabled:opacity-50"
                            title="重新生成"
                            disabled={isCardGenerating}
                          >
                            <RotateCcw size={16} className={isCardGenerating ? 'animate-spin' : ''} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <ToastContainer />
      {ConfirmDialog}

      <Modal
        isOpen={Boolean(previewImageUrl)}
        onClose={() => setPreviewImageUrl(null)}
        title={previewTitle || '图片预览'}
        size="xl"
      >
        {previewImageUrl ? (
          <div className="space-y-4">
            <div className="max-h-[70vh] w-full flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
              <img
                src={previewImageUrl}
                alt={previewTitle || 'preview'}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={16} />}
                onClick={() => window.open(previewImageUrl, '_blank')}
              >
                下载 PNG
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editIndex !== null ? `编辑第 ${editIndex + 1} 张` : '编辑卡片'}
        size="lg"
      >
        <div className="space-y-4">
          <div
            className={`relative ${aspectRatioClass} bg-gray-100 rounded-lg overflow-hidden`}
            onMouseDown={handleSelectionMouseDown}
            onMouseMove={handleSelectionMouseMove}
            onMouseUp={handleSelectionMouseUp}
            onMouseLeave={handleSelectionMouseUp}
          >
            {editImageUrl ? (
              <>
                <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRegionSelectionMode((prev) => !prev);
                      setSelectionStart(null);
                      setSelectionRect(null);
                      setIsSelectingRegion(false);
                    }}
                    className="px-2 py-1 rounded bg-white/80 text-[10px] text-gray-700 hover:bg-banana-50 shadow-sm flex items-center gap-1"
                  >
                    <Sparkles size={12} />
                    <span>{isRegionSelectionMode ? '结束区域选图' : '区域选图'}</span>
                  </button>
                  {selectionRect && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectionRect(null);
                        setSelectionStart(null);
                        setIsSelectingRegion(false);
                      }}
                      className="px-2 py-1 rounded bg-white/80 text-[10px] text-gray-700 hover:bg-banana-50 shadow-sm"
                    >
                      清除选区
                    </button>
                  )}
                </div>
                <img
                  ref={imageRef}
                  src={editImageUrl}
                  alt="xhs-card"
                  className="w-full h-full object-contain select-none"
                  draggable={false}
                  crossOrigin="anonymous"
                />
                {selectionRect && (
                  <div
                    className="absolute border-2 border-banana-500 bg-banana-400/10 pointer-events-none"
                    style={{
                      left: selectionRect.left,
                      top: selectionRect.top,
                      width: selectionRect.width,
                      height: selectionRect.height,
                    }}
                  />
                )}
                {isRegionSelectionMode && (
                  <div className="absolute bottom-2 left-2 text-[10px] text-gray-600 bg-white/80 border border-gray-200 rounded px-2 py-1">
                    可多次拖拽选区，选中区域会加入下方“参考图”
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                暂无图片可编辑
              </div>
            )}
          </div>

          {editDescImageUrls.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-700">描述中的图片（可选）</div>
              <div className="grid grid-cols-3 gap-2">
                {editDescImageUrls.map((url, idx) => (
                  <button
                    type="button"
                    key={`${url}-${idx}`}
                    onClick={() => {
                      setSelectedDescImageUrls((prev) => {
                        if (prev.includes(url)) {
                          return prev.filter((u) => u !== url);
                        }
                        return [...prev, url];
                      });
                    }}
                    className={`relative border-2 rounded overflow-hidden ${
                      selectedDescImageUrls.includes(url) ? 'border-banana-500' : 'border-gray-200'
                    }`}
                  >
                    <img src={url} alt="desc" className="w-full h-20 object-cover" />
                    {selectedDescImageUrls.includes(url) && (
                      <div className="absolute inset-0 bg-banana-500/20 flex items-center justify-center text-xs text-white">
                        已选择
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasTemplateResource && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="xhs-use-template"
                checked={editTemplateUsageMode === 'template'}
                onChange={(e) => setEditTemplateUsageMode(e.target.checked ? 'template' : 'style')}
                className="w-4 h-4 text-banana-600 rounded focus:ring-banana-500"
              />
              <label htmlFor="xhs-use-template" className="text-sm text-gray-700 cursor-pointer">
                使用模板图片作为参考
              </label>
            </div>
          )}

          <Textarea
            label="编辑指令"
            placeholder="例如：减少装饰、增加数据图标、字体更简洁..."
            value={editInstruction}
            onChange={(e) => setEditInstruction(e.target.value)}
            rows={3}
          />

          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700">额外参考图（可选）</div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditMaterialSelectorOpen(true)}
                >
                  从素材库选择
                </Button>
                <label className="inline-flex">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleEditAddFiles}
                  />
                  <span className="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer">
                    上传图片
                  </span>
                </label>
              </div>
            </div>
            {(editRefImageUrls.length > 0 || editUploadedFiles.length > 0) ? (
              <div className="flex flex-wrap gap-2">
                {editRefImageUrls.map((u, idx) => (
                  <div key={`${u}-${idx}`} className="relative group">
                    <img src={u} alt={`ref-${idx}`} className="w-20 h-20 object-cover rounded border border-gray-300" />
                    <button
                      className="no-min-touch-target absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeEditUrl(idx)}
                      type="button"
                    >
                      <span className="text-xs">×</span>
                    </button>
                  </div>
                ))}
                {editUploadedFiles.map((f, idx) => (
                  <div key={`${f.name}-${idx}`} className="relative group">
                    <img src={URL.createObjectURL(f)} alt={`upload-${idx}`} className="w-20 h-20 object-cover rounded border border-gray-300" />
                    <button
                      className="no-min-touch-target absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeEditFile(idx)}
                      type="button"
                    >
                      <span className="text-xs">×</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">可不选，默认仅使用当前图片与模板/描述</div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={isSubmittingEdit}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitEdit}
              disabled={!editInstruction.trim() || isSubmittingEdit}
            >
              {isSubmittingEdit ? '提交中...' : '开始编辑'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        title={versionTargetIndex !== null ? `历史版本（第 ${versionTargetIndex + 1} 张）` : '历史版本'}
        size="lg"
      >
        <div className="space-y-4">
          {isLoadingVersions ? (
            <Loading message="加载版本中..." />
          ) : (
            <>
              {versionList.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {versionList.map((version) => {
                    const previewUrl =
                      version.source === 'page'
                        ? (version.image_url ? getImageUrl(version.image_url, version.created_at) : null)
                        : (version.material_url ? getImageUrl(version.material_url, version.material_created_at || version.created_at) : null);
                    return (
                    <button
                      key={version.version_id}
                      type="button"
                      onClick={() => versionTargetIndex !== null && handleSwitchVersion(version, versionTargetIndex)}
                      disabled={isSwitchingVersion}
                      className={`relative rounded border overflow-hidden ${
                        version.is_current ? 'border-banana-500 ring-2 ring-banana-200' : 'border-gray-200'
                      }`}
                    >
                      {previewUrl ? (
                        <img src={previewUrl} alt="version" className="w-full h-32 object-cover" />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                          无预览
                        </div>
                      )}
                      {version.is_current && (
                        <div className="absolute inset-0 bg-banana-500/20 flex items-center justify-center text-xs text-white">
                          当前
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[10px] px-2 py-1">
                        版本 {version.version_number}
                      </div>
                    </button>
                  );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500">暂无历史版本</div>
              )}
            </>
          )}
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setIsVersionModalOpen(false)}>
              关闭
            </Button>
          </div>
        </div>
      </Modal>

      {projectId && (
        <>
          <ProjectSettingsModal
            isOpen={isProjectSettingsOpen}
            onClose={() => setIsProjectSettingsOpen(false)}
            extraRequirements={extraRequirements}
            templateStyle={templateStyle}
            templateUsageMode={templateUsageMode}
            onExtraRequirementsChange={(value) => {
              isEditingRequirements.current = true;
              setExtraRequirements(value);
            }}
            onTemplateStyleChange={(value) => {
              isEditingTemplateStyle.current = true;
              setTemplateStyle(value);
            }}
            onTemplateUsageModeChange={setTemplateUsageMode}
            onSaveExtraRequirements={handleSaveExtraRequirements}
            onSaveTemplateStyle={handleSaveTemplateStyle}
            isSavingRequirements={isSavingRequirements}
            isSavingTemplateStyle={isSavingTemplateStyle}
          />

          <Modal
            isOpen={isTemplateModalOpen}
            onClose={() => setIsTemplateModalOpen(false)}
            title="更换模板"
            size="lg"
          >
            <div className="flex flex-col max-h-[70vh]">
              <div className="shrink-0">
                <p className="text-sm text-gray-600 mb-4">
                  选择模板将影响后续小红书卡片生成的风格与结构（不影响已生成卡片）。
                </p>
              </div>
              <div className="flex-1 overflow-y-auto pr-1">
                <TemplateSelector
                  onSelect={handleTemplateSelect}
                  selectedTemplateId={selectedTemplateId}
                  selectedPresetTemplateId={selectedPresetTemplateId}
                  showUpload={false}
                  projectId={projectId}
                  templateVariants={currentProject?.template_variants}
                  templateVariantsHistory={currentProject?.template_variants_history}
                  onTemplatesGenerated={async () => {
                    await syncProject(projectId);
                  }}
                  productContext="xhs"
                  showAllToggle
                />
              </div>
              <div className="shrink-0 pt-4 border-t">
                {(isUploadingTemplate || isClearingTemplate) && (
                  <div className="text-center pb-3 text-sm text-gray-500">
                    {isUploadingTemplate ? '正在上传模板...' : '正在取消模板...'}
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={handleClearTemplate}
                    disabled={isUploadingTemplate || isClearingTemplate || !hasTemplateResource}
                  >
                    取消当前模板
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setIsTemplateModalOpen(false)}
                    disabled={isUploadingTemplate || isClearingTemplate}
                  >
                    关闭
                  </Button>
                </div>
              </div>
            </div>
          </Modal>

          <MaterialGeneratorModal
            projectId={projectId}
            isOpen={isMaterialModalOpen}
            onClose={() => setIsMaterialModalOpen(false)}
          />

          <MaterialSelector
            projectId={projectId}
            isOpen={isEditMaterialSelectorOpen}
            onClose={() => setIsEditMaterialSelectorOpen(false)}
            multiple
            maxSelection={8}
            onSelect={(materials) => {
              handleEditSelectMaterials(materials);
            }}
          />
        </>
      )}
    </div>
  );
};

