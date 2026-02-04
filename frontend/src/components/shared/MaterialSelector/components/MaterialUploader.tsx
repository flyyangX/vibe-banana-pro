import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface MaterialUploaderProps {
  isUploading: boolean;
  onUpload: (files: File[]) => void;
}

export const MaterialUploader: React.FC<MaterialUploaderProps> = ({ isUploading, onUpload }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onUpload(files);
    // 清空 input 值，以便可以重复选择同一文件
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <label className="inline-block cursor-pointer">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
        <Upload size={16} />
        <span>{isUploading ? '上传中...' : '上传'}</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        className="hidden"
        disabled={isUploading}
      />
    </label>
  );
};
