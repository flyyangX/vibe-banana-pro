import React from 'react';
import {
  Sparkles,
  CheckSquare,
  Square,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/shared';
import { SlideCard } from '@/components/preview/SlideCard';
import { getImageUrl } from '@/api/client';
import type { Page } from '@/types';

interface PreviewSidebarProps {
  pages: Page[];
  selectedIndex: number;
  isMultiSelectMode: boolean;
  selectedPageIds: Set<string>;
  isBatchPreparing: boolean;
  batchPreparingText: string;
  pageGeneratingTasks: Record<string, string>;
  onSelectIndex: (index: number) => void;
  onTogglePageSelection: (pageId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onToggleMultiSelectMode: () => void;
  onGenerateAll: () => void;
  onEditPage: (index: number) => void;
  onDeletePage: (pageId: string) => void;
  getElapsedSeconds: (pageId?: string | null) => number | undefined;
}

export const PreviewSidebar: React.FC<PreviewSidebarProps> = ({
  pages,
  selectedIndex,
  isMultiSelectMode,
  selectedPageIds,
  isBatchPreparing,
  batchPreparingText,
  pageGeneratingTasks,
  onSelectIndex,
  onTogglePageSelection,
  onSelectAll,
  onDeselectAll,
  onToggleMultiSelectMode,
  onGenerateAll,
  onEditPage,
  onDeletePage,
  getElapsedSeconds,
}) => {
  return (
    <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-border flex flex-col flex-shrink-0 z-0">
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="bg-gray-50 p-1 rounded-xl border border-gray-100">
          <Button
            variant="primary"
            icon={<Sparkles size={18} className={!isBatchPreparing ? "animate-pulse" : ""} />}
            onClick={onGenerateAll}
            className={`w-full h-12 rounded-lg font-bold tracking-wide shadow-sm transition-all duration-300
              ${pages.length === 0 || isBatchPreparing 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-gray-900 to-black text-white hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
              }`}
            disabled={pages.length === 0 || isBatchPreparing}
          >
            {isMultiSelectMode && selectedPageIds.size > 0
              ? `生成选中页面 (${selectedPageIds.size})`
              : `批量生成图片 (${pages.length})`}
          </Button>
        </div>
        {isBatchPreparing && (
          <div className="mt-2 flex items-center justify-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 py-2 rounded-lg border border-dashed border-gray-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
            <span className="truncate">{batchPreparingText || '正在准备资源...'}</span>
          </div>
        )}
      </div>

      {/* 缩略图列表 */}
      <div className="flex-1 overflow-y-auto md:overflow-y-auto overflow-x-auto md:overflow-x-visible p-4 min-h-0 bg-white">
        {/* 多选模式切换 */}
        <div className="flex items-center justify-between gap-2 text-xs mb-4 pb-2 border-b border-gray-100">
          <button
            onClick={onToggleMultiSelectMode}
            className={`flex items-center gap-1.5 transition-colors font-medium ${
              isMultiSelectMode
                ? 'text-primary'
                : 'text-secondary hover:text-primary'
            }`}
          >
            {isMultiSelectMode ? <CheckSquare size={14} /> : <Square size={14} />}
            <span>多选模式</span>
          </button>
          {isMultiSelectMode && (
            <div className="flex items-center gap-3">
               {selectedPageIds.size > 0 && (
                <span className="text-primary font-bold">
                  {selectedPageIds.size}
                </span>
              )}
              <button
                onClick={selectedPageIds.size === pages.length ? onDeselectAll : onSelectAll}
                className="text-secondary hover:text-primary transition-colors"
              >
                {selectedPageIds.size === pages.length ? '取消全选' : '全选'}
              </button>
            </div>
          )}
        </div>
        <div className="flex md:flex-col gap-3 md:gap-4 min-w-max md:min-w-0 pb-10">
          {pages.map((page, index) => (
            <div key={page.id} className="md:w-full flex-shrink-0 relative group">
              {/* 移动端：简化缩略图 */}
              <div className="md:hidden relative">
                <button
                  onClick={() => {
                    if (isMultiSelectMode && page.id) {
                      onTogglePageSelection(page.id);
                    } else {
                      onSelectIndex(index);
                    }
                  }}
                  className={`w-28 h-20 border transition-all ${
                    selectedIndex === index
                      ? 'border-primary ring-2 ring-gray-100'
                      : 'border-border'
                  } ${isMultiSelectMode && page.id && selectedPageIds.has(page.id) ? 'border-primary bg-gray-50' : ''}`}
                >
                  {page.generated_image_path ? (
                    <img
                      src={getImageUrl(page.generated_image_path, page.updated_at)}
                      alt={`Slide ${index + 1}`}
                      className={`w-full h-full object-cover ${isMultiSelectMode && page.id && selectedPageIds.has(page.id) ? 'grayscale opacity-80' : ''}`}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-50 flex items-center justify-center text-xs text-gray-300 font-serif">
                      {index + 1}
                    </div>
                  )}
                </button>
                {/* 多选复选框（移动端） */}
                {isMultiSelectMode && page.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePageSelection(page.id!);
                    }}
                    className={`absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center transition-all ${
                      selectedPageIds.has(page.id)
                        ? 'bg-primary text-white border-none'
                        : 'bg-white border border-gray-300'
                    }`}
                  >
                    {selectedPageIds.has(page.id) && <Check size={10} />}
                  </button>
                )}
              </div>
              {/* 桌面端：完整卡片 */}
              <div className="hidden md:block relative">
                {/* 多选复选框（桌面端） */}
                {isMultiSelectMode && page.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePageSelection(page.id!);
                    }}
                    className={`absolute top-2 left-2 z-10 w-5 h-5 flex items-center justify-center transition-all ${
                      selectedPageIds.has(page.id)
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-white/90 border border-gray-300 hover:border-primary'
                    }`}
                  >
                    {selectedPageIds.has(page.id) && <Check size={12} />}
                  </button>
                )}
                <SlideCard
                  page={page}
                  index={index}
                  isSelected={selectedIndex === index}
                  onClick={() => {
                    if (isMultiSelectMode && page.id) {
                      onTogglePageSelection(page.id);
                    } else {
                      onSelectIndex(index);
                    }
                  }}
                  onEdit={() => {
                    onSelectIndex(index);
                    onEditPage(index);
                  }}
                  onDelete={() => page.id && onDeletePage(page.id)}
                  isGenerating={page.id ? !!pageGeneratingTasks[page.id] : false}
                  elapsedSeconds={getElapsedSeconds(page.id)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
