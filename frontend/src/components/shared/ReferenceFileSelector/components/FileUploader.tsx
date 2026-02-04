import React from 'react';
import { Upload, RefreshCw } from 'lucide-react';
import { Button } from '@/components/shared';

interface FileUploaderProps {
  projectId?: string | null;
  filterProjectId: string;
  filesCount: number;
  selectedCount: number;
  isLoading: boolean;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFilterChange: (value: string) => void;
  onRefresh: () => void;
  onUploadClick: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  projectId,
  filterProjectId,
  filesCount,
  selectedCount,
  isLoading,
  isUploading,
  fileInputRef,
  onFilterChange,
  onRefresh,
  onUploadClick,
  onUpload,
  onClear,
}) => {
  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{filesCount > 0 ? `共 ${filesCount} 个文件` : '暂无文件'}</span>
          {selectedCount > 0 && (
            <span className="ml-2 text-banana-600">
              已选择 {selectedCount} 个
            </span>
          )}
          {isLoading && filesCount > 0 && (
            <RefreshCw size={14} className="animate-spin text-gray-400" />
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Project filter dropdown */}
          <select
            value={filterProjectId}
            onChange={(e) => onFilterChange(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-banana-500"
          >
            <option value="all">所有附件</option>
            <option value="none">未归类附件</option>
            {projectId && projectId !== 'global' && projectId !== 'none' && (
              <option value={projectId}>当前项目附件</option>
            )}
          </select>

          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={16} />}
            onClick={onRefresh}
            disabled={isLoading}
          >
            刷新
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={<Upload size={16} />}
            onClick={onUploadClick}
            disabled={isUploading}
          >
            {isUploading ? '上传中...' : '上传文件'}
          </Button>

          {selectedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              清空选择
            </Button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,.heic"
        onChange={onUpload}
        className="hidden"
      />
    </>
  );
};
