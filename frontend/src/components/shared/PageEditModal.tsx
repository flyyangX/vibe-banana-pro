import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Upload, X, Sparkles, Image as ImageIcon, ImagePlus } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import { Textarea } from './Textarea';

export type TemplateUsageMode = 'auto' | 'template' | 'style';

export type ToastFn = (options: { message: string; type: 'success' | 'error' | 'info' }) => void;

export interface PageEditModalProps {
  isOpen: boolean;
  onClose: () => void;

  title: string;

  imageUrl: string | null;
  previewAspectRatio: string; // e.g. "16:9" | "4:5"

  // Outline (optional)
  showOutline: boolean;
  outlineTitle: string;
  outlinePointsText: string;
  isOutlineExpanded: boolean;
  onOutlineTitleChange: (value: string) => void;
  onOutlinePointsTextChange: (value: string) => void;
  onToggleOutlineExpanded: () => void;

  // Description (optional)
  showDescription: boolean;
  descriptionText: string;
  isDescriptionExpanded: boolean;
  onDescriptionTextChange: (value: string) => void;
  onToggleDescriptionExpanded: () => void;

  // Context images
  templateUsageMode: TemplateUsageMode;
  onTemplateUsageModeChange: (mode: TemplateUsageMode) => void;
  hasTemplateResource: boolean;
  templatePreviewUrl?: string | null;

  descImageCandidates: string[];
  selectedDescImageUrls: string[];
  onSelectedDescImageUrlsChange: (urls: string[]) => void;

  uploadedFiles: File[];
  onUploadedFilesChange: (files: File[]) => void;
  onOpenMaterialSelector: () => void;

  // Edit instruction
  editInstruction: string;
  onEditInstructionChange: (value: string) => void;

  isSubmitting: boolean;
  submitText: string;
  onSubmit: () => void;

  // Optional "save only"
  showSaveOnly?: boolean;
  saveOnlyText?: string;
  onSaveOnly?: () => void;

  toast?: ToastFn;
}

const toAspectRatioStyle = (ratio: string) => {
  const r = (ratio || '').trim();
  if (!r) return undefined;
  const parts = r.split(':').map((x) => x.trim()).filter(Boolean);
  if (parts.length === 2) {
    return `${parts[0]} / ${parts[1]}`;
  }
  return r.includes('/') ? r : undefined;
};

