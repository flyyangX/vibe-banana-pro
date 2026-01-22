import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Download, Sparkles, Settings, Upload, ImagePlus, Palette, X } from 'lucide-react';
import { Button, Loading, MaterialGeneratorModal, ProjectSettingsModal, useToast } from '@/components/shared';
import { listMaterials, generateInfographic, getTaskStatus, updateProject, getSettings, listUserTemplates, uploadTemplate, deleteTemplate } from '@/api/endpoints';
import type { Material, UserTemplate } from '@/api/endpoints';
import type { ExportExtractorMethod, ExportInpaintMethod } from '@/types';
import { getImageUrl } from '@/api/client';
import { useProjectStore } from '@/store/useProjectStore';
import { TemplateSelector, getTemplateFile } from '@/components/shared/TemplateSelector';

type InfographicMode = 'single' | 'series';

type MaterialWithNote = Material & {
  noteData?: {
    type?: string;
    mode?: string;
    page_id?: string | null;
    order_index?: number;
  };
};

export const InfographicPreview: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, syncProject } = useProjectStore();
  const { show, ToastContainer } = useToast();

  const [mode, setMode] = useState<InfographicMode>(
    (location.state as any)?.mode === 'series' ? 'series' : 'single'
  );

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

  // 若未通过路由 state 指定 mode，则从 product_payload 恢复默认值
  useEffect(() => {
    const stateMode = (location.state as any)?.mode;
    if (stateMode === 'single' || stateMode === 'series') return;
    if (payloadMode) setMode(payloadMode);
  }, [payloadMode, location.state]);
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

  const parseNote = (note?: string | null) => {
    if (!note) return undefined;
    try {
      return JSON.parse(note);
    } catch {
      return undefined;
    }
  };

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
      return list.sort((a, b) => (a.noteData?.order_index ?? 0) - (b.noteData?.order_index ?? 0));
    }
    return list.sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
  }, [materials, mode]);

  const latestSingle = filteredMaterials[0];

  const hasTemplateResource = useMemo(() => {
    const variants = currentProject?.template_variants || {};
    const hasVariants = Object.values(variants).some(Boolean);
    return Boolean(currentProject?.template_image_path) || hasVariants;
  }, [currentProject?.template_image_path, currentProject?.template_variants]);

  const pollTask = useCallback(async (taskId: string) => {
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
  }, [projectId, loadMaterials, show]);

  const handleGenerate = async () => {
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
  };

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
  };

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
            onClick={() => navigate('/')}
            className="flex-shrink-0"
          >
            返回
          </Button>
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
            <span className="text-xl md:text-2xl">📊</span>
            <span className="text-base md:text-xl font-bold truncate">信息图</span>
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
            icon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />}
            onClick={loadMaterials}
            disabled={isLoading}
          >
            刷新
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Upload size={16} />}
            onClick={() => setIsTemplateModalOpen(true)}
          >
            更换模板
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<ImagePlus size={16} />}
            onClick={() => setIsMaterialModalOpen(true)}
          >
            素材生成
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Palette size={16} />}
            onClick={() => projectId && navigate(`/project/${projectId}/materials`)}
          >
            素材库
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Settings size={16} />}
            onClick={() => setIsProjectSettingsOpen(true)}
          >
            项目设置
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles size={16} />}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? '生成中...' : '生成信息图'}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">模式：</span>
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`px-3 py-1 rounded-full border text-xs ${
                mode === 'single'
                  ? 'border-banana-500 text-banana-700 bg-banana-50'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              单张
            </button>
            <button
              type="button"
              onClick={() => setMode('series')}
              className={`px-3 py-1 rounded-full border text-xs ${
                mode === 'series'
                  ? 'border-banana-500 text-banana-700 bg-banana-50'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              多张
            </button>
            {progress?.total ? (
              <span className="text-xs text-gray-500">
                进度 {progress.completed || 0}/{progress.total}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">比例：</span>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded text-xs"
              >
                <option value="1:1">1:1</option>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="4:3">4:3</option>
                <option value="3:4">3:4</option>
                <option value="3:2">3:2</option>
                <option value="2:3">2:3</option>
                <option value="5:4">5:4</option>
                <option value="4:5">4:5</option>
                <option value="21:9">21:9</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">分辨率：</span>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded text-xs"
              >
                <option value="1K">1K</option>
                <option value="2K">2K</option>
                <option value="4K">4K</option>
              </select>
            </div>
            <span className="text-gray-400">支持 nano banana pro 的比例与尺寸</span>
          </div>

          {isLoading ? (
            <div className="py-12">
              <Loading message="加载中..." />
            </div>
          ) : mode === 'single' ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              {latestSingle?.url ? (
                <div className="space-y-3">
                  <img
                    src={getImageUrl(latestSingle.url)}
                    alt="Infographic"
                    className="w-full max-h-[70vh] object-contain rounded"
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Download size={16} />}
                      onClick={() => window.open(getImageUrl(latestSingle.url), '_blank')}
                    >
                      下载 PNG
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  暂无信息图，请点击“生成信息图”
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMaterials.length > 0 ? (
                filteredMaterials.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
                    <img
                      src={getImageUrl(item.url)}
                      alt="Infographic"
                      className="w-full h-64 object-contain rounded"
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Download size={14} />}
                        onClick={() => window.open(getImageUrl(item.url), '_blank')}
                      >
                        下载
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500 col-span-full">
                  暂无信息图，请点击“生成信息图”
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <ToastContainer />
      {projectId && (
        <>
          <MaterialGeneratorModal
            projectId={projectId}
            isOpen={isMaterialModalOpen}
            onClose={() => setIsMaterialModalOpen(false)}
          />
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
            exportExtractorMethod={exportExtractorMethod}
            exportInpaintMethod={exportInpaintMethod}
            onExportExtractorMethodChange={setExportExtractorMethod}
            onExportInpaintMethodChange={setExportInpaintMethod}
            onSaveExportSettings={handleSaveExportSettings}
            isSavingExportSettings={isSavingExportSettings}
          />
          {/* 模板选择 Modal */}
          <div>
            {isTemplateModalOpen && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[80vh] flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold">更换模板</h2>
                    <button
                      onClick={() => setIsTemplateModalOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="关闭"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <TemplateSelector
                      onSelect={handleTemplateSelect}
                      selectedTemplateId={selectedTemplateId}
                      selectedPresetTemplateId={selectedPresetTemplateId}
                      showUpload={false}
                      projectId={projectId || null}
                      templateVariants={currentProject?.template_variants}
                      templateVariantsHistory={currentProject?.template_variants_history}
                      onTemplatesGenerated={async () => {
                        if (projectId) {
                          await syncProject(projectId);
                        }
                      }}
                    />
                  </div>
                  <div className="shrink-0 px-6 py-4 border-t flex justify-end gap-3">
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
            )}
          </div>
        </>
      )}
    </div>
  );
};
