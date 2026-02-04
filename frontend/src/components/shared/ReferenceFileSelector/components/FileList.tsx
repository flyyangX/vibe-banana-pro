import React from 'react';
import { FileText, Loader2, CheckCircle2, XCircle, X } from 'lucide-react';
import { type ReferenceFile } from '@/api/endpoints';

interface FileListProps {
  files: ReferenceFile[];
  selectedFiles: Set<string>;
  deletingIds: Set<string>;
  parsingIds: Set<string>;
  isLoading: boolean;
  onSelectFile: (file: ReferenceFile) => void;
  onDeleteFile: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, file: ReferenceFile) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getStatusIcon = (file: ReferenceFile, parsingIds: Set<string>) => {
  if (parsingIds.has(file.id) || file.parse_status === 'parsing') {
    return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
  }
  switch (file.parse_status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return null;
  }
};

const getStatusText = (file: ReferenceFile, parsingIds: Set<string>) => {
  if (parsingIds.has(file.id) || file.parse_status === 'parsing') {
    return '解析中...';
  }
  switch (file.parse_status) {
    case 'pending':
      return '等待解析';
    case 'completed':
      return '解析完成';
    case 'failed':
      return '解析失败';
    default:
      return '';
  }
};

export const FileList: React.FC<FileListProps> = ({
  files,
  selectedFiles,
  deletingIds,
  parsingIds,
  isLoading,
  onSelectFile,
  onDeleteFile,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        <span className="ml-2 text-gray-500">加载中...</span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <FileText className="w-12 h-12 mb-2" />
        <p>暂无参考文件</p>
        <p className="text-sm mt-1">点击"上传文件"按钮添加文件</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {files.map((file) => {
        const isSelected = selectedFiles.has(file.id);
        const isDeleting = deletingIds.has(file.id);
        const isPending = file.parse_status === 'pending';

        return (
          <div
            key={file.id}
            onClick={() => onSelectFile(file)}
            className={`
              p-4 cursor-pointer transition-colors
              ${isSelected ? 'bg-banana-50 border-l-4 border-l-banana-500' : 'hover:bg-gray-50'}
              ${file.parse_status === 'failed' ? 'opacity-60' : ''}
            `}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <div className="flex-shrink-0 mt-1">
                <div
                  className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center
                    ${isSelected
                      ? 'bg-banana-500 border-banana-500'
                      : 'border-gray-300'
                    }
                    ${file.parse_status === 'failed' ? 'opacity-50' : ''}
                  `}
                >
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>

              {/* File icon */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.filename}
                  </p>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatFileSize(file.file_size)}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5 mt-1">
                  {getStatusIcon(file, parsingIds)}
                  <p className="text-xs text-gray-600">
                    {getStatusText(file, parsingIds)}
                    {isPending && (
                      <span className="ml-1 text-orange-500">(确定后解析)</span>
                    )}
                  </p>
                </div>

                {/* Error message */}
                {file.parse_status === 'failed' && file.error_message && (
                  <p className="text-xs text-red-500 mt-1 line-clamp-1">
                    {file.error_message}
                  </p>
                )}

                {/* Image caption warning */}
                {file.parse_status === 'completed' &&
                  typeof file.image_caption_failed_count === 'number' &&
                  file.image_caption_failed_count > 0 && (
                    <p className="text-xs text-orange-500 mt-1">
                      {file.image_caption_failed_count} 张图片未能生成描述
                    </p>
                  )}
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => onDeleteFile(e, file)}
                disabled={isDeleting}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                title="删除文件"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
