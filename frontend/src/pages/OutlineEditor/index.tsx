import React from 'react';
import { Sparkle, FileText } from 'lucide-react';
import { Loading, FilePreviewModal } from '@/components/shared';
import { OutlineToolbar } from './components/OutlineToolbar';
import { OutlineList } from './components/OutlineList';
import { PageEditor, MobilePagePreview } from './components/PageEditor';
import { useOutlineEditorState } from './hooks/useOutlineEditorState';

export const OutlineEditor: React.FC = () => {
  const {
    // State
    projectId,
    currentProject,
    selectedPageId,
    setSelectedPageId,
    selectedPage,
    isAiRefining,
    setIsAiRefining,
    previewFileId,
    setPreviewFileId,
    outlinePageCount,
    setOutlinePageCount,
    infographicMode,
    setInfographicMode,
    xhsAspectRatio,
    setXhsAspectRatio,
    isGlobalLoading,
    productTypeLabel,

    // Actions
    sensors,
    handleDragEnd,
    handleGenerateOutline,
    handleAiRefineOutline,
    handleExportOutline,
    handleNavigateBack,
    handleNavigateNext,
    handleNavigateToMaterials,
    updatePageLocal,
    saveAllPages,
    deletePageById,
    addNewPage,

    // Components
    ConfirmDialog,
    ToastContainer,
  } = useOutlineEditorState();

  if (!currentProject) {
    return <Loading fullscreen message="加载项目中..." />;
  }

  if (isGlobalLoading) {
    return <Loading fullscreen message="生成大纲中..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶栏 */}
      <OutlineToolbar
        onNavigateBack={handleNavigateBack}
        onSave={saveAllPages}
        onNavigateToMaterials={handleNavigateToMaterials}
        onNavigateNext={handleNavigateNext}
        onAiRefine={handleAiRefineOutline}
        onAiRefiningChange={setIsAiRefining}
      />

      {/* 上下文栏 */}
      <div className="bg-banana-50 border-b border-banana-100 px-3 md:px-6 py-2 md:py-3 max-h-32 overflow-y-auto flex-shrink-0">
        <div className="flex items-start gap-1.5 md:gap-2 text-xs md:text-sm">
          {currentProject.creation_type === 'idea' && (
            <span className="font-medium text-gray-700 flex-shrink-0 flex items-center">
              <Sparkle size={12} className="mr-1" /> {productTypeLabel}:
              <span className="text-gray-900 font-normal ml-2 break-words whitespace-pre-wrap">{currentProject.idea_prompt}</span>
            </span>
          )}
          {currentProject.creation_type === 'outline' && (
            <span className="font-medium text-gray-700 flex-shrink-0 flex items-center">
              <FileText size={12} className="mr-1" /> 大纲:
              <span className="text-gray-900 font-normal ml-2 break-words whitespace-pre-wrap">{currentProject.outline_text || currentProject.idea_prompt}</span>
            </span>
          )}
          {currentProject.creation_type === 'descriptions' && (
            <span className="font-medium text-gray-700 flex-shrink-0 flex items-center">
              <FileText size={12} className="mr-1" /> 描述:
              <span className="text-gray-900 font-normal ml-2 break-words whitespace-pre-wrap">{currentProject.description_text || currentProject.idea_prompt}</span>
            </span>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* 左侧：大纲列表 */}
        <OutlineList
          currentProject={currentProject}
          projectId={projectId}
          selectedPageId={selectedPageId}
          isAiRefining={isAiRefining}
          outlinePageCount={outlinePageCount}
          setOutlinePageCount={setOutlinePageCount}
          infographicMode={infographicMode}
          setInfographicMode={setInfographicMode}
          xhsAspectRatio={xhsAspectRatio}
          setXhsAspectRatio={setXhsAspectRatio}
          sensors={sensors}
          onDragEnd={handleDragEnd}
          onPageSelect={setSelectedPageId}
          onPageUpdate={updatePageLocal}
          onPageDelete={deletePageById}
          onAddPage={addNewPage}
          onGenerateOutline={handleGenerateOutline}
          onExportOutline={handleExportOutline}
          onSaveAllPages={saveAllPages}
          onFileClick={setPreviewFileId}
        />

        {/* 右侧：预览 */}
        <div className="hidden md:block w-96 bg-white border-l border-gray-200 p-4 md:p-6 overflow-y-auto flex-shrink-0">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">预览</h3>
          <PageEditor selectedPage={selectedPage} />
        </div>

        {/* 移动端预览：底部抽屉 */}
        <MobilePagePreview selectedPage={selectedPage} />
      </div>

      {ConfirmDialog}
      <ToastContainer />

      <FilePreviewModal fileId={previewFileId} onClose={() => setPreviewFileId(null)} />
    </div>
  );
};

export default OutlineEditor;
