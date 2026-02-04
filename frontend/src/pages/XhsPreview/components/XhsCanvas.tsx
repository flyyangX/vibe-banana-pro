import React from 'react';
import { Copy, Download, RefreshCw, Maximize2, RotateCcw, Edit2 } from 'lucide-react';
import { Button, Loading, Skeleton } from '@/components/shared';
import type { Material } from '@/api/endpoints';

type XhsAspectRatio = '4:5' | '3:4' | '9:16';

type MaterialWithNote = Material & {
  noteData?: {
    type?: string;
    mode?: string;
    index?: number;
    role?: string;
    aspect_ratio?: string;
  };
};

type XhsDisplayCard = {
  index: number;
  label: string;
  imageUrl: string | null;
  source: 'page' | 'material' | 'none';
  pageId?: string;
  material?: MaterialWithNote;
  sizeLabel?: string;
};

export interface XhsCanvasProps {
  projectId: string;
  aspectRatio: XhsAspectRatio;
  imageCount: number;
  isLoading: boolean;
  isGenerating: boolean;
  progress: { total?: number; completed?: number; failed?: number } | null;
  generationStartedAt: number | null;
  xhsDisplayCards: XhsDisplayCard[];
  regeneratingIndex: Record<number, boolean>;
  regeneratingStartedAt: Record<number, number>;
  copywritingText: string;
  onAspectRatioChange: (ratio: XhsAspectRatio) => void;
  onCopy: () => void;
  onPreviewImage: (url: string, title: string) => void;
  onEditCard: (index: number) => void;
  onLoadVersions: (index: number) => void;
  onRegenerateCard: (index: number) => void;
  formatElapsed: (start?: number | null) => string;
}

export const XhsCanvas: React.FC<XhsCanvasProps> = ({
  aspectRatio,
  imageCount,
  isLoading,
  isGenerating,
  progress,
  generationStartedAt,
  xhsDisplayCards,
  regeneratingIndex,
  regeneratingStartedAt,
  copywritingText,
  onAspectRatioChange,
  onCopy,
  onPreviewImage,
  onEditCard,
  onLoadVersions,
  onRegenerateCard,
  formatElapsed,
}) => {
  const aspectRatioClass = (() => {
    switch (aspectRatio) {
      case '3:4':
        return 'aspect-[3/4]';
      case '9:16':
        return 'aspect-[9/16]';
      case '4:5':
      default:
        return 'aspect-[4/5]';
    }
  })();

  const totalCount = progress?.total || imageCount;
  const completedCount = progress?.completed || 0;
  const failedCount = progress?.failed || 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 参数 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">竖图比例：</span>
              <select
                value={aspectRatio}
                onChange={(e) => onAspectRatioChange(e.target.value as XhsAspectRatio)}
                className="px-2 py-1 border border-gray-200 rounded text-xs"
              >
                <option value="4:5">4:5</option>
                <option value="3:4">3:4</option>
                <option value="9:16">9:16</option>
              </select>
            </div>
            <div className="text-xs text-gray-500">
              张数：{imageCount}（由编辑页页面数决定）
            </div>
            {progress?.total ? (
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span>进度 {completedCount}/{totalCount} {failedCount ? `(失败 ${failedCount})` : ''}</span>
                {isGenerating && generationStartedAt ? (
                  <span className="text-gray-400">已运行 {formatElapsed(generationStartedAt)}</span>
                ) : null}
              </div>
            ) : null}
          </div>
          {progress?.total ? (
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-banana-500 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          ) : null}
        </div>

        {/* 文案 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-800">文案</div>
            <Button
              variant="ghost"
              size="sm"
              icon={<Copy size={16} />}
              onClick={onCopy}
            >
              复制
            </Button>
          </div>
          {copywritingText ? (
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">
              {copywritingText}
            </pre>
          ) : (
            <div className="text-sm text-gray-500">尚未生成文案，点击右上角"生成图文"。</div>
          )}
        </div>

        {/* 图片 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="text-sm font-semibold text-gray-800 mb-3">图片（竖版轮播）</div>
          {isLoading ? (
            <div className="py-10">
              <Loading message="加载中..." />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {xhsDisplayCards.map((card) => {
                const idx = card.index;
                const label = card.label;
                const imageUrl = card.imageUrl;
                const isCardGenerating = Boolean(regeneratingIndex[idx]);
                const cardElapsedStart = regeneratingStartedAt[idx] || null;
                return (
                  <div key={`xhs-card-${idx}`} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className={`relative ${aspectRatioClass} bg-gray-50`}>
                      {isCardGenerating ? (
                        <Skeleton className="w-full h-full" />
                      ) : imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={label}
                          className="w-full h-full object-cover"
                          onClick={() => {
                            onPreviewImage(imageUrl, label);
                          }}
                          role="button"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                          暂无图片
                        </div>
                      )}
                      <div className="absolute top-2 left-2 text-xs px-2 py-1 rounded bg-white/80 border border-gray-200">
                        {label}
                      </div>
                      {isCardGenerating && cardElapsedStart && (
                        <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded bg-black/60 text-white">
                          ⏱ {formatElapsed(cardElapsedStart)}
                        </div>
                      )}
                      {!isCardGenerating && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!imageUrl) return;
                            onPreviewImage(imageUrl, label);
                          }}
                          className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-white/80 border border-gray-200 hover:bg-white disabled:opacity-60"
                          title="放大预览"
                          disabled={!imageUrl}
                        >
                          <Maximize2 size={14} />
                        </button>
                      )}
                      <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white/80 border border-gray-200 rounded px-2 py-0.5">
                        {isCardGenerating
                          ? '生成中'
                          : imageUrl ? '已生成' : '未生成'}
                      </div>
                    </div>
                    <div className="p-2 flex items-center justify-between">
                      <div className="text-xs text-gray-600 truncate pr-2">
                        {card.source === 'page' ? '页面图片' : card.source === 'material' ? (card.material?.display_name || card.material?.filename) : '等待生成'}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditCard(idx)}
                          className="text-gray-600 hover:text-banana-600 disabled:opacity-50"
                          title="编辑"
                          disabled={isCardGenerating}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onLoadVersions(idx)}
                          className="text-gray-600 hover:text-banana-600 disabled:opacity-50"
                          title="历史版本"
                          disabled={isCardGenerating}
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => imageUrl && window.open(imageUrl, '_blank')}
                          className="text-gray-600 hover:text-banana-600 disabled:opacity-50"
                          title="下载/打开"
                          disabled={!imageUrl || isCardGenerating}
                        >
                          <Download size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRegenerateCard(idx)}
                          className="text-gray-600 hover:text-banana-600 disabled:opacity-50"
                          title="重新生成"
                          disabled={isCardGenerating}
                        >
                          <RotateCcw size={16} className={isCardGenerating ? 'animate-spin' : ''} />
                        </button>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 px-2 py-2 text-[11px] text-gray-500">
                      参考图可在「编辑」里选择（模板 / 描述图片 / 上传图片 / 素材库）。
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
