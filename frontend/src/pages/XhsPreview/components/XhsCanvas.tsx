import React from 'react';
import { Copy, Download, RefreshCw, Maximize2, RotateCcw, Edit2 } from 'lucide-react';
import { Button, Loading, Skeleton } from '@/components/shared';
import type { Material } from '@/api/endpoints';

type XhsAspectRatio = '4:5' | '3:4' | 'auto';

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
    const effectiveRatio = aspectRatio === 'auto' ? '3:4' : aspectRatio;
    switch (effectiveRatio) {
      case '3:4':
        return 'aspect-[3/4]';
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
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 参数 */}
        <div className="bg-white border border-border p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-black text-sm">竖图比例</span>
                <select
                  value={aspectRatio}
                  onChange={(e) => onAspectRatioChange(e.target.value as XhsAspectRatio)}
                  className="px-3 py-1.5 border border-border bg-white text-xs text-black focus:outline-none focus:border-black rounded-none font-mono"
                >
                  <option value="3:4">3:4</option>
                  <option value="4:5">4:5</option>
                  <option value="auto">自动</option>
                </select>
              </div>
              <div className="h-4 w-px bg-gray-200"></div>
              <div className="text-xs text-secondary font-mono">
                张数: {imageCount}
              </div>
            </div>
            
            {progress?.total ? (
              <div className="flex items-center gap-4 flex-1 justify-end">
                <div className="flex flex-col items-end">
                  <div className="text-xs font-bold text-black flex items-center gap-2">
                    <span>进度 {completedCount}/{totalCount}</span>
                    {failedCount > 0 && <span className="text-red-600">({failedCount} 失败)</span>}
                  </div>
                  {isGenerating && generationStartedAt && (
                    <span className="text-[10px] text-gray-400 font-mono">耗时: {formatElapsed(generationStartedAt)}</span>
                  )}
                </div>
                <div className="w-32 h-2 bg-gray-100 border border-gray-200">
                  <div className="h-full bg-black transition-all duration-300 ease-out" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* 文案 */}
        <div className="bg-white border border-border p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-black">文案</div>
            <Button
              variant="outline"
              size="sm"
              icon={<Copy size={14} />}
              onClick={onCopy}
              className="text-xs h-8 rounded-none bg-white hover:bg-black hover:text-white"
            >
              复制
            </Button>
          </div>
          <div>
            {copywritingText ? (
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed bg-gray-50 p-4 border border-border rounded-none">
                {copywritingText}
              </pre>
            ) : (
              <div className="text-sm text-gray-400 italic py-4 text-center border border-dashed border-gray-200 bg-gray-50">
                尚未生成文案，点击右上角"生成图文"。
              </div>
            )}
          </div>
        </div>

        {/* 图片 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
             <div className="text-sm font-bold text-black flex items-center gap-2">
               生成结果 <span className="text-gray-400 font-normal">({xhsDisplayCards.length})</span>
             </div>
          </div>
          
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <Loading message="加载中..." />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {xhsDisplayCards.map((card) => {
                const idx = card.index;
                const label = card.label;
                const imageUrl = card.imageUrl;
                const isCardGenerating = Boolean(regeneratingIndex[idx]);
                const cardElapsedStart = regeneratingStartedAt[idx] || null;
                return (
                  <div key={`xhs-card-${idx}`} className="group bg-white border border-gray-200 hover:border-black hover:shadow-lg transition-all duration-300">
                    <div className={`relative ${aspectRatioClass} bg-gray-50 border-b border-gray-100 overflow-hidden`}>
                      {isCardGenerating ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                          <Skeleton className="w-full h-full absolute inset-0" />
                          <div className="relative z-10 bg-white/80 backdrop-blur px-3 py-1 border border-border">
                            <span className="text-xs font-mono text-black animate-pulse">生成中...</span>
                          </div>
                        </div>
                      ) : imageUrl ? (
                        <div className="relative w-full h-full overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={label}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            onClick={() => {
                              onPreviewImage(imageUrl, label);
                            }}
                            role="button"
                          />
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="text-center">
                             <div className="text-xs text-gray-300 tracking-widest font-bold">暂无图片</div>
                           </div>
                        </div>
                      )}
                      
                      {/* Status Tags */}
                      <div className="absolute top-0 left-0 p-2 flex gap-2 w-full justify-between items-start pointer-events-none">
                         <div className="text-[10px] px-2 py-1 bg-black text-white uppercase tracking-wider font-bold shadow-sm">
                           {String(idx + 1).padStart(2, '0')} {label}
                         </div>
                         {isCardGenerating && cardElapsedStart && (
                           <div className="text-[10px] px-1.5 py-0.5 bg-black/80 text-white font-mono backdrop-blur-sm">
                             {formatElapsed(cardElapsedStart)}
                           </div>
                         )}
                      </div>

                      {/* Actions Overlay */}
                      {!isCardGenerating && (
                         <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-200">
                            <button
                              type="button"
                              onClick={() => {
                                if (!imageUrl) return;
                                onPreviewImage(imageUrl, label);
                              }}
                              className="p-2 bg-white border border-gray-200 hover:border-black hover:bg-black hover:text-white transition-colors shadow-sm"
                              title="预览"
                              disabled={!imageUrl}
                            >
                              <Maximize2 size={14} />
                            </button>
                         </div>
                      )}
                    </div>
                    
                    {/* Bottom Actions Bar */}
                    <div className="p-3 bg-white flex items-center justify-between gap-2">
                       <div className="text-[10px] text-gray-400 font-mono truncate max-w-[50%]">
                         {card.source === 'page' ? '页面' : card.source === 'material' ? '素材' : '待定'}
                       </div>
                       
                       <div className="flex items-center gap-1">
                         <button
                           type="button"
                           onClick={() => onEditCard(idx)}
                           className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                           title="编辑"
                           disabled={isCardGenerating}
                         >
                           <Edit2 size={14} />
                         </button>
                         <button
                           type="button"
                           onClick={() => onLoadVersions(idx)}
                           className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                           title="历史版本"
                           disabled={isCardGenerating}
                         >
                           <RefreshCw size={14} />
                         </button>
                         <button
                           type="button"
                           onClick={() => imageUrl && window.open(imageUrl, '_blank')}
                           className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                           title="下载/打开"
                           disabled={!imageUrl || isCardGenerating}
                         >
                           <Download size={14} />
                         </button>
                         <button
                           type="button"
                           onClick={() => onRegenerateCard(idx)}
                           className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                           title="重新生成"
                           disabled={isCardGenerating}
                         >
                           <RotateCcw size={14} className={isCardGenerating ? 'animate-spin' : ''} />
                         </button>
                       </div>
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
