import React, { useMemo } from 'react';
import { getImageUrl } from '@/api/client';
import { PageEditModal } from '@/components/shared';
import type { DescriptionContent, Page, Project } from '@/types';

interface SelectedContextImages {
  templateUsageMode: 'auto' | 'template' | 'style';
  descImageUrls: string[];
  uploadedFiles: File[];
}

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  selectedPage?: Page;
  currentProject: Project | null;
  hasTemplateResource: boolean;
  // Edit state
  editPrompt: string;
  editOutlineTitle: string;
  editOutlinePoints: string;
  editDescription: string;
  isOutlineExpanded: boolean;
  isDescriptionExpanded: boolean;
  selectedContextImages: SelectedContextImages;
  // Callbacks
  onEditPromptChange: (value: string) => void;
  onEditOutlineTitleChange: (value: string) => void;
  onEditOutlinePointsChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onToggleOutlineExpanded: () => void;
  onToggleDescriptionExpanded: () => void;
  onSelectedContextImagesChange: (value: SelectedContextImages | ((prev: SelectedContextImages) => SelectedContextImages)) => void;
  onOpenMaterialSelector: () => void;
  onSaveOutlineAndDescription: () => void;
  onSubmitEdit: () => void;
  extractImageUrlsFromDescription: (descriptionContent: DescriptionContent | undefined) => string[];
  showToast: (options: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  selectedPage,
  currentProject,
  hasTemplateResource,
  editPrompt,
  editOutlineTitle,
  editOutlinePoints,
  editDescription,
  isOutlineExpanded,
  isDescriptionExpanded,
  selectedContextImages,
  onEditPromptChange,
  onEditOutlineTitleChange,
  onEditOutlinePointsChange,
  onEditDescriptionChange,
  onToggleOutlineExpanded,
  onToggleDescriptionExpanded,
  onSelectedContextImagesChange,
  onOpenMaterialSelector,
  onSaveOutlineAndDescription,
  onSubmitEdit,
  extractImageUrlsFromDescription,
  showToast,
}) => {
  const descImageCandidates = useMemo(() => {
    if (!selectedPage?.description_content) return [];
    return extractImageUrlsFromDescription(selectedPage.description_content);
  }, [extractImageUrlsFromDescription, selectedPage?.description_content]);

  const templatePreviewUrl = useMemo(() => {
    if (!currentProject?.template_image_path) return null;
    return getImageUrl(currentProject.template_image_path, currentProject.updated_at);
  }, [currentProject?.template_image_path, currentProject?.updated_at]);

  return (
    <PageEditModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑页面"
      imageUrl={imageUrl || null}
      previewAspectRatio="16:9"
      showOutline
      outlineTitle={editOutlineTitle}
      outlinePointsText={editOutlinePoints}
      isOutlineExpanded={isOutlineExpanded}
      onOutlineTitleChange={onEditOutlineTitleChange}
      onOutlinePointsTextChange={onEditOutlinePointsChange}
      onToggleOutlineExpanded={onToggleOutlineExpanded}
      showDescription
      descriptionText={editDescription}
      isDescriptionExpanded={isDescriptionExpanded}
      onDescriptionTextChange={onEditDescriptionChange}
      onToggleDescriptionExpanded={onToggleDescriptionExpanded}
      templateUsageMode={selectedContextImages.templateUsageMode}
      onTemplateUsageModeChange={(mode) =>
        onSelectedContextImagesChange((prev) => ({
          ...prev,
          templateUsageMode: mode,
        }))
      }
      hasTemplateResource={hasTemplateResource}
      templatePreviewUrl={templatePreviewUrl}
      descImageCandidates={descImageCandidates}
      selectedDescImageUrls={selectedContextImages.descImageUrls}
      onSelectedDescImageUrlsChange={(urls) =>
        onSelectedContextImagesChange((prev) => ({
          ...prev,
          descImageUrls: urls,
        }))
      }
      uploadedFiles={selectedContextImages.uploadedFiles}
      onUploadedFilesChange={(files) =>
        onSelectedContextImagesChange((prev) => ({
          ...prev,
          uploadedFiles: files,
        }))
      }
      onOpenMaterialSelector={onOpenMaterialSelector}
      editInstruction={editPrompt}
      onEditInstructionChange={onEditPromptChange}
      isSubmitting={false}
      submitText="生成图片"
      onSubmit={onSubmitEdit}
      showSaveOnly
      saveOnlyText="仅保存大纲/描述"
      onSaveOnly={onSaveOutlineAndDescription}
      toast={showToast}
    />
  );
};
