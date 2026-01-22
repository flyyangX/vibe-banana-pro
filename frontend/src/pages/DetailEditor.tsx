import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileText, Sparkles, Download, ImagePlus } from 'lucide-react';
import { Button, Loading, useToast, useConfirm, AiRefineInput, FilePreviewModal, ProjectResourcesList, Modal, Textarea } from '@/components/shared';
import { DescriptionCard } from '@/components/preview/DescriptionCard';
import { useProjectStore } from '@/store/useProjectStore';
import type { Page } from '@/types';
import { refineDescriptions, updateProject, generateXhsBlueprint } from '@/api/endpoints';
import { exportDescriptionsToMarkdown } from '@/utils/projectUtils';

export const DetailEditor: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const fromHistory = (location.state as any)?.from === 'history';
  const {
    currentProject,
    syncProject,
    updatePageLocal,
    generateDescriptions,
    generatePageDescription,
    pageDescriptionGeneratingTasks,
    taskProgress,
  } = useProjectStore();
  const { show, ToastContainer } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [isAiRefining, setIsAiRefining] = React.useState(false);
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
  const isBatchGeneratingDescriptions = useMemo(
    () => Object.keys(pageDescriptionGeneratingTasks || {}).length > 0,
    [pageDescriptionGeneratingTasks]
  );

  const xhsPayload = useMemo(() => {
    if (!currentProject?.product_payload) return null;
    try {
      return JSON.parse(currentProject.product_payload);
    } catch {
      return null;
    }
  }, [currentProject?.product_payload]);

  // 加载项目数据
  useEffect(() => {
    if (projectId && (!currentProject || currentProject.id !== projectId)) {
      // 直接使用 projectId 同步项目数据
      syncProject(projectId);
    } else if (projectId && currentProject && currentProject.id === projectId) {
      // 如果项目已存在，也同步一次以确保数据是最新的（特别是从描述生成后）
      // 但只在首次加载时同步，避免频繁请求
      const shouldSync = !currentProject.pages.some((p: Page) => p.description_content);
      if (shouldSync) {
        syncProject(projectId);
      }
    }
  }, [projectId, currentProject?.id]); // 只在 projectId 或项目ID变化时更新

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
    const hasDescriptions = currentProject?.pages.some(
      (p: Page) => p.description_content
    );

    const executeGenerate = async () => {
      try {
        if (isXhsProject && currentProject?.id) {
          // 复用带 loading 状态的实现，避免“没反应”的误判
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

  const handleRegeneratePage = async (pageId: string) => {
    if (!currentProject) return;
    if (pageDescriptionGeneratingTasks[pageId]) {
      show({ message: '该页面正在生成中，请稍候...', type: 'info' });
      return;
    }
    
    const page = currentProject.pages.find((p: Page) => p.id === pageId);
    if (!page) return;
    
    // 如果已有描述，询问是否覆盖
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

  const handleAiRefineDescriptions = useCallback(async (requirement: string, previousRequirements: string[]) => {
    if (!currentProject || !projectId) return;
    
    try {
      const response = await refineDescriptions(projectId, requirement, previousRequirements);
      await syncProject(projectId);
      show({ 
        message: response.data?.message || '页面描述修改成功', 
        type: 'success' 
      });
    } catch (error: any) {
      console.error('修改页面描述失败:', error);
      const errorMessage = error?.response?.data?.error?.message 
        || error?.message 
        || '修改失败，请稍后重试';
      show({ message: errorMessage, type: 'error' });
      throw error; // 抛出错误让组件知道失败了
    }
  }, [currentProject, projectId, syncProject, show]);

  // 导出页面描述为 Markdown 文件
  const handleExportDescriptions = useCallback(() => {
    if (!currentProject) return;
    exportDescriptionsToMarkdown(currentProject);
    show({ message: '导出成功', type: 'success' });
  }, [currentProject, show]);

  if (!currentProject) {
    return <Loading fullscreen message="加载项目中..." />;
  }

  const hasAllDescriptions = currentProject.pages.every(
    (p: Page) => p.description_content
  );

  const isPptProject = !isXhsProject && !isInfographicProject;
  const canProceedToPreview = isPptProject ? hasAllDescriptions : currentProject.pages.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-3 md:px-6 py-2 md:py-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 md:gap-4">
          {/* 左侧：Logo 和标题 */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />}
              onClick={() => {
                if (fromHistory) {
                  navigate('/history');
                } else {
                  navigate(`/project/${projectId}/outline`);
                }
              }}
              className="flex-shrink-0"
            >
              <span className="hidden sm:inline">返回</span>
            </Button>
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-xl md:text-2xl">🍌</span>
              <span className="text-base md:text-xl font-bold">蕉幻</span>
            </div>
            <span className="text-gray-400 hidden lg:inline">|</span>
            <span className="text-sm md:text-lg font-semibold hidden lg:inline">编辑页面描述</span>
          </div>
          
          {/* 中间：AI 修改输入框 */}
          <div className="flex-1 max-w-xl mx-auto hidden md:block md:-translate-x-3 pr-10">
            <AiRefineInput
              title=""
              placeholder="例如：让描述更详细、删除第2页的某个要点、强调XXX的重要性... · Ctrl+Enter提交"
              onSubmit={handleAiRefineDescriptions}
              disabled={false}
              className="!p-0 !bg-transparent !border-0"
              onStatusChange={setIsAiRefining}
            />
          </div>
          
          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />}
              onClick={() => navigate(`/project/${projectId}/outline`)}
              className="hidden md:inline-flex"
            >
              <span className="hidden lg:inline">上一步</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<ImagePlus size={16} className="md:w-[18px] md:h-[18px]" />}
              onClick={() => navigate(`/project/${projectId}/materials`)}
              className="hidden md:inline-flex"
            >
              <span className="hidden lg:inline">素材库</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />}
              onClick={() => {
                if (isXhsProject) {
                  navigate(`/project/${projectId}/xhs`);
                  return;
                }
                if (isInfographicProject) {
                  navigate(`/project/${projectId}/infographic`);
                  return;
                }
                navigate(`/project/${projectId}/preview`);
              }}
              disabled={!canProceedToPreview}
              className="text-xs md:text-sm"
            >
              <span className="hidden sm:inline">{isPptProject ? '生成图片' : '进入预览'}</span>
            </Button>
          </div>
        </div>
        
        {/* 移动端：AI 输入框 */}
        <div className="mt-2 md:hidden">
          <AiRefineInput
            title=""
            placeholder="例如：让描述更详细... · Ctrl+Enter"
            onSubmit={handleAiRefineDescriptions}
            disabled={false}
            className="!p-0 !bg-transparent !border-0"
            onStatusChange={setIsAiRefining}
          />
        </div>
      </header>

      {/* 操作栏 */}
      <div className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 md:py-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-1">
            <Button
              variant="primary"
              icon={<Sparkles size={16} className="md:w-[18px] md:h-[18px]" />}
              onClick={handleGenerateAll}
              className="flex-1 sm:flex-initial text-sm md:text-base"
              disabled={isBatchGeneratingDescriptions || isGeneratingXhsBlueprint}
            >
              {isBatchGeneratingDescriptions || isGeneratingXhsBlueprint ? '生成中...' : '批量生成描述'}
            </Button>
            <Button
              variant="secondary"
              icon={<Download size={16} className="md:w-[18px] md:h-[18px]" />}
              onClick={handleExportDescriptions}
              disabled={!currentProject.pages.some((p: Page) => p.description_content)}
              className="flex-1 sm:flex-initial text-sm md:text-base"
            >
              导出描述
            </Button>
            <span className="text-xs md:text-sm text-gray-500 whitespace-nowrap">
              {currentProject.pages.filter((p: Page) => p.description_content).length} /{' '}
              {currentProject.pages.length} 页已完成
            </span>
          </div>
        </div>
        {(isBatchGeneratingDescriptions || isGeneratingXhsBlueprint) && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="inline-flex w-2 h-2 rounded-full bg-banana-500 animate-pulse" />
                <span>
                  {isXhsProject
                    ? '正在生成小红书文案/卡片蓝图…'
                    : '正在批量生成页面描述…'}
                </span>
              </div>
              {!isXhsProject && (
                <span className="tabular-nums">
                  {Math.min(
                    Number((taskProgress as any)?.completed ?? 0),
                    Number((taskProgress as any)?.total ?? currentProject.pages.length)
                  )}{' '}
                  / {Number((taskProgress as any)?.total ?? currentProject.pages.length)}
                </span>
              )}
            </div>
            {!isXhsProject && (
              <div className="mt-2 h-2 bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-full bg-banana-500 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (Number((taskProgress as any)?.completed ?? 0) /
                          Math.max(1, Number((taskProgress as any)?.total ?? currentProject.pages.length))) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 主内容区 */}
      <main className="flex-1 p-3 md:p-6 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto">
          {isXhsProject && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-5 shadow-sm mb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div className="text-sm font-semibold text-gray-800">标题与正文</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGenerateXhsBlueprint(true)}
                    disabled={isGeneratingXhsBlueprint}
                  >
                    {isGeneratingXhsBlueprint ? '生成中...' : '重新生成文案'}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveXhsCopywriting}
                    disabled={isSavingXhsCopywriting}
                  >
                    {isSavingXhsCopywriting ? '保存中...' : '保存文案'}
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">标题</label>
                  <input
                    value={xhsTitle}
                    onChange={(e) => setXhsTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-400"
                    placeholder="请输入标题"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">正文</label>
                  <Textarea
                    value={xhsBody}
                    onChange={(e) => setXhsBody(e.target.value)}
                    rows={5}
                    className="text-sm"
                    placeholder="请输入正文内容"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">话题（空格分隔）</label>
                  <input
                    value={xhsHashtags}
                    onChange={(e) => setXhsHashtags(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-400"
                    placeholder="例如：#旅行 #攻略 #打卡"
                  />
                </div>
              </div>
            </div>
          )}
          {/* 项目资源列表（文件和图片） */}
          <ProjectResourcesList
            projectId={projectId || null}
            onFileClick={setPreviewFileId}
            showFiles={true}
            showImages={true}
          />
          
          {currentProject.pages.length === 0 ? (
            <div className="text-center py-12 md:py-20">
              <div className="flex justify-center mb-4"><FileText size={48} className="text-gray-300" /></div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">
                还没有页面
              </h3>
              <p className="text-sm md:text-base text-gray-500 mb-6">
                请先返回大纲编辑页添加页面
              </p>
              <Button
                variant="primary"
                onClick={() => navigate(`/project/${projectId}/outline`)}
                className="text-sm md:text-base"
              >
                返回大纲编辑
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              {currentProject.pages.map((page: Page, index: number) => {
                const pageId = page.id || page.page_id;
                return (
                  <DescriptionCard
                    key={pageId}
                    page={page}
                    index={index}
                    totalPages={currentProject.pages.length}
                    projectId={projectId || null}
                    onUpdate={(data) => updatePageLocal(pageId, data)}
                    onRegenerate={() => handleRegeneratePage(pageId)}
                    isGenerating={pageId ? !!pageDescriptionGeneratingTasks[pageId] : false}
                    isAiRefining={isAiRefining}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>
      <ToastContainer />
      {ConfirmDialog}
      <FilePreviewModal fileId={previewFileId} onClose={() => setPreviewFileId(null)} />

      {/* 单页重新生成描述（支持额外提示词） */}
      <Modal
        isOpen={isRegenerateModalOpen}
        onClose={() => setIsRegenerateModalOpen(false)}
        title="重新生成本页描述"
        size="lg"
      >
        <div className="space-y-4">
          <Textarea
            label="单页额外提示词（可选，仅本页生效）"
            placeholder="例如：更学术严谨、增加对比数据、强调关键结论..."
            value={regenerateExtraPrompt}
            onChange={(e) => setRegenerateExtraPrompt(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsRegenerateModalOpen(false)}
              disabled={isSubmittingRegenerate}
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmRegenerate}
              disabled={isSubmittingRegenerate}
            >
              {isSubmittingRegenerate ? '正在提交...' : '开始生成'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

