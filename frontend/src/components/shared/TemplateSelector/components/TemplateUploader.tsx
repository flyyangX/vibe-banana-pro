import React, { useRef } from 'react';
import { Button } from '@/components/shared';
import { ImagePlus } from 'lucide-react';

interface TemplateUploaderProps {
  showUpload: boolean;
  saveToLibrary: boolean;
  onSaveToLibraryChange: (value: boolean) => void;
  onFileUpload: (file: File) => void;
  onMaterialSelectorOpen: () => void;
  isLoadingTemplates: boolean;
  hasProjectId: boolean;
}

export const TemplateUploader: React.FC<TemplateUploaderProps> = ({
  showUpload,
  saveToLibrary,
  onSaveToLibraryChange,
  onFileUpload,
  onMaterialSelectorOpen,
  isLoadingTemplates,
  hasProjectId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
    e.target.value = '';
  };

  return (
    <>
      {/* Show save to library option on preview page */}
      {!showUpload && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToLibrary}
              onChange={(e) => onSaveToLibraryChange(e.target.checked)}
              className="w-4 h-4 text-banana-500 border-gray-300 rounded focus:ring-banana-500"
            />
            <span className="text-sm text-gray-700">
              上传模板时同时保存到我的模板库
            </span>
          </label>
        </div>
      )}

      {/* Hidden file input for grid upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isLoadingTemplates}
      />

      {/* Select from material library */}
      {hasProjectId && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">从素材库选择</h4>
          <Button
            variant="secondary"
            size="sm"
            icon={<ImagePlus size={16} />}
            onClick={onMaterialSelectorOpen}
            className="w-full"
          >
            从素材库选择作为模板
          </Button>
        </div>
      )}
    </>
  );
};

export const createUploadHandler = (
  fileInputRef: React.RefObject<HTMLInputElement>,
  onFileUpload: (file: File) => void,
  isLoadingTemplates: boolean
) => {
  return {
    triggerUpload: () => {
      fileInputRef.current?.click();
    },
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileUpload(file);
      }
      e.target.value = '';
    },
    isDisabled: isLoadingTemplates,
  };
};
