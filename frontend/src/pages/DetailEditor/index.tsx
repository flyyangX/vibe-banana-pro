import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePreviewModal, Loading, ProjectResourcesList } from '@/components/shared';
import { DetailEditorActionBar } from './components/DetailEditorActionBar';
import { DetailEditorHeader } from './components/DetailEditorHeader';
import { DetailEditorPageSection } from './components/DetailEditorPageSection';
import { RegenerateDescriptionModal } from './components/RegenerateDescriptionModal';
import { XhsCopywritingCard } from './components/XhsCopywritingCard';
import { useDetailEditorState } from './hooks/useDetailEditorState';

export const DetailEditor: React.FC = () => {
  const navigate = useNavigate();
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

  const handlePrevious = () => {
    navigate(`/project/${projectId}/outline`);
  };

  const handleMaterials = () => {
    navigate(`/project/${projectId}/materials`);
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

  const handleNavigateOutline = () => {
    navigate(`/project/${projectId}/outline`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DetailEditorHeader
        isPptProject={isPptProject}
        canProceedToPreview={canProceedToPreview}
        onBack={handleBack}
        onPrevious={handlePrevious}
        onMaterials={handleMaterials}
        onNext={handleNext}
        onAiRefine={handleAiRefineDescriptions}
        onAiStatusChange={setIsAiRefining}
      />

      <DetailEditorActionBar
        isBatchGenerating={isBatchGeneratingDescriptions}
        isGeneratingXhsBlueprint={isGeneratingXhsBlueprint}
        isXhsProject={isXhsProject}
        completedCount={completedPagesCount}
        totalCount={totalPagesCount}
        hasAnyDescriptions={hasAnyDescriptions}
        progressCompleted={progressCompleted}
        progressTotal={progressTotal}
        progressPercent={progressPercent}
        onGenerateAll={handleGenerateAll}
        onExportDescriptions={handleExportDescriptions}
      />

      <main className="flex-1 p-3 md:p-6 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto">
          {isXhsProject && (
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
          )}

          <ProjectResourcesList
            projectId={projectId || null}
            onFileClick={setPreviewFileId}
            showFiles={true}
            showImages={true}
          />

          <DetailEditorPageSection
            pages={pages}
            projectId={projectId || null}
            isAiRefining={isAiRefining}
            pageDescriptionGeneratingTasks={pageDescriptionGeneratingTasks || {}}
            onUpdatePage={updatePageLocal}
            onRegeneratePage={handleRegeneratePage}
            onNavigateOutline={handleNavigateOutline}
          />
        </div>
      </main>

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
