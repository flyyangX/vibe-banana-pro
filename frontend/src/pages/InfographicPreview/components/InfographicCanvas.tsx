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
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">预览</span>
          {progress?.total ? (
            <span className="text-xs text-gray-500">
              进度 {progress.completed || 0}/{progress.total}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="font-medium">比例：</span>
            <select
              value={aspectRatio}
              onChange={(e) => onAspectRatioChange(e.target.value)}
              className="px-2 py-1 border border-gray-200 rounded text-xs"
            >
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
            <span className="font-medium">分辨率：</span>
            <select
              value={resolution}
              onChange={(e) => onResolutionChange(e.target.value)}
              className="px-2 py-1 border border-gray-200 rounded text-xs"
            >
              <option value="1K">1K</option>
              <option value="2K">2K</option>
              <option value="4K">4K</option>
            </select>
          </div>
          <span className="text-gray-400">支持 nano banana pro 的比例与尺寸</span>
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
                  className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
                >
                  <div
                    className="relative bg-gray-50"
                    style={{ aspectRatio: aspectRatio.replace(':', ' / ') }}
                  >
                    <img
                      src={getImageUrl(item.url)}
                      alt="Infographic"
                      className="w-full h-full object-cover"
                      role="button"
                      onClick={() => window.open(getImageUrl(item.url), '_blank')}
                    />
                    {isEditing ? (
                      <div className="absolute inset-0 bg-white/55 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-gray-200 text-xs text-gray-600 shadow-sm">
                          <span
                            className="inline-block w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-banana-500 animate-spin"
                            aria-label="生成中"
                          />
                          <span>生成中...</span>
                        </div>
                      </div>
                    ) : null}
                    <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white/80 border border-gray-200 rounded px-2 py-0.5">
                      {isEditing ? '生成中' : '已生成'}
                    </div>
                  </div>
                  <div className="p-2 flex items-center justify-between text-xs text-gray-500">
                    <span className="truncate pr-2">
                      {item.display_name || item.filename || 'Infographic'}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onEditMaterial(item)}>
                        编辑
                      </Button>
                      <button
                        type="button"
                        onClick={() => window.open(getImageUrl(item.url), '_blank')}
                        className="text-banana-600 hover:text-banana-700"
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
                    className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
                  >
                    <div
                      className="relative"
                      style={{ aspectRatio: aspectRatio.replace(':', ' / ') }}
                    >
                      <Skeleton className="w-full h-full" />
                      <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white/80 border border-gray-200 rounded px-2 py-0.5">
                        生成中
                      </div>
                    </div>
                    <div className="p-2 text-xs text-gray-400">生成中...</div>
                  </div>
                )
              )
            ) : (
              <div className="text-center py-12 text-gray-500 col-span-full">
                暂无信息图，请点击"生成信息图"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
