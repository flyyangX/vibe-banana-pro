import React from 'react';
import { Plus, FileText } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  SensorDescriptor,
  SensorOptions,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { OutlineCard } from '@/components/outline/OutlineCard';
import type { Page, Project } from '@/types';

// 可排序的卡片包装器
const SortableCard: React.FC<{
  page: Page;
  index: number;
  totalPages: number;
  onUpdate: (data: Partial<Page>) => void;
  onDelete: () => void;
  onClick: () => void;
  isSelected: boolean;
  isAiRefining?: boolean;
}> = (props) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.page.id || `page-${props.index}`,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'pan-y', // Critical: Explicitly allow vertical scrolling on the card
    WebkitTouchCallout: 'none', // Prevent iOS context menu on long press
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <OutlineCard {...props} dragHandleProps={listeners} />
    </div>
  );
};

interface GenerationSettingsProps {
  currentProject: Project;
  outlinePageCount: string;
  setOutlinePageCount: (value: string) => void;
  infographicMode: 'single' | 'series';
  setInfographicMode: (mode: 'single' | 'series') => void;
  pptAspectRatio: '16:9' | '4:3' | 'auto';
  setPptAspectRatio: (ratio: '16:9' | '4:3' | 'auto') => void;
  infographicAspectRatio: string;
  setInfographicAspectRatio: (ratio: string) => void;
  xhsAspectRatio: '4:5' | '3:4' | 'auto';
  setXhsAspectRatio: (ratio: '4:5' | '3:4' | 'auto') => void;
}

