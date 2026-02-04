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
    <div className="border-t pt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">生成模板套装</h4>
      <p className="text-xs text-gray-500 mb-3">
        选择要生成的模板类型。生成会覆盖已存在的同类型模板。
      </p>
      <div className="flex flex-wrap gap-3 mb-3 text-sm">
        {VARIANT_TYPES.map((item) => (
          <label key={item.key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedVariantTypes.includes(item.key)}
              onChange={() => onToggleVariantType(item.key)}
            />
            {item.label}
          </label>
        ))}
      </div>
      <Textarea
        label="套装额外提示词（可选）"
        placeholder="例如：整体更简洁、留白更多、装饰更少..."
        value={variantsExtraPrompt}
        onChange={(e) => onVariantsExtraPromptChange(e.target.value)}
        rows={3}
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={onGenerateVariants}
        disabled={isGeneratingVariants}
      >
        {isGeneratingVariants ? `生成中... (${formatElapsed(variantGenerateElapsed)})` : '生成模板套装'}
      </Button>

      <div className="mt-4">
        <h5 className="text-xs text-gray-500 mb-2">模板预览</h5>
        <div className="grid grid-cols-4 gap-3">
          {VARIANT_TYPES.map((item) => {
            const url = templateVariants?.[item.key];
            return (
              <button
                type="button"
                key={item.key}
                onClick={() => onOpenVariantModal(item.key)}
                className="aspect-[4/3] rounded border border-gray-200 bg-gray-50 relative overflow-hidden text-left"
              >
                {url ? (
                  <img
                    src={getImageUrl(url)}
                    alt={`${item.label}模板`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                    未生成
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs px-2 py-1">
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
      title="模板单图"
      size="lg"
    >
      <div className="space-y-4">
        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
          {previewVariantType && currentVariantUrl ? (
            <img
              src={getImageUrl(currentVariantUrl)}
              alt={previewVariantType}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
              暂无模板图
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">上传自定义图片替换</div>
          <label className="inline-flex">
            <input
              type="file"
              accept="image/*"
              onChange={handleVariantFileChange}
              className="hidden"
              disabled={isVariantUploading}
            />
            <span className="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer">
              {isVariantUploading ? '上传中...' : '上传替换'}
            </span>
          </label>
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-700">历史版本</div>
            <div className="text-xs text-gray-500">点击切换</div>
          </div>
          {variantHistoryList.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {variantHistoryList.map((url, idx) => {
                const isActive = !!currentVariantUrl && url === currentVariantUrl;
                return (
                  <button
                    key={`${url}-${idx}`}
                    type="button"
                    onClick={() => onSelectVariantHistory(url)}
                    disabled={isVariantSelecting}
                    className={`aspect-[4/3] rounded border overflow-hidden relative ${
                      isActive ? 'border-banana-500 ring-2 ring-banana-200' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={getImageUrl(url)}
                      alt="历史版本"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {isActive && (
                      <div className="absolute inset-0 bg-banana-500/20 flex items-center justify-center text-xs text-white">
                        当前
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-500">暂无历史版本</div>
          )}
        </div>

        <Textarea
          label="单图额外提示词（可选）"
          placeholder="例如：更简洁、留白更多、装饰元素更少..."
          value={variantExtraPrompt}
          onChange={(e) => onVariantExtraPromptChange(e.target.value)}
          rows={3}
        />

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-700">参考图（可选）</div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenMaterialSelector}
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
                <span className="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer">
                  上传参考图
                </span>
              </label>
            </div>
          </div>

          {(variantRefImageUrls.length > 0 || variantUploadedFiles.length > 0) ? (
            <div className="space-y-2">
              {variantRefImageUrls.map((u, idx) => (
                <div key={`${u}-${idx}`} className="flex items-center justify-between text-xs bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <div className="truncate pr-2">{u}</div>
                  <button
                    className="text-gray-500 hover:text-red-600"
                    onClick={() => onRemoveVariantUrl(idx)}
                    type="button"
                  >
                    删除
                  </button>
                </div>
              ))}
              {variantUploadedFiles.map((f, idx) => (
                <div key={`${f.name}-${idx}`} className="flex items-center justify-between text-xs bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <div className="truncate pr-2">{f.name}</div>
                  <button
                    className="text-gray-500 hover:text-red-600"
                    onClick={() => onRemoveVariantFile(idx)}
                    type="button"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500">不选择也可以直接重新生成</div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" onClick={onRegenerate} disabled={isVariantRegenerating}>
            {isVariantRegenerating ? `生成中... (${formatElapsed(variantRegenerateElapsed)})` : 'AI 重新生成'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
