import React from 'react';
import { FileText, ImagePlus, Paperclip, Palette } from 'lucide-react';

interface FileUploadZoneProps {
  // Doc upload
  isDocDragOver: boolean;
  setIsDocDragOver: (value: boolean) => void;
  onDocDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDocInputSelect: () => void;
  isUploadingDoc: boolean;
  docUploadProgress: number | null;

  // Image upload
  isImageDragOver: boolean;
  setIsImageDragOver: (value: boolean) => void;
  onImageDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onImageSelect: () => void;
  onOpenMaterialSelector: () => void;
  isUploadingImage: boolean;
  imageUploadProgress: number | null;

  // UI state
  isUploadExpanded: boolean;
  setIsUploadExpanded: (value: boolean) => void;
  isXhs: boolean;

  // Hidden inputs
  docInputRef: React.RefObject<HTMLInputElement>;
  imageInputRef: React.RefObject<HTMLInputElement>;
  docAccept: string;
  imageAccept: string;
  onDocInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  isDocDragOver,
  setIsDocDragOver,
  onDocDrop,
  onDocInputSelect,
  isUploadingDoc,
  docUploadProgress,
  isImageDragOver,
  setIsImageDragOver,
  onImageDrop,
  onImageSelect,
  onOpenMaterialSelector,
  isUploadingImage,
  imageUploadProgress,
  isUploadExpanded,
  setIsUploadExpanded,
  isXhs,
  docInputRef,
  imageInputRef,
  docAccept,
  imageAccept,
  onDocInputChange,
  onImageInputChange,
}) => {
  return (
    <div className="mt-4 mb-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Paperclip size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">上传素材</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsUploadExpanded(prev => !prev)}
          className="sm:hidden text-xs font-medium text-banana-600 hover:text-banana-700 transition-colors"
        >
          {isUploadExpanded ? '收起' : '展开更多'}
        </button>
        <p className="hidden sm:block text-xs text-gray-500">
          文档用于解析内容，图片作为素材参考，不影响风格模板
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 文档上传区 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md p-3 sm:p-4 shadow-sm transition-all">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-2">
              <FileText size={18} className="text-blue-500" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-gray-800">文档参考（会解析）</p>
              <p className={`text-xs text-gray-500 ${isUploadExpanded ? 'block' : 'hidden sm:block'}`}>
                上传 PDF / Word / PPT / 表格等文档，解析内容将用于生成。
              </p>
            </div>
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDocDragOver(true);
            }}
            onDragLeave={() => {
              setIsDocDragOver(false);
            }}
            onDrop={onDocDrop}
            className={`mt-3 rounded-xl border border-dashed px-3 sm:px-4 py-4 sm:py-5 text-center text-xs transition-all ${
              isDocDragOver
                ? 'border-banana-400 bg-banana-50/60 shadow-[0_0_0_2px_rgba(250,204,21,0.25)]'
                : 'border-gray-200 bg-white/60 hover:border-banana-200 hover:bg-white'
            }`}
          >
            <p className="text-gray-600">
              {isDocDragOver ? '松开上传文档' : '拖拽文档到这里上传'}
            </p>
            <p className={`text-gray-400 mt-1 ${isUploadExpanded ? 'block' : 'hidden sm:block'}`}>
              或点击选择文件（支持粘贴）
            </p>
            <button
              type="button"
              onClick={onDocInputSelect}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-banana-400 hover:bg-banana-50 transition-colors"
            >
              <Paperclip size={14} />
              选择文档
            </button>
            {isUploadingDoc && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-banana-700">
                  上传中... {docUploadProgress ?? 0}%
                </p>
                <div className="h-1.5 rounded-full bg-banana-100 overflow-hidden">
                  <div
                    className="h-full bg-banana-400 transition-all"
                    style={{ width: `${docUploadProgress ?? 0}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 图片上传区 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md p-3 sm:p-4 shadow-sm transition-all">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-pink-50 p-2">
              <ImagePlus size={18} className="text-pink-500" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-gray-800">图片素材（不插入输入框）</p>
              <p className={`text-xs text-gray-500 ${isUploadExpanded ? 'block' : 'hidden sm:block'}`}>
                上传图片将加入素材列表，创建项目后自动关联；不会作为风格模板参考。
              </p>
            </div>
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsImageDragOver(true);
            }}
            onDragLeave={() => {
              setIsImageDragOver(false);
            }}
            onDrop={onImageDrop}
            className={`mt-3 rounded-xl border border-dashed px-3 sm:px-4 py-4 sm:py-5 text-center text-xs transition-all ${
              isImageDragOver
                ? 'border-banana-400 bg-banana-50/60 shadow-[0_0_0_2px_rgba(250,204,21,0.25)]'
                : 'border-gray-200 bg-white/60 hover:border-banana-200 hover:bg-white'
            }`}
          >
            <p className="text-gray-600">
              {isImageDragOver ? '松开上传图片' : '拖拽图片到这里上传'}
            </p>
            <p className={`text-gray-400 mt-1 ${isUploadExpanded ? 'block' : 'hidden sm:block'}`}>
              或点击选择图片（支持粘贴）
            </p>
            <div className={`mt-3 flex flex-wrap items-center justify-center gap-2 ${isUploadExpanded ? 'flex' : 'sm:flex'}`}>
              <button
                type="button"
                onClick={onImageSelect}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-banana-400 hover:bg-banana-50 transition-colors"
              >
                <Paperclip size={14} />
                选择图片
              </button>
              <button
                type="button"
                onClick={onOpenMaterialSelector}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-banana-400 hover:bg-banana-50 transition-colors"
              >
                <Palette size={14} />
                从素材库选择
              </button>
            </div>
            {isXhs && (
              <p className={`text-xs text-gray-400 mt-2 ${isUploadExpanded ? 'block' : 'hidden sm:block'}`}>
                小红书默认作为素材图处理，但不会插入到输入内容。
              </p>
            )}
            {isUploadingImage && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-banana-700">
                  上传中... {imageUploadProgress ?? 0}%
                </p>
                <div className="h-1.5 rounded-full bg-banana-100 overflow-hidden">
                  <div
                    className="h-full bg-banana-400 transition-all"
                    style={{ width: `${imageUploadProgress ?? 0}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept={imageAccept}
        onChange={onImageInputChange}
        className="hidden"
      />
      <input
        ref={docInputRef}
        type="file"
        multiple
        accept={docAccept}
        onChange={onDocInputChange}
        className="hidden"
      />
    </div>
  );
};

export default FileUploadZone;