const GenerationSettings: React.FC<GenerationSettingsProps> = ({
  currentProject,
  outlinePageCount,
  setOutlinePageCount,
  infographicMode,
  setInfographicMode,
  pptAspectRatio,
  setPptAspectRatio,
  infographicAspectRatio,
  setInfographicAspectRatio,
  xhsAspectRatio,
  setXhsAspectRatio,
}) => {
  const infographicRatios = ['auto', '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '5:4', '4:5', '21:9'];
  return (
    <div className="mb-4 md:mb-6 rounded-lg border border-gray-200 bg-white p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800">生成设置</h3>
        <span className="text-xs text-gray-500">PPT/信息图/小红书均支持设置页数；留空则由 AI 自动配置</span>
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        {(currentProject.product_type !== 'infographic' || infographicMode === 'series') && (
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            目标页数（PPT/信息图/小红书）
            <input
              type="number"
              min={1}
              placeholder="AI 自动"
              value={outlinePageCount}
              onChange={(e) => setOutlinePageCount(e.target.value)}
              className="h-9 rounded-md border border-gray-200 px-3 text-sm text-gray-900 focus:border-banana-400 focus:outline-none"
            />
          </label>
        )}
        {currentProject.product_type === 'infographic' && (
          <div className="flex flex-col gap-1 text-xs text-gray-600">
            信息图模式
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setInfographicMode('single')}
                className={`rounded-full border px-3 py-1 text-xs ${
                  infographicMode === 'single'
                    ? 'border-banana-500 text-banana-700 bg-banana-50'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                单张
              </button>
              <button
                type="button"
                onClick={() => setInfographicMode('series')}
                className={`rounded-full border px-3 py-1 text-xs ${
                  infographicMode === 'series'
                    ? 'border-banana-500 text-banana-700 bg-banana-50'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                多张
              </button>
            </div>
          </div>
        )}
        {(!currentProject.product_type || currentProject.product_type === 'ppt') && (
          <div className="flex flex-col gap-1 text-xs text-gray-600">
            PPT 比例
            <div className="flex flex-wrap gap-2">
              {(['16:9', '4:3', 'auto'] as const).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setPptAspectRatio(ratio)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    pptAspectRatio === ratio
                      ? 'border-banana-500 text-banana-700 bg-banana-50'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {ratio === 'auto' ? '自动' : ratio}
                </button>
              ))}
            </div>
          </div>
        )}
        {currentProject.product_type === 'xiaohongshu' && (
          <div className="flex flex-col gap-1 text-xs text-gray-600">
            竖图比例
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setXhsAspectRatio('4:5')}
                className={`rounded-full border px-3 py-1 text-xs ${
                  xhsAspectRatio === '4:5'
                    ? 'border-banana-500 text-banana-700 bg-banana-50'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                4:5
              </button>
              <button
                type="button"
                onClick={() => setXhsAspectRatio('3:4')}
                className={`rounded-full border px-3 py-1 text-xs ${
                  xhsAspectRatio === '3:4'
                    ? 'border-banana-500 text-banana-700 bg-banana-50'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                3:4
              </button>
              <button
                type="button"
                onClick={() => setXhsAspectRatio('auto')}
                className={`rounded-full border px-3 py-1 text-xs ${
                  xhsAspectRatio === 'auto'
                    ? 'border-banana-500 text-banana-700 bg-banana-50'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                自动
              </button>
            </div>
          </div>
        )}
        {currentProject.product_type === 'infographic' && (
          <div className="flex flex-col gap-1 text-xs text-gray-600">
            信息图比例
            <select
              value={infographicAspectRatio}
              onChange={(e) => setInfographicAspectRatio(e.target.value)}
              className="h-9 rounded-md border border-gray-200 px-2 text-sm text-gray-900 focus:border-banana-400 focus:outline-none"
            >
              {infographicRatios.map((ratio) => (
                <option key={ratio} value={ratio}>
                  {ratio === 'auto' ? '自动' : ratio}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

interface OutlineListProps {
  currentProject: Project;
  projectId: string | undefined;
  selectedPageId: string | null;
  isAiRefining: boolean;
  outlinePageCount: string;
  setOutlinePageCount: (value: string) => void;
  infographicMode: 'single' | 'series';
  setInfographicMode: (mode: 'single' | 'series') => void;
  pptAspectRatio: '16:9' | '4:3' | 'auto';
  setPptAspectRatio: (ratio: '16:9' | '4:3' | 'auto') => void;
  infographicAspectRatio: string;
  setInfographicAspectRatio: (ratio: string) => void;
  xhsAspectRatio: '4:5' | '3:4' | 'auto';
  setXhsAspectRatio: (ratio: '4:5' | '3:4' | 'auto') => void;
  sensors: SensorDescriptor<SensorOptions>[];
  onDragEnd: (event: DragEndEvent) => void;
  onPageSelect: (pageId: string | null) => void;
  onPageUpdate: (pageId: string, data: Partial<Page>) => void;
  onPageDelete: (pageId: string) => void;
  onAddPage: () => void;
  onGenerateOutline: () => void;
  onExportOutline: () => void;
  onSaveAllPages: () => Promise<void>;
}

// Simplified OutlineList
export const OutlineList: React.FC<OutlineListProps> = ({
  currentProject,
  projectId,
  selectedPageId,
  isAiRefining,
  sensors,
  onDragEnd,
  onPageSelect,
  onPageUpdate,
  onPageDelete,
  onAddPage,
  onGenerateOutline,
  onExportOutline,
  onSaveAllPages,

}) => {
  return (
    <div className="px-4 py-8 pb-32">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Actions Header (Inline with list or Sticky) */}
        {/* We moved major actions to the parent, but "Add Page" feels right inside the list flow or at bottom */}
        
        {currentProject.pages.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-300">
            <div className="flex justify-center mb-4">
              <FileText size={48} className="text-gray-300" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-black mb-2">
              Empty Outline
            </h3>
            <p className="text-xs text-gray-500 mb-6 max-w-xs mx-auto">
              Start by adding a page manually or generating one with AI.
            </p>
            <div className="flex justify-center gap-3">
               <button onClick={onAddPage} className="px-4 py-2 bg-black text-white text-xs font-bold uppercase hover:bg-gray-800 transition-colors">
                  Add Page
               </button>
               <button onClick={onGenerateOutline} className="px-4 py-2 border border-black text-black text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors">
                  Generate with AI
               </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-end pb-2 border-b border-black mb-6">
                <span className="text-xs font-bold uppercase text-gray-400 tracking-wider count">
                   {currentProject.pages.length} Pages
                </span>
                <button 
                  onClick={onAddPage}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase bg-black text-white px-3 h-8 hover:bg-gray-800 transition-colors"
                >
                  <Plus size={12} /> Add Page
                </button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={currentProject.pages.map((p, idx) => p.id || `page-${idx}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4 pb-20">
                  {currentProject.pages.map((page, index) => (
                    <SortableCard
                      key={page.id || `page-${index}`}
                      page={page}
                      index={index}
                      totalPages={currentProject.pages.length}
                      onUpdate={(data) => page.id && onPageUpdate(page.id, data)}
                      onDelete={() => page.id && onPageDelete(page.id)}
                      onClick={() => onPageSelect(page.id || null)}
                      isSelected={selectedPageId === page.id}
                      isAiRefining={isAiRefining}
                    />
                  ))}
                  
                  {/* Append Add Button at bottom for flow */}
                  <div 
                    onClick={onAddPage}
                    className="h-12 border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-black hover:bg-gray-50 transition-all group"
                  >
                     <Plus size={16} className="text-gray-400 group-hover:text-black transition-colors" />
                  </div>
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>
    </div>
  );
};
