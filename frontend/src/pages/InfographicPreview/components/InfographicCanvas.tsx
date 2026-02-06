import React from 'react';
import { Button, Loading, Skeleton } from '@/components/shared';
import { getImageUrl } from '@/api/client';
import type { MaterialWithNote } from '../hooks/useInfographicState';

interface InfographicCanvasProps {
  isLoading: boolean;
  isGenerating: boolean;
  editingMaterialIds?: string[];
  displayMaterials: MaterialWithNote[];
  mode: 'single' | 'series';
  aspectRatio: string;
  resolution: string;
  progress: { total?: number; completed?: number } | null;
  onAspectRatioChange: (value: string) => void;
  onResolutionChange: (value: string) => void;
  onEditMaterial: (material: MaterialWithNote) => void;
  onOpenVersions: (material: MaterialWithNote) => void;
}

export const InfographicCanvas: React.FC<InfographicCanvasProps> = ({
  isLoading,
  isGenerating,
  editingMaterialIds = [],
  displayMaterials,
  mode,
  aspectRatio,
  resolution,
  progress,
  onAspectRatioChange,
  onResolutionChange,
  onEditMaterial,
  onOpenVersions,
}) => {
  const effectiveAspectRatio = aspectRatio === 'auto' ? '16:9' : aspectRatio;
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-secondary">
          <span className="font-bold text-primary">预览</span>
          {progress?.total ? (
            <span className="text-xs text-secondary opacity-70">
              进度 {progress?.completed || 0}/{progress?.total}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-secondary">
          <div className="flex items-center gap-2">
            <span className="font-medium text-primary">比例：</span>
            <select
              value={aspectRatio}
              onChange={(e) => onAspectRatioChange(e.target.value)}
              className="px-2 py-1 border border-border bg-white text-xs text-primary focus:outline-none focus:border-black"
            >
              <option value="auto">自动</option>
              <option value="1:1">1:1</option>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="4:3">4:3</option>
              <option value="3:4">3:4</option>
              <option value="3:2">3:2</option>
              <option value="2:3">2:3</option>
              <option value="5:4">5:4</option>
              <option value="4:5">4:5</option>
              <option value="21:9">21:9</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-primary">分辨率：</span>
            <select
              value={resolution}
              onChange={(e) => onResolutionChange(e.target.value)}
              className="px-2 py-1 border border-border bg-white text-xs text-primary focus:outline-none focus:border-black"
            >
              <option value="1K">1K</option>
              <option value="2K">2K</option>
              <option value="4K">4K</option>
            </select>
          </div>
          <span className="text-secondary opacity-60">支持 nano banana pro 的比例与尺寸</span>
        </div>

        {isLoading ? (
          <div className="py-12">
            <Loading message="加载中..." />
          </div>
        ) : (
          <div
            className={`grid gap-4 ${mode === 'single' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}
          >
            {displayMaterials.length > 0 ? (
              displayMaterials.map((item) => (
                (() => {
                  const isEditing = editingMaterialIds.includes(item.id);
                  return (
                <div
                  key={item.id}
                  className="bg-white border border-border shadow-sm overflow-hidden group hover:border-black transition-colors"
                >
                  <div
                    className="relative bg-gray-50 border-b border-border"
                  style={{ aspectRatio: effectiveAspectRatio.replace(':', ' / ') }}
                  >
                    <img
                      src={getImageUrl(item.url, item.updated_at || item.created_at)}
                      alt="Infographic"
                      className="w-full h-full object-cover"
                      role="button"
                      onClick={() => window.open(getImageUrl(item.url, item.updated_at || item.created_at), '_blank')}
                    />
                    {isEditing ? (
                      <div className="absolute inset-0 bg-white/55 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-black text-xs text-primary shadow-sm">
                          <span
                            className="inline-block w-3.5 h-3.5 border-2 border-gray-300 border-t-black animate-spin rounded-full"
                            aria-label="生成中"
                          />
                          <span>Generating...</span>
                        </div>
                      </div>
                    ) : null}
                    <div className="absolute bottom-2 left-2 text-[10px] text-white bg-black px-1.5 py-0.5 uppercase tracking-wide">
                      {isEditing ? 'WORKING' : 'DONE'}
                    </div>
                  </div>
                  <div className="p-3 flex items-center justify-between text-xs text-secondary bg-white">
                    <span className="truncate pr-2 font-medium text-primary">
                      {item.display_name || item.filename || 'Infographic'}
                    </span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => onEditMaterial(item)} className="h-6 text-xs px-2 hover:bg-gray-100 rounded-none border border-transparent hover:border-gray-200">
                        编辑
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onOpenVersions(item)} className="h-6 text-xs px-2 hover:bg-gray-100 rounded-none border border-transparent hover:border-gray-200">
                        历史
                      </Button>
                      <button
                        type="button"
                        onClick={() => window.open(getImageUrl(item.url, item.updated_at || item.created_at), '_blank')}
                        className="text-secondary hover:text-black transition-colors"
                      >
                        下载
                      </button>
                    </div>
                  </div>
                </div>
                  );
                })()
              ))
            ) : isGenerating ? (
              Array.from({ length: mode === 'single' ? 1 : Math.max(progress?.total || 3, 1) }).map(
                (_, idx) => (
                  <div
                    key={`infographic-skeleton-${idx}`}
                    className="bg-white border border-border shadow-sm overflow-hidden"
                  >
                    <div
                      className="relative"
                      style={{ aspectRatio: effectiveAspectRatio.replace(':', ' / ') }}
                    >
                      <Skeleton className="w-full h-full" />
                      <div className="absolute bottom-2 left-2 text-[10px] text-white bg-black px-1.5 py-0.5 uppercase tracking-wide">
                        GENERATING
                      </div>
                    </div>
                    <div className="p-3 text-xs text-secondary font-mono text-center">PROCESSING...</div>
                  </div>
                )
              )
            ) : (
              <div className="text-center py-16 col-span-full">
                <div className="text-3xl mb-2 grayscale opacity-20">📊</div>
                <div className="text-secondary font-serif">Your infographic canvas is empty.</div>
                <div className="text-xs text-secondary opacity-60 mt-1">Click "Generate" to start creating.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
