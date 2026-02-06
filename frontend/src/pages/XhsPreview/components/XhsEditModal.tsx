import React, { useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button, Modal, Textarea } from '@/components/shared';

type XhsAspectRatio = '4:5' | '3:4' | 'auto';
type TemplateUsageMode = 'auto' | 'template' | 'style';

export interface XhsEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editIndex: number | null;
  editImageUrl: string | null;
  aspectRatio: XhsAspectRatio;
  hasTemplateResource: boolean;
  editDescImageUrls: string[];
  selectedDescImageUrls: string[];
  editUploadedFiles: File[];
  editInstruction: string;
  editTemplateUsageMode: TemplateUsageMode;
  isSubmittingEdit: boolean;
  onEditInstructionChange: (value: string) => void;
  onEditTemplateUsageModeChange: (mode: TemplateUsageMode) => void;
  onSelectedDescImageUrlsChange: (urls: string[]) => void;
  onEditUploadedFilesChange: (files: File[]) => void;
  onOpenMaterialSelector: () => void;
  onSubmitEdit: () => void;
  showToast: (options: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export const XhsEditModal: React.FC<XhsEditModalProps> = ({
  isOpen,
  onClose,
  editIndex,
  editImageUrl,
  aspectRatio,
  hasTemplateResource,
  editDescImageUrls,
  selectedDescImageUrls,
  editUploadedFiles,
  editInstruction,
  editTemplateUsageMode,
  isSubmittingEdit,
  onEditInstructionChange,
  onEditTemplateUsageModeChange,
  onSelectedDescImageUrlsChange,
  onEditUploadedFilesChange,
  onOpenMaterialSelector,
  onSubmitEdit,
  showToast,
}) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isRegionSelectionMode, setIsRegionSelectionMode] = useState(false);
  const [isSelectingRegion, setIsSelectingRegion] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const aspectRatioClass = (() => {
    const effectiveRatio = aspectRatio === 'auto' ? '3:4' : aspectRatio;
    switch (effectiveRatio) {
      case '3:4':
        return 'aspect-[3/4]';
      case '4:5':
      default:
        return 'aspect-[4/5]';
    }
  })();

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
      if (width < 10 || height < 10) {
        return;
      }
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
        onEditUploadedFilesChange([...editUploadedFiles, file]);
        showToast({ message: '已将选中区域添加为参考图片', type: 'success' });
      }, 'image/png');
    } catch (error) {
      showToast({ message: '裁剪失败，请手动上传参考图', type: 'error' });
    }
  };

  const handleEditAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    onEditUploadedFilesChange([...editUploadedFiles, ...files]);
    e.target.value = '';
  };

  const removeEditFile = (index: number) => {
    onEditUploadedFilesChange(editUploadedFiles.filter((_, i) => i !== index));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editIndex !== null ? `编辑第 ${editIndex + 1} 张` : '编辑卡片'}
      size="lg"
    >
      <div className="space-y-4">
        <div
          className={`relative ${aspectRatioClass} bg-gray-100 border border-border overflow-hidden`}
          onMouseDown={handleSelectionMouseDown}
          onMouseMove={handleSelectionMouseMove}
          onMouseUp={handleSelectionMouseUp}
          onMouseLeave={handleSelectionMouseUp}
        >
          {editImageUrl ? (
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
                  className="px-2 py-1 bg-white hover:bg-black hover:text-white transition-colors text-[10px] text-primary shadow-sm flex items-center gap-1 border border-black"
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
                    className="px-2 py-1 bg-white hover:bg-red-500 hover:text-white transition-colors text-[10px] text-primary shadow-sm border border-black"
                  >
                    清除选区
                  </button>
                )}
              </div>
              <img
                ref={imageRef}
                src={editImageUrl}
                alt="xhs-card"
                className="w-full h-full object-contain select-none bg-white"
                draggable={false}
                crossOrigin="anonymous"
              />
              {selectionRect && (
                <div
                  className="absolute border-2 border-primary bg-black/10 pointer-events-none"
                  style={{
                    left: selectionRect.left,
                    top: selectionRect.top,
                    width: selectionRect.width,
                    height: selectionRect.height,
                  }}
                />
              )}
              {isRegionSelectionMode && (
                <div className="absolute bottom-2 left-2 text-[10px] text-white bg-black/80 px-2 py-1 border border-white/20">
                  可多次拖拽选区，选中区域会加入下方"参考图"
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-secondary opacity-50 font-serif italic">
              暂无图片可编辑
            </div>
          )}
        </div>

        {editDescImageUrls.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-primary">描述中的图片（可选）</div>
            <div className="grid grid-cols-3 gap-2">
              {editDescImageUrls.map((url, idx) => (
                <button
                  type="button"
                  key={`${url}-${idx}`}
                  onClick={() => {
                    if (selectedDescImageUrls.includes(url)) {
                      onSelectedDescImageUrlsChange(selectedDescImageUrls.filter((u) => u !== url));
                    } else {
                      onSelectedDescImageUrlsChange([...selectedDescImageUrls, url]);
                    }
                  }}
                  className={`relative border-2 overflow-hidden bg-white hover:opacity-90 transition-opacity ${
                    selectedDescImageUrls.includes(url) ? 'border-primary ring-1 ring-primary' : 'border-transparent'
                  }`}
                >
                  <img src={url} alt="desc" className="w-full h-20 object-cover" />
                  {selectedDescImageUrls.includes(url) && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-xs text-white font-bold tracking-wide">
                      SELECTED
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasTemplateResource && (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="xhs-use-template"
              checked={editTemplateUsageMode === 'template'}
              onChange={(e) => onEditTemplateUsageModeChange(e.target.checked ? 'template' : 'style')}
              className="w-4 h-4 text-black border-2 border-gray-300 rounded-none focus:ring-0"
            />
            <label htmlFor="xhs-use-template" className="text-sm text-primary cursor-pointer font-medium">
              使用模板图片作为参考
            </label>
          </div>
        )}

        <Textarea
          label="编辑指令"
          placeholder="例如：减少装饰、增加数据图标、字体更简洁..."
          value={editInstruction}
          onChange={(e) => onEditInstructionChange(e.target.value)}
          rows={3}
          className="rounded-none border-border focus:border-black resize-none"
        />

        <div className="bg-white border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-primary">上传图片（可选）</div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onOpenMaterialSelector} className="rounded-none hover:bg-gray-100">
                从素材库选择
              </Button>
              <label className="inline-flex">
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleEditAddFiles} />
                <span className="inline-flex items-center justify-center px-3 py-1.5 text-sm border border-black bg-white hover:bg-black hover:text-white cursor-pointer transition-colors">
                  上传图片
                </span>
              </label>
            </div>
          </div>
          {editUploadedFiles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {editUploadedFiles.map((f, idx) => (
                <div key={`${f.name}-${idx}`} className="relative group">
                  <img
                    src={URL.createObjectURL(f)}
                    alt={`upload-${idx}`}
                    className="w-20 h-20 object-cover border border-border"
                  />
                  <button
                    className="absolute -top-1 -right-1 w-5 h-5 bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    onClick={() => removeEditFile(idx)}
                    type="button"
                  >
                    <span className="text-xs">×</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-secondary opacity-60">可不选；也可以用「区域选图」把当前图的一部分加入参考。</div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isSubmittingEdit} className="rounded-none hover:bg-gray-100">
            取消
          </Button>
          <Button
            variant="primary"
            onClick={onSubmitEdit}
            disabled={!editInstruction.trim() || isSubmittingEdit}
            className="bg-primary text-white hover:bg-black rounded-none px-6"
          >
            {isSubmittingEdit ? '提交中...' : '开始编辑'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
