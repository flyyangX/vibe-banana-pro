import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, X, ArrowLeft, Loader2, Download, Menu } from 'lucide-react';
import { FilePreviewModal, Loading, ProjectResourcesList, Logo } from '@/components/shared';
import { DetailEditorPageSection } from './components/DetailEditorPageSection';
import { RegenerateDescriptionModal } from './components/RegenerateDescriptionModal';
import { XhsCopywritingCard } from './components/XhsCopywritingCard';
import { useDetailEditorState } from './hooks/useDetailEditorState';
import { updateProject } from '@/api/endpoints';
import { useProjectStore } from '@/store/useProjectStore';

export const DetailEditor: React.FC = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInputValue, setTitleInputValue] = useState('');
  const { syncProject } = useProjectStore();
  const {
    projectId,
    fromHistory,
    currentProject,
    pages,
    updatePageLocal,
    pageDescriptionGeneratingTasks,
    isXhsProject,
    isInfographicProject,
    isPptProject,
    canProceedToPreview,
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
  } = useDetailEditorState();

  if (!currentProject) {
    return <Loading fullscreen message="加载项目中..." />;
  }

  const handleBack = () => {
    if (fromHistory) {
      navigate('/history');
      return;
    }
    navigate(`/project/${projectId}/outline`);
  };

  const handleNext = () => {
    if (isXhsProject) {
      navigate(`/project/${projectId}/xhs`);
      return;
    }
    if (isInfographicProject) {
      navigate(`/project/${projectId}/infographic`);
      return;
    }
    navigate(`/project/${projectId}/preview`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-primary h-screen overflow-hidden relative">
      
      {/* 1. 顶部 Header (Minimalist) */}
      <header className="h-14 md:h-16 bg-white border-b border-black flex items-center justify-between px-3 md:px-6 z-20 flex-shrink-0">
         <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
             {/* 1. Logo / Menu First */}
             <div className="flex items-center gap-1">
                 <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                     <Menu size={20} />
                 </button>
                 <div onClick={() => navigate('/')} className="cursor-pointer hover:opacity-80 transition-all uppercase tracking-tighter hidden md:block">
                   <Logo size="md" />
                 </div>
             </div>

             {/* 2. Standard Back Button (Round like SlidePreview) */}
             <button 
               onClick={handleBack} 
               className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black flex-shrink-0"
               title="上一步"
             >
                 <ArrowLeft size={20} />
             </button>

             <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

             {/* 3. Page Title / Project Title */}
             <div className="flex items-center gap-3 overflow-hidden">
                <span className="font-bold text-sm uppercase tracking-wider whitespace-nowrap hidden lg:inline">内容描述</span>
                <div className="h-4 w-px bg-gray-100 hidden lg:block"></div>
                
                {isEditingTitle ? (
                    <input 
                      autoFocus
                      className="text-xs md:text-sm font-bold border-b border-black outline-none bg-transparent min-w-[120px] max-w-[200px]"
                      value={titleInputValue}
                      onChange={(e) => setTitleInputValue(e.target.value)}
                      onBlur={async () => {
                        if (titleInputValue.trim() !== currentProject.idea_prompt && titleInputValue.trim() && currentProject.id) {
                          try {
                            await updateProject(currentProject.id, { idea_prompt: titleInputValue });
                            await syncProject(currentProject.id);
                          } catch (err) {
                            console.error('Failed to update project name', err);
                          }
                        }
                        setIsEditingTitle(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        else if (e.key === 'Escape') {
                           setIsEditingTitle(false);
                           setTitleInputValue(currentProject.idea_prompt || '');
                        }
                      }}
                    />
                ) : (
                   <div 
                     className="text-xs md:text-sm font-bold truncate max-w-[150px] md:max-w-[250px] cursor-pointer hover:underline hover:text-gray-700"
                     onClick={() => {
                       setTitleInputValue(currentProject.idea_prompt || '');
                       setIsEditingTitle(true);
                     }}
                     title="点击修改名称"
                   >
                       {currentProject.idea_prompt || '未命名项目'}
                   </div>
                )}
             </div>
         </div>

         {/* Right Side - Actions */}
         <div className="flex items-center gap-2 md:gap-3">
             <div className="hidden xl:flex items-center gap-4 mr-4 border-r border-gray-100 pr-4">
                <div className="flex flex-col items-end">
                   <div className="text-[10px] font-bold text-gray-400 mb-0.5">{completedPagesCount}/{totalPagesCount} 页完成</div>
                   <div className="w-24 h-1 bg-gray-100">
                      <div className="h-full bg-black transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                   </div>
                </div>
             </div>

             {/* Action Buttons: Batch Generate, Export */}
             <div className="flex items-center gap-1.5 md:gap-2">
                <button 
                  onClick={handleGenerateAll}
                  disabled={isBatchGeneratingDescriptions || isGeneratingXhsBlueprint}
                  className="h-8 md:h-9 px-3 md:px-5 border border-black hover:bg-black hover:text-white disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-black transition-all flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-wider"
                >
                  {(isBatchGeneratingDescriptions || isGeneratingXhsBlueprint) ? <Loader2 size={12} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                  <span className="hidden sm:inline">{isXhsProject ? '重新生成文案' : '批量生成描述'}</span>
                  <span className="sm:hidden">生成</span>
                </button>

                <button 
                  onClick={handleExportDescriptions}
                  disabled={!hasAnyDescriptions || isBatchGeneratingDescriptions || isGeneratingXhsBlueprint}
                  className="h-8 md:h-9 px-3 md:px-4 border border-gray-200 hover:border-black transition-all flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-black"
                >
                  <Download size={12} />
                  <span className="hidden md:inline">导出文本</span>
                </button>
             </div>

             <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

             <button onClick={handleNext} className="bg-black text-white hover:bg-gray-800 text-[10px] md:text-xs font-bold uppercase tracking-wide px-3 md:px-6 h-8 md:h-9 border border-black transition-all flex items-center gap-2">
                <span className="hidden sm:inline">下一步</span>
                <span className="sm:hidden">预览</span>
                <Play size={10} fill="currentColor" />
             </button>
         </div>
      </header>

      {/* Mobile Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 2. 工作区 (Workspace) */}
      <div className="flex-1 flex overflow-hidden">
          
          {/* 左侧导航列表 (Navigation List) - Drawer on Mobile */}
          <aside className={`
              fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
              ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
              md:relative md:translate-x-0 md:w-[220px] md:flex-shrink-0
          `}>
             <div className="p-4 border-b border-gray-100 flex justify-between items-center">
               <div className="text-[10px] font-bold text-black uppercase tracking-wider">页面导航</div>
               <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-1 hover:bg-gray-100 rounded text-gray-400">
                   <X size={18} />
               </button>
             </div>
             <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col">
                  {pages.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        const el = document.getElementById(`page-card-${p.id}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="px-4 py-3 text-left border-b border-gray-50 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-gray-400 group-hover:text-black w-4">{String(idx + 1).padStart(2, '0')}</span>
                        <div className="text-xs font-medium text-gray-600 group-hover:text-black truncate">{p.outline_content?.title || '无标题页面'}</div>
                      </div>
                    </button>
                  ))}
                </div>
             </div>
          </aside>

          {/* 中间主要编辑区 (Main Editor) */}
          <main className="flex-1 bg-gray-50 relative flex flex-col">
               <div className="w-full h-full overflow-y-auto p-4 md:p-8 no-scrollbar scroll-smooth">
                   <div className="max-w-3xl mx-auto space-y-8 pb-32">
                        {/* 小红书文案卡片 (如果有) */}
                        {isXhsProject && (
                            <div className="mb-8">
                                <XhsCopywritingCard
                                  title={xhsTitle}
                                  body={xhsBody}
                                  hashtags={xhsHashtags}
                                  isGenerating={isGeneratingXhsBlueprint}
                                  isSaving={isSavingXhsCopywriting}
                                  onGenerateCopywriting={() => handleGenerateXhsBlueprint(true)}
                                  onSaveCopywriting={handleSaveXhsCopywriting}
                                  onTitleChange={setXhsTitle}
                                  onBodyChange={setXhsBody}
                                  onHashtagsChange={setXhsHashtags}
                                />
                            </div>
                        )}

                       {/* 页面内容流 */}
                       {/* 我们在这里直接渲染 PageSection，PageSection 内部负责渲染卡片 */}
                        <DetailEditorPageSection
                            pages={pages}
                            projectId={projectId || null}
                            isAiRefining={isAiRefining}
                            pageDescriptionGeneratingTasks={pageDescriptionGeneratingTasks || {}}
                            onUpdatePage={updatePageLocal}
                            onRegeneratePage={handleRegeneratePage}
                            onNavigateOutline={() => navigate(`/project/${projectId}/outline`)}
                        />
                   </div>
               </div>
          </main>

          {/* 右侧面板 (Resources) */}
          <aside className="w-[260px] bg-white border-l border-gray-200 hidden xl:flex flex-col">
              <div className="p-4 border-b border-gray-100">
                  <div className="text-[10px] font-bold text-black uppercase tracking-wider">素材资源</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                  <ProjectResourcesList
                    projectId={projectId || null}
                    onFileClick={setPreviewFileId}
                    showFiles={true}
                    showImages={true}
                  />
              </div>
          </aside>
      </div>

      <ToastContainer />
      {ConfirmDialog}
      <FilePreviewModal fileId={previewFileId} onClose={() => setPreviewFileId(null)} />

      <RegenerateDescriptionModal
        isOpen={isRegenerateModalOpen}
        extraPrompt={regenerateExtraPrompt}
        isSubmitting={isSubmittingRegenerate}
        onExtraPromptChange={setRegenerateExtraPrompt}
        onClose={closeRegenerateModal}
        onConfirm={handleConfirmRegenerate}
      />
    </div>
  );
};
