import React from 'react';
import { Button, Modal, Textarea } from '@/components/shared';
import { getImageUrl } from '@/api/client';
import { formatElapsed } from '../hooks/useTemplateManager';

const VARIANT_TYPES = [
  { key: 'cover', label: '封面' },
  { key: 'content', label: '内容' },
  { key: 'transition', label: '过渡' },
  { key: 'ending', label: '结尾' },
] as const;

interface VariantGeneratorProps {
  selectedVariantTypes: string[];
  onToggleVariantType: (type: string) => void;
  variantsExtraPrompt: string;
  onVariantsExtraPromptChange: (value: string) => void;
  isGeneratingVariants: boolean;
  variantGenerateElapsed: number;
  onGenerateVariants: () => void;
  templateVariants: Record<string, string>;
  onOpenVariantModal: (type: 'cover' | 'content' | 'transition' | 'ending') => void;
}

export const VariantGenerator: React.FC<VariantGeneratorProps> = ({
  selectedVariantTypes,
  onToggleVariantType,
  variantsExtraPrompt,
  onVariantsExtraPromptChange,
  isGeneratingVariants,
  variantGenerateElapsed,
  onGenerateVariants,
  templateVariants,
  onOpenVariantModal,
}) => {
  return (
    <div className="border-t border-border pt-6">
      <h4 className="text-sm font-bold text-primary mb-2">生成模板套装 (Generate Variants)</h4>
      <p className="text-xs text-secondary mb-4 opacity-70">
        选择要生成的模板类型。生成会覆盖已存在的同类型模板。
      </p>
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        {VARIANT_TYPES.map((item) => (
          <label key={item.key} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={selectedVariantTypes.includes(item.key)}
              onChange={() => onToggleVariantType(item.key)}
              className="w-4 h-4 border-gray-300 text-black focus:ring-black accent-black"
            />
            <span className={`transition-colors ${selectedVariantTypes.includes(item.key) ? 'text-primary font-bold' : 'text-secondary group-hover:text-primary'}`}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
      <Textarea
        label="套装额外提示词 (Optional)"
        placeholder="例如：整体更简洁、留白更多、装饰更少..."
        value={variantsExtraPrompt}
        onChange={(e) => onVariantsExtraPromptChange(e.target.value)}
        rows={3}
        className="rounded-none border-border focus:border-black resize-none mb-3"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={onGenerateVariants}
        disabled={isGeneratingVariants}
        className="rounded-none border-black hover:bg-black hover:text-white w-full sm:w-auto"
      >
        {isGeneratingVariants ? `生成中... (${formatElapsed(variantGenerateElapsed)})` : '生成模板套装'}
      </Button>

      <div className="mt-6">
        <h5 className="text-xs font-bold text-secondary mb-3 uppercase tracking-wide">模板预览 (Preview)</h5>
        <div className="grid grid-cols-4 gap-3">
          {VARIANT_TYPES.map((item) => {
            const url = templateVariants?.[item.key];
            return (
              <button
                type="button"
                key={item.key}
                onClick={() => onOpenVariantModal(item.key)}
                className="aspect-[4/3] border border-border bg-gray-50 relative overflow-hidden text-left hover:border-black transition-colors group"
              >
                {url ? (
                  <img
                    src={getImageUrl(url)}
                    alt={`${item.label}模板`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-secondary opacity-50 font-serif italic">
                    Not Generated
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black text-white text-[10px] px-2 py-1 uppercase tracking-wider font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface VariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewVariantType: 'cover' | 'content' | 'transition' | 'ending' | null;
  currentVariantUrl?: string;
  variantHistoryList: string[];
  variantExtraPrompt: string;
  onVariantExtraPromptChange: (value: string) => void;
  variantRefImageUrls: string[];
  variantUploadedFiles: File[];
  isVariantUploading: boolean;
  isVariantSelecting: boolean;
  isVariantRegenerating: boolean;
  variantRegenerateElapsed: number;
  onVariantUpload: (file: File) => void;
  onSelectVariantHistory: (url: string) => void;
  onAddVariantFiles: (files: File[]) => void;
  onRemoveVariantFile: (index: number) => void;
  onRemoveVariantUrl: (index: number) => void;
  onOpenMaterialSelector: () => void;
  onRegenerate: () => void;
}

export const VariantModal: React.FC<VariantModalProps> = ({
  isOpen,
  onClose,
  previewVariantType,
  currentVariantUrl,
  variantHistoryList,
  variantExtraPrompt,
  onVariantExtraPromptChange,
  variantRefImageUrls,
  variantUploadedFiles,
  isVariantUploading,
  isVariantSelecting,
  isVariantRegenerating,
  variantRegenerateElapsed,
  onVariantUpload,
  onSelectVariantHistory,
  onAddVariantFiles,
  onRemoveVariantFile,
  onRemoveVariantUrl,
  onOpenMaterialSelector,
  onRegenerate,
}) => {
  const handleVariantFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onVariantUpload(file);
    }
    e.target.value = '';
  };

  const handleVariantAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onAddVariantFiles(files);
    }
    e.target.value = '';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="模板单图编辑"
      size="lg"
    >
      <div className="space-y-6">
        <div className="aspect-video bg-gray-100 border border-border overflow-hidden flex items-center justify-center">
          {previewVariantType && currentVariantUrl ? (
            <img
              src={getImageUrl(currentVariantUrl)}
              alt={previewVariantType}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-sm text-secondary font-serif italic opacity-50">
              暂无模板图
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="text-sm font-bold text-primary">上传自定义图片替换</div>
          <label className="inline-flex">
            <input
              type="file"
              accept="image/*"
              onChange={handleVariantFileChange}
              className="hidden"
              disabled={isVariantUploading}
            />
            <span className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-colors cursor-pointer">
              {isVariantUploading ? 'Uploading...' : 'Upload & Replace'}
            </span>
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-primary">历史版本 (History)</div>
            <div className="text-xs text-secondary italic">点击切换版本</div>
          </div>
          {variantHistoryList.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {variantHistoryList.map((url, idx) => {
                const isActive = !!currentVariantUrl && url === currentVariantUrl;
                return (
                  <button
                    key={`${url}-${idx}`}
                    type="button"
                    onClick={() => onSelectVariantHistory(url)}
                    disabled={isVariantSelecting}
                    className={`aspect-[4/3] border overflow-hidden relative transition-all ${
                      isActive ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-black'
                    }`}
                  >
                    <img
                      src={getImageUrl(url)}
                      alt="历史版本"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {isActive && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px] uppercase font-bold text-white tracking-wider">
                        Current
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-secondary opacity-50 bg-gray-50 p-2 border border-border border-dashed text-center">暂无历史版本</div>
          )}
        </div>

        <Textarea
          label="单图额外提示词 (Optional)"
          placeholder="例如：更简洁、留白更多、装饰元素更少..."
          value={variantExtraPrompt}
          onChange={(e) => onVariantExtraPromptChange(e.target.value)}
          rows={3}
          className="rounded-none border-border focus:border-black resize-none"
        />

        <div className="bg-white border border-border p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-primary">参考图 (References)</div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenMaterialSelector}
                className="text-xs rounded-none hover:bg-gray-100"
              >
                从素材库选择
              </Button>
              <label className="inline-flex">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleVariantAddFiles}
                />
                <span className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold border border-black bg-white hover:bg-black hover:text-white transition-colors cursor-pointer uppercase tracking-wider">
                  Add Images
                </span>
              </label>
            </div>
          </div>

          {(variantRefImageUrls.length > 0 || variantUploadedFiles.length > 0) ? (
            <div className="space-y-2">
              {variantRefImageUrls.map((u, idx) => (
                <div key={`${u}-${idx}`} className="flex items-center justify-between text-xs bg-gray-50 border border-border px-3 py-2">
                  <div className="truncate pr-2 font-mono">{u}</div>
                  <button
                    className="text-secondary hover:text-red-600 font-bold uppercase text-[10px]"
                    onClick={() => onRemoveVariantUrl(idx)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {variantUploadedFiles.map((f, idx) => (
                <div key={`${f.name}-${idx}`} className="flex items-center justify-between text-xs bg-gray-50 border border-border px-3 py-2">
                  <div className="truncate pr-2 font-mono">{f.name}</div>
                  <button
                    className="text-secondary hover:text-red-600 font-bold uppercase text-[10px]"
                    onClick={() => onRemoveVariantFile(idx)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-secondary opacity-50 italic">
              AI 可以参考这些图片生成新的设计
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} className="rounded-none hover:bg-gray-100">
            取消
          </Button>
          <Button variant="primary" onClick={onRegenerate} disabled={isVariantRegenerating} className="bg-black text-white rounded-none hover:bg-gray-800 px-6">
            {isVariantRegenerating ? `生成中... (${formatElapsed(variantRegenerateElapsed)})` : 'AI 重新生成'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