export const PageEditModal: React.FC<PageEditModalProps> = ({
  isOpen,
  onClose,
  title,
  imageUrl,
  previewAspectRatio,

  showOutline,
  outlineTitle,
  outlinePointsText,
  isOutlineExpanded,
  onOutlineTitleChange,
  onOutlinePointsTextChange,
  onToggleOutlineExpanded,

  showDescription,
  descriptionText,
  isDescriptionExpanded,
  onDescriptionTextChange,
  onToggleDescriptionExpanded,

  templateUsageMode,
  onTemplateUsageModeChange,
  hasTemplateResource,
  templatePreviewUrl,

  descImageCandidates,
  selectedDescImageUrls,
  onSelectedDescImageUrlsChange,

  uploadedFiles,
  onUploadedFilesChange,
  onOpenMaterialSelector,

  editInstruction,
  onEditInstructionChange,
  isSubmitting,
  submitText,
  onSubmit,

  showSaveOnly = false,
  saveOnlyText = '仅保存大纲/描述',
  onSaveOnly,

  toast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [isRegionSelectionMode, setIsRegionSelectionMode] = useState(false);
  const [isSelectingRegion, setIsSelectingRegion] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const previewAspectStyle = useMemo(() => toAspectRatioStyle(previewAspectRatio) || '16 / 9', [previewAspectRatio]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    onUploadedFilesChange([...uploadedFiles, ...files]);
    e.target.value = '';
  };

  const removeUploadedFile = (index: number) => {
    onUploadedFilesChange(uploadedFiles.filter((_, i) => i !== index));
  };

  const toggleDescImage = (url: string) => {
    if (selectedDescImageUrls.includes(url)) {
      onSelectedDescImageUrlsChange(selectedDescImageUrls.filter((u) => u !== url));
    } else {
      onSelectedDescImageUrlsChange([...selectedDescImageUrls, url]);
    }
  };

  const handleSelectionMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRegionSelectionMode || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    setIsSelectingRegion(true);
    setSelectionStart({ x, y });
    setSelectionRect(null);
  };

  const handleSelectionMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRegionSelectionMode || !isSelectingRegion || !selectionStart || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const clampedX = Math.max(0, Math.min(x, rect.width));
    const clampedY = Math.max(0, Math.min(y, rect.height));
    const left = Math.min(selectionStart.x, clampedX);
    const top = Math.min(selectionStart.y, clampedY);
    const width = Math.abs(clampedX - selectionStart.x);
    const height = Math.abs(clampedY - selectionStart.y);
    setSelectionRect({ left, top, width, height });
  };

  const handleSelectionMouseUp = async () => {
    if (!isRegionSelectionMode || !isSelectingRegion || !selectionRect || !imageRef.current) {
      setIsSelectingRegion(false);
      setSelectionStart(null);
      return;
    }
    setIsSelectingRegion(false);
    setSelectionStart(null);
    try {
      const img = imageRef.current;
      const { left, top, width, height } = selectionRect;
      if (width < 10 || height < 10) return;

      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      const displayWidth = img.clientWidth;
      const displayHeight = img.clientHeight;
      if (!naturalWidth || !naturalHeight || !displayWidth || !displayHeight) return;

      const scaleX = naturalWidth / displayWidth;
      const scaleY = naturalHeight / displayHeight;
      const sx = left * scaleX;
      const sy = top * scaleY;
      const sWidth = width * scaleX;
      const sHeight = height * scaleY;

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sWidth));
      canvas.height = Math.max(1, Math.round(sHeight));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], `crop-${Date.now()}.png`, { type: 'image/png' });
        onUploadedFilesChange([...uploadedFiles, file]);
        toast?.({ message: '已将选中区域添加为参考图片', type: 'success' });
      }, 'image/png');
    } catch {
      toast?.({ message: '裁剪失败，请手动上传参考图', type: 'error' });
    }
  };

  const templatePreview = hasTemplateResource && templatePreviewUrl ? (
    <img src={templatePreviewUrl} alt="Template" className="w-16 h-10 object-cover rounded border border-gray-300" />
  ) : null;

  const templateHint = useMemo(() => {
    if (!hasTemplateResource) return '当前项目未配置模板';
    if (templateUsageMode === 'template') return '本次编辑会将模板图片作为参考图';
    if (templateUsageMode === 'style') return '本次编辑不会使用模板图片';
    return '自动：有模板则使用模板作为参考';
  }, [hasTemplateResource, templateUsageMode]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        {/* 图片（支持区域选图并裁剪为参考图） */}
        <div
          className="bg-gray-100 rounded-lg overflow-hidden relative"
          style={{ aspectRatio: previewAspectStyle }}
          onMouseDown={handleSelectionMouseDown}
          onMouseMove={handleSelectionMouseMove}
          onMouseUp={handleSelectionMouseUp}
          onMouseLeave={handleSelectionMouseUp}
        >
          {imageUrl ? (
            <>
              <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsRegionSelectionMode((prev) => !prev);
                    setSelectionStart(null);
                    setSelectionRect(null);
                    setIsSelectingRegion(false);
                  }}
                  className="px-2 py-1 rounded bg-white/80 text-[10px] text-gray-700 hover:bg-banana-50 shadow-sm flex items-center gap-1"
                >
                  <Sparkles size={12} />
                  <span>{isRegionSelectionMode ? '结束区域选图' : '区域选图'}</span>
                </button>
                {selectionRect && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectionRect(null);
                      setSelectionStart(null);
                      setIsSelectingRegion(false);
                    }}
                    className="px-2 py-1 rounded bg-white/80 text-[10px] text-gray-700 hover:bg-banana-50 shadow-sm"
                  >
                    清除选区
                  </button>
                )}
              </div>

              <img
                ref={imageRef}
                src={imageUrl}
                alt="preview"
                className="w-full h-full object-contain select-none"
                draggable={false}
                crossOrigin="anonymous"
              />

              {selectionRect && (
                <div
                  className="absolute border-2 border-banana-500 bg-banana-400/10 pointer-events-none"
                  style={{
                    left: selectionRect.left,
                    top: selectionRect.top,
                    width: selectionRect.width,
                    height: selectionRect.height,
                  }}
                />
              )}

              {isRegionSelectionMode && (
                <div className="absolute bottom-2 left-2 text-[10px] text-gray-600 bg-white/80 border border-gray-200 rounded px-2 py-1">
                  可多次拖拽选区，选中区域会加入下方“上传图片”
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
              暂无图片可编辑
            </div>
          )}
        </div>

        {/* 大纲内容 - 可编辑 */}
        {showOutline && (
          <div className="bg-gray-50 rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={onToggleOutlineExpanded}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <h4 className="text-sm font-semibold text-gray-700">页面大纲（可编辑）</h4>
              {isOutlineExpanded ? (
                <ChevronUp size={18} className="text-gray-500" />
              ) : (
                <ChevronDown size={18} className="text-gray-500" />
              )}
            </button>
            {isOutlineExpanded && (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">标题</label>
                  <input
                    type="text"
                    value={outlineTitle}
                    onChange={(e) => onOutlineTitleChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-500"
                    placeholder="输入页面标题"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">要点（每行一个）</label>
                  <textarea
                    value={outlinePointsText}
                    onChange={(e) => onOutlinePointsTextChange(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-500 resize-none"
                    placeholder="每行输入一个要点"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 描述内容 - 可编辑 */}
        {showDescription && (
          <div className="bg-blue-50 rounded-lg border border-blue-200">
            <button
              type="button"
              onClick={onToggleDescriptionExpanded}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100 transition-colors"
            >
              <h4 className="text-sm font-semibold text-gray-700">页面描述（可编辑）</h4>
              {isDescriptionExpanded ? (
                <ChevronUp size={18} className="text-gray-500" />
              ) : (
                <ChevronDown size={18} className="text-gray-500" />
              )}
            </button>
            {isDescriptionExpanded && (
              <div className="px-4 pb-4">
                <textarea
                  value={descriptionText}
                  onChange={(e) => onDescriptionTextChange(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-500 resize-none"
                  placeholder="输入页面的详细描述内容"
                />
              </div>
            )}
          </div>
        )}

        {/* 上下文图片选择 */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">选择上下文图片（可选）</h4>

          {/* Template 模式 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <ImageIcon size={16} className="text-gray-500" />
                <span>模板参考</span>
              </label>
              {templatePreview}
            </div>
            <select
              value={templateUsageMode}
              onChange={(e) => onTemplateUsageModeChange(e.target.value as TemplateUsageMode)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-banana-500 focus:outline-none focus:ring-2 focus:ring-banana-200"
              disabled={!hasTemplateResource}
            >
              <option value="auto">自动（推荐）</option>
              <option value="template">优先使用模板图片</option>
              <option value="style">仅使用风格描述</option>
            </select>
            <div className="text-xs text-gray-500">{templateHint}</div>
          </div>

          {/* 描述中的图片 */}
          {descImageCandidates.length > 0 ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">描述中的图片：</label>
              <div className="grid grid-cols-3 gap-2">
                {descImageCandidates.map((url, idx) => (
                  <button
                    type="button"
                    key={`${url}-${idx}`}
                    onClick={() => toggleDescImage(url)}
                    className={`relative border-2 rounded overflow-hidden ${
                      selectedDescImageUrls.includes(url) ? 'border-banana-500' : 'border-gray-200'
                    }`}
                  >
                    <img src={url} alt={`desc-${idx}`} className="w-full h-20 object-cover" />
                    {selectedDescImageUrls.includes(url) && (
                      <div className="absolute inset-0 bg-banana-500/20 flex items-center justify-center text-xs text-white">
                        已选择
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* 上传图片 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">上传图片：</label>
              <Button variant="ghost" size="sm" icon={<ImagePlus size={16} />} onClick={onOpenMaterialSelector}>
                从素材库选择
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="relative group">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Uploaded ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeUploadedFile(idx)}
                    className="no-min-touch-target absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-banana-500 transition-colors">
                <Upload size={20} className="text-gray-400 mb-1" />
                <span className="text-xs text-gray-500">上传</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>
        </div>

        {/* 编辑框 */}
        <Textarea
          label="编辑指令"
          placeholder="例如：减少装饰、增加数据图标、字体更简洁..."
          value={editInstruction}
          onChange={(e) => onEditInstructionChange(e.target.value)}
          rows={4}
        />

        <div className="flex justify-between gap-3">
          {showSaveOnly ? (
            <Button
              variant="secondary"
              onClick={() => {
                onSaveOnly?.();
                onClose();
              }}
              disabled={isSubmitting}
            >
              {saveOnlyText}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              取消
            </Button>
            <Button variant="primary" onClick={onSubmit} disabled={!editInstruction.trim() || isSubmitting}>
              {isSubmitting ? '提交中...' : submitText}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

