import React from 'react';
import { X } from 'lucide-react';
import { Button, MaterialGeneratorModal, ProjectSettingsModal } from '@/components/shared';
import { TemplateSelector } from '@/components/shared/TemplateSelector/index';
import type { ExportExtractorMethod, ExportInpaintMethod } from '@/types';

interface InfographicSidebarProps {
  projectId: string;

  // Material modal
  isMaterialModalOpen: boolean;
  onCloseMaterialModal: () => void;

  // Project settings modal
  isProjectSettingsOpen: boolean;
  onCloseProjectSettings: () => void;
  extraRequirements: string;
  templateStyle: string;
  templateUsageMode: 'auto' | 'template' | 'style';
  onExtraRequirementsChange: (value: string) => void;
  onTemplateStyleChange: (value: string) => void;
  onTemplateUsageModeChange: (value: 'auto' | 'template' | 'style') => void;
  onSaveExtraRequirements: () => void;
  onSaveTemplateStyle: () => void;
  isSavingRequirements: boolean;
  isSavingTemplateStyle: boolean;
  exportExtractorMethod: ExportExtractorMethod;
  exportInpaintMethod: ExportInpaintMethod;
  onExportExtractorMethodChange: (value: ExportExtractorMethod) => void;
  onExportInpaintMethodChange: (value: ExportInpaintMethod) => void;
  onSaveExportSettings: () => void;
  isSavingExportSettings: boolean;

  // Template modal
  isTemplateModalOpen: boolean;
  onCloseTemplateModal: () => void;
  selectedTemplateId: string | null;
  selectedPresetTemplateId: string | null;
  templateVariants?: Record<string, string>;
  templateVariantsHistory?: Record<string, string[]>;
  onTemplateSelect: (file: File | null, templateId?: string) => void;
  onClearTemplate: () => void;
  isUploadingTemplate: boolean;
  isClearingTemplate: boolean;
  hasTemplateResource: boolean;
  onTemplatesGenerated: () => Promise<void>;
}

export const InfographicSidebar: React.FC<InfographicSidebarProps> = ({
  projectId,
  isMaterialModalOpen,
  onCloseMaterialModal,
  isProjectSettingsOpen,
  onCloseProjectSettings,
  extraRequirements,
  templateStyle,
  templateUsageMode,
  onExtraRequirementsChange,
  onTemplateStyleChange,
  onTemplateUsageModeChange,
  onSaveExtraRequirements,
  onSaveTemplateStyle,
  isSavingRequirements,
  isSavingTemplateStyle,
  exportExtractorMethod,
  exportInpaintMethod,
  onExportExtractorMethodChange,
  onExportInpaintMethodChange,
  onSaveExportSettings,
  isSavingExportSettings,
  isTemplateModalOpen,
  onCloseTemplateModal,
  selectedTemplateId,
  selectedPresetTemplateId,
  templateVariants,
  templateVariantsHistory,
  onTemplateSelect,
  onClearTemplate,
  isUploadingTemplate,
  isClearingTemplate,
  hasTemplateResource,
  onTemplatesGenerated,
}) => {
  return (
    <>
      <MaterialGeneratorModal
        projectId={projectId}
        isOpen={isMaterialModalOpen}
        onClose={onCloseMaterialModal}
      />
      <ProjectSettingsModal
        isOpen={isProjectSettingsOpen}
        onClose={onCloseProjectSettings}
        extraRequirements={extraRequirements}
        templateStyle={templateStyle}
        templateUsageMode={templateUsageMode}
        onExtraRequirementsChange={onExtraRequirementsChange}
        onTemplateStyleChange={onTemplateStyleChange}
        onTemplateUsageModeChange={onTemplateUsageModeChange}
        onSaveExtraRequirements={onSaveExtraRequirements}
        onSaveTemplateStyle={onSaveTemplateStyle}
        isSavingRequirements={isSavingRequirements}
        isSavingTemplateStyle={isSavingTemplateStyle}
        exportExtractorMethod={exportExtractorMethod}
        exportInpaintMethod={exportInpaintMethod}
        onExportExtractorMethodChange={onExportExtractorMethodChange}
        onExportInpaintMethodChange={onExportInpaintMethodChange}
        onSaveExportSettings={onSaveExportSettings}
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
                  onClick={onCloseTemplateModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="关闭"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <TemplateSelector
                  onSelect={onTemplateSelect}
                  selectedTemplateId={selectedTemplateId}
                  selectedPresetTemplateId={selectedPresetTemplateId}
                  showUpload={false}
                  projectId={projectId}
                  templateVariants={templateVariants}
                  templateVariantsHistory={templateVariantsHistory}
                  onTemplatesGenerated={onTemplatesGenerated}
                />
              </div>
              <div className="shrink-0 px-6 py-4 border-t flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={onClearTemplate}
                  disabled={isUploadingTemplate || isClearingTemplate || !hasTemplateResource}
                >
                  取消当前模板
                </Button>
                <Button
                  variant="ghost"
                  onClick={onCloseTemplateModal}
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
  );
};
