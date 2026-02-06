import React, { useState, useRef } from 'react';
import { useToast, MaterialSelector } from '@/components/shared';
import { getImageUrl } from '@/api/client';
import type { UserTemplate } from '@/api/endpoints';
import type { Material } from '@/api/endpoints';

import { TemplateGrid } from './components/TemplateGrid';
import { TemplateUploader } from './components/TemplateUploader';
import { VariantGenerator, VariantModal } from './components/TemplateActions';
import { useTemplateManager, presetTemplates } from './hooks/useTemplateManager';

interface TemplateSelectorProps {
  onSelect: (templateFile: File | null, templateId?: string) => void;
  selectedTemplateId?: string | null;
  selectedPresetTemplateId?: string | null;
  showUpload?: boolean;
  projectId?: string | null;
  templateVariants?: Record<string, string>;
  templateVariantsHistory?: Record<string, string[]>;
  onTemplatesGenerated?: () => Promise<void> | void;
  productContext?: 'ppt' | 'xhs' | 'infographic';
  showAllToggle?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onSelect,
  selectedTemplateId,
  selectedPresetTemplateId,
  showUpload = true,
  projectId,
  templateVariants = {},
  templateVariantsHistory = {},
  onTemplatesGenerated,
  productContext = 'ppt',
  showAllToggle = false,
}) => {
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [isMaterialSelectorOpen, setIsMaterialSelectorOpen] = useState(false);
  const [isVariantMaterialSelectorOpen, setIsVariantMaterialSelectorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { show, ToastContainer } = useToast();

  const manager = useTemplateManager({
    projectId,
    productContext,
    showAllTemplates,
    templateVariants,
    templateVariantsHistory,
    onTemplatesGenerated,
    onSelect,
    showToast: show,
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      manager.handleTemplateUpload(file, showUpload);
    }
    e.target.value = '';
  };

  return (
    <>
      <div className="space-y-4">
        {showAllToggle && (
          <div className="flex items-center justify-between text-xs text-secondary bg-gray-50 border border-border px-4 py-2">
            <span className="font-medium">显示全部模板（包含不匹配当前产品的模板）</span>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAllTemplates}
                onChange={(e) => setShowAllTemplates(e.target.checked)}
                className="accent-black"
              />
              <span className="text-primary font-bold">{showAllTemplates ? '已开启' : '已关闭'}</span>
            </label>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          disabled={manager.isLoadingTemplates}
        />

        <TemplateGrid
          userTemplates={manager.filteredUserTemplates}
          presetTemplates={manager.filteredPresetTemplates}
          selectedTemplateId={selectedTemplateId}
          selectedPresetTemplateId={selectedPresetTemplateId}
          deletingTemplateId={manager.deletingTemplateId}
          onSelectUserTemplate={(t) => manager.handleSelectUserTemplate(t, selectedTemplateId)}
          onSelectPresetTemplate={(id, preview) => manager.handleSelectPresetTemplate(id, preview, selectedPresetTemplateId)}
          onDeleteUserTemplate={(t, e) => { e.stopPropagation(); manager.handleDeleteUserTemplate(t, selectedTemplateId); }}
          onUploadClick={() => fileInputRef.current?.click()}
          isLoadingTemplates={manager.isLoadingTemplates}
        />

        <TemplateUploader
          showUpload={showUpload}
          saveToLibrary={manager.saveToLibrary}
          onSaveToLibraryChange={manager.setSaveToLibrary}
          onFileUpload={(file) => manager.handleTemplateUpload(file, showUpload)}
          onMaterialSelectorOpen={() => setIsMaterialSelectorOpen(true)}
          isLoadingTemplates={manager.isLoadingTemplates}
          hasProjectId={!!projectId}
        />

        {projectId && (
          <VariantGenerator
            selectedVariantTypes={manager.selectedVariantTypes}
            onToggleVariantType={manager.toggleVariantType}
            variantsExtraPrompt={manager.variantsExtraPrompt}
            onVariantsExtraPromptChange={manager.setVariantsExtraPrompt}
            isGeneratingVariants={manager.isGeneratingVariants}
            variantGenerateElapsed={manager.variantGenerateElapsed}
            onGenerateVariants={manager.handleGenerateVariants}
            templateVariants={templateVariants}
            onOpenVariantModal={manager.openVariantModal}
          />
        )}
      </div>

      <ToastContainer />

      {/* Material Selector for template selection */}
      {projectId && (
        <MaterialSelector
          projectId={projectId}
          isOpen={isMaterialSelectorOpen}
          onClose={() => setIsMaterialSelectorOpen(false)}
          onSelect={manager.handleSelectMaterials}
          multiple={false}
          showSaveAsTemplateOption={true}
        />
      )}

      {/* Material Selector for variant reference images */}
      {projectId && (
        <MaterialSelector
          projectId={projectId}
          isOpen={isVariantMaterialSelectorOpen}
          onClose={() => setIsVariantMaterialSelectorOpen(false)}
          onSelect={(materials) => {
            const urls = materials.map((m) => m.url).filter(Boolean) as string[];
            manager.addVariantUrls(urls);
          }}
          multiple={true}
          maxSelection={8}
        />
      )}

      <VariantModal
        isOpen={manager.isVariantModalOpen}
        onClose={() => manager.setIsVariantModalOpen(false)}
        previewVariantType={manager.previewVariantType}
        currentVariantUrl={manager.currentVariantUrl}
        variantHistoryList={manager.variantHistoryList}
        variantExtraPrompt={manager.variantExtraPrompt}
        onVariantExtraPromptChange={manager.setVariantExtraPrompt}
        variantRefImageUrls={manager.variantRefImageUrls}
        variantUploadedFiles={manager.variantUploadedFiles}
        isVariantUploading={manager.isVariantUploading}
        isVariantSelecting={manager.isVariantSelecting}
        isVariantRegenerating={manager.isVariantRegenerating}
        variantRegenerateElapsed={manager.variantRegenerateElapsed}
        onVariantUpload={manager.handleVariantUpload}
        onSelectVariantHistory={manager.handleSelectVariantHistory}
        onAddVariantFiles={manager.addVariantFiles}
        onRemoveVariantFile={manager.removeVariantFile}
        onRemoveVariantUrl={manager.removeVariantUrl}
        onOpenMaterialSelector={() => setIsVariantMaterialSelectorOpen(true)}
        onRegenerate={manager.handleVariantRegenerate}
      />
    </>
  );
};

/**
 * Get template File object by template ID (on-demand loading)
 */
export const getTemplateFile = async (
  templateId: string,
  userTemplates: UserTemplate[]
): Promise<File | null> => {
  const presetTemplate = presetTemplates.find(t => t.id === templateId);
  if (presetTemplate && presetTemplate.preview) {
    try {
      const response = await fetch(presetTemplate.preview);
      const blob = await response.blob();
      return new File([blob], presetTemplate.preview.split('/').pop() || 'template.png', { type: blob.type });
    } catch (error) {
      console.error('加载预设模板失败:', error);
      return null;
    }
  }

  const userTemplate = userTemplates.find(t => t.template_id === templateId);
  if (userTemplate) {
    try {
      const imageUrl = getImageUrl(userTemplate.template_image_url);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new File([blob], 'template.png', { type: blob.type });
    } catch (error) {
      console.error('加载用户模板失败:', error);
      return null;
    }
  }

  return null;
};

export { presetTemplates } from './hooks/useTemplateManager';
