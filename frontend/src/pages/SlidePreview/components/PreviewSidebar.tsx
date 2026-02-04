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
    <aside className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="p-3 md:p-4 border-b border-gray-200 flex-shrink-0 space-y-2 md:space-y-3">
        <Button
          variant="primary"
          icon={<Sparkles size={16} className="md:w-[18px] md:h-[18px]" />}
          onClick={onGenerateAll}
          className="w-full text-sm md:text-base"
          disabled={pages.length === 0 || isBatchPreparing}
        >
          {isMultiSelectMode && selectedPageIds.size > 0
            ? `生成选中页面 (${selectedPageIds.size})`
            : `批量生成图片 (${pages.length})`}
        </Button>
        {isBatchPreparing && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="truncate">{batchPreparingText || '正在准备...'}</span>
          </div>
        )}
      </div>

      {/* 缩略图列表 */}
      <div className="flex-1 overflow-y-auto md:overflow-y-auto overflow-x-auto md:overflow-x-visible p-3 md:p-4 min-h-0">
        {/* 多选模式切换 */}
        <div className="flex items-center gap-2 text-xs mb-3">
          <button
            onClick={onToggleMultiSelectMode}
            className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
              isMultiSelectMode
                ? 'bg-banana-100 text-banana-700 hover:bg-banana-200'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {isMultiSelectMode ? <CheckSquare size={14} /> : <Square size={14} />}
            <span>{isMultiSelectMode ? '取消多选' : '多选'}</span>
          </button>
          {isMultiSelectMode && (
            <>
              <button
                onClick={selectedPageIds.size === pages.length ? onDeselectAll : onSelectAll}
                className="text-gray-500 hover:text-banana-600 transition-colors"
              >
                {selectedPageIds.size === pages.length ? '取消全选' : '全选'}
              </button>
              {selectedPageIds.size > 0 && (
                <span className="text-banana-600 font-medium">
                  ({selectedPageIds.size}页)
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex md:flex-col gap-2 md:gap-4 min-w-max md:min-w-0">
          {pages.map((page, index) => (
            <div key={page.id} className="md:w-full flex-shrink-0 relative">
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
                  className={`w-20 h-14 rounded border-2 transition-all ${
                    selectedIndex === index
                      ? 'border-banana-500 shadow-md'
                      : 'border-gray-200'
                  } ${isMultiSelectMode && page.id && selectedPageIds.has(page.id) ? 'ring-2 ring-banana-400' : ''}`}
                >
                  {page.generated_image_path ? (
                    <img
                      src={getImageUrl(page.generated_image_path, page.updated_at)}
                      alt={`Slide ${index + 1}`}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
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
                    className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      selectedPageIds.has(page.id)
                        ? 'bg-banana-500 text-white'
                        : 'bg-white border-2 border-gray-300'
                    }`}
                  >
                    {selectedPageIds.has(page.id) && <Check size={12} />}
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
                    className={`absolute top-2 left-2 z-10 w-6 h-6 rounded flex items-center justify-center transition-all ${
                      selectedPageIds.has(page.id)
                        ? 'bg-banana-500 text-white shadow-md'
                        : 'bg-white/90 border-2 border-gray-300 hover:border-banana-400'
                    }`}
                  >
                    {selectedPageIds.has(page.id) && <Check size={14} />}
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
