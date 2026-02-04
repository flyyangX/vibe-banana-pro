import React from 'react';
import { Button, Modal } from '@/components/shared';
import { type ReferenceFile } from '@/api/endpoints';
import { useReferenceFileManager } from './hooks/useReferenceFileManager';
import { FileList } from './components/FileList';
import { FileUploader } from './components/FileUploader';

interface ReferenceFileSelectorProps {
  projectId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (files: ReferenceFile[]) => void;
  multiple?: boolean;
  maxSelection?: number;
  initialSelectedIds?: string[];
}

/**
 * 参考文件选择器组件
 * - 浏览项目下的所有参考文件
 * - 支持单选/多选
 * - 支持上传本地文件
 * - 支持从文件库选择（已解析的直接用，未解析的选中后当场解析）
 * - 支持删除文件
 */
export const ReferenceFileSelector: React.FC<ReferenceFileSelectorProps> = React.memo(({
  projectId,
  isOpen,
  onClose,
  onSelect,
  multiple = true,
  maxSelection,
  initialSelectedIds = [],
}) => {
  const {
    files,
    selectedFiles,
    deletingIds,
    isLoading,
    isUploading,
    parsingIds,
    filterProjectId,
    fileInputRef,
    setFilterProjectId,
    loadFiles,
    handleSelectFile,
    handleConfirm,
    handleClear,
    handleUpload,
    handleDeleteFile,
  } = useReferenceFileManager({
    projectId,
    isOpen,
    initialSelectedIds,
  });

  const onFileSelect = (file: ReferenceFile) => {
    handleSelectFile(file, multiple, maxSelection);
  };

  const onConfirm = () => {
    handleConfirm(onSelect, onClose);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="选择参考文件" size="lg">
      <div className="space-y-4">
        <FileUploader
          projectId={projectId}
          filterProjectId={filterProjectId}
          filesCount={files.length}
          selectedCount={selectedFiles.size}
          isLoading={isLoading}
          isUploading={isUploading}
          fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
          onFilterChange={setFilterProjectId}
          onRefresh={loadFiles}
          onUploadClick={() => fileInputRef.current?.click()}
          onUpload={handleUpload}
          onClear={handleClear}
        />

        {/* File list */}
        <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
          <FileList
            files={files}
            selectedFiles={selectedFiles}
            deletingIds={deletingIds}
            parsingIds={parsingIds}
            isLoading={isLoading}
            onSelectFile={onFileSelect}
            onDeleteFile={handleDeleteFile}
          />
        </div>

        {/* Bottom action bar */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            提示：选择未解析的文件将自动开始解析
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button
              onClick={onConfirm}
              disabled={selectedFiles.size === 0}
            >
              确定 ({selectedFiles.size})
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
});
