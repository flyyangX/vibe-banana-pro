import React from 'react';
import { Loading, PageEditModal } from '@/components/shared';
import { getImageUrl } from '@/api/client';
import { useInfographicState } from './hooks/useInfographicState';
import { InfographicToolbar } from './components/InfographicToolbar';
import { InfographicCanvas } from './components/InfographicCanvas';
import { InfographicSidebar } from './components/InfographicSidebar';

export const InfographicPreview: React.FC = () => {
  const state = useInfographicState();

  if (!state.projectId) {
    return <Loading fullscreen message="缺少项目ID" />;
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <InfographicToolbar
        projectId={state.projectId}
        projectTitle={state.currentProject?.idea_prompt}
        isLoading={state.isLoading}
        isGenerating={state.isGenerating || state.isEditingGenerating}
        onRefresh={state.loadMaterials}
        onOpenTemplateModal={() => state.setIsTemplateModalOpen(true)}
        onOpenMaterialModal={() => state.setIsMaterialModalOpen(true)}
        onOpenSettingsModal={() => state.setIsProjectSettingsOpen(true)}
        onGenerate={state.handleGenerate}
      />

      <InfographicCanvas
        isLoading={state.isLoading}
        isGenerating={state.isGenerating || state.isEditingGenerating}
        editingMaterialIds={state.editingMaterialIds}
        displayMaterials={state.displayMaterials}
        mode={state.mode}
        aspectRatio={state.aspectRatio}
        resolution={state.resolution}
        progress={state.progress}
        onAspectRatioChange={state.setAspectRatio}
        onResolutionChange={state.setResolution}
        onEditMaterial={state.openEditModal}
      />

      <state.ToastContainer />

      <PageEditModal
        isOpen={state.isEditModalOpen}
        onClose={() => state.setIsEditModalOpen(false)}
        title="编辑信息图"
        imageUrl={state.editTargetMaterial ? getImageUrl(state.editTargetMaterial.url) : null}
        previewAspectRatio={state.aspectRatio}
        showOutline
        outlineTitle={state.editOutlineTitle}
        outlinePointsText={state.editOutlinePoints}
        isOutlineExpanded={state.isOutlineExpanded}
        onOutlineTitleChange={state.setEditOutlineTitle}
        onOutlinePointsTextChange={state.setEditOutlinePoints}
        onToggleOutlineExpanded={() => state.setIsOutlineExpanded((prev) => !prev)}
        showDescription
        descriptionText={state.editDescription}
        isDescriptionExpanded={state.isDescriptionExpanded}
        onDescriptionTextChange={state.setEditDescription}
        onToggleDescriptionExpanded={() => state.setIsDescriptionExpanded((prev) => !prev)}
        templateUsageMode={state.templateUsageMode}
        onTemplateUsageModeChange={state.setTemplateUsageMode}
        hasTemplateResource={state.hasTemplateResource}
        templatePreviewUrl={
          state.currentProject?.template_image_path
            ? getImageUrl(state.currentProject.template_image_path, state.currentProject.updated_at)
            : null
        }
        descImageCandidates={state.editDescImageUrls}
        selectedDescImageUrls={state.selectedDescImageUrls}
        onSelectedDescImageUrlsChange={state.setSelectedDescImageUrls}
        uploadedFiles={state.editUploadedFiles}
        onUploadedFilesChange={state.setEditUploadedFiles}
        onOpenMaterialSelector={() => state.setIsMaterialModalOpen(true)}
        editInstruction={state.editInstruction}
        onEditInstructionChange={state.setEditInstruction}
        isSubmitting={state.isSubmittingEdit}
        submitText="开始编辑"
        onSubmit={state.handleSubmitEdit}
        showSaveOnly
        saveOnlyText="仅保存大纲/描述"
        onSaveOnly={state.handleSaveOutlineAndDescription}
        toast={state.show}
      />

      <InfographicSidebar
        projectId={state.projectId}
        isMaterialModalOpen={state.isMaterialModalOpen}
        onCloseMaterialModal={() => state.setIsMaterialModalOpen(false)}
        isProjectSettingsOpen={state.isProjectSettingsOpen}
        onCloseProjectSettings={() => state.setIsProjectSettingsOpen(false)}
        extraRequirements={state.extraRequirements}
        templateStyle={state.templateStyle}
        templateUsageMode={state.templateUsageMode}
        onExtraRequirementsChange={state.handleExtraRequirementsChange}
        onTemplateStyleChange={state.handleTemplateStyleChange}
        onTemplateUsageModeChange={state.setTemplateUsageMode}
        onSaveExtraRequirements={state.handleSaveExtraRequirements}
        onSaveTemplateStyle={state.handleSaveTemplateStyle}
        isSavingRequirements={state.isSavingRequirements}
        isSavingTemplateStyle={state.isSavingTemplateStyle}
        exportExtractorMethod={state.exportExtractorMethod}
        exportInpaintMethod={state.exportInpaintMethod}
        onExportExtractorMethodChange={state.setExportExtractorMethod}
        onExportInpaintMethodChange={state.setExportInpaintMethod}
        onSaveExportSettings={state.handleSaveExportSettings}
        isSavingExportSettings={state.isSavingExportSettings}
        isTemplateModalOpen={state.isTemplateModalOpen}
        onCloseTemplateModal={() => state.setIsTemplateModalOpen(false)}
        selectedTemplateId={state.selectedTemplateId}
        selectedPresetTemplateId={state.selectedPresetTemplateId}
        templateVariants={state.currentProject?.template_variants}
        templateVariantsHistory={state.currentProject?.template_variants_history}
        userTemplates={state.userTemplates}
        onTemplateSelect={state.handleTemplateSelect}
        onClearTemplate={state.handleClearTemplate}
        isUploadingTemplate={state.isUploadingTemplate}
        isClearingTemplate={state.isClearingTemplate}
        hasTemplateResource={state.hasTemplateResource}
        onTemplatesGenerated={async () => {
          if (state.projectId) {
            await state.syncProject(state.projectId);
          }
        }}
      />
    </div>
  );
};

export default InfographicPreview;
