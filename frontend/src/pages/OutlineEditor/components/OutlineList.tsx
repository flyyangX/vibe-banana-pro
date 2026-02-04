import React from 'react';
import { Plus, FileText, Download, Save } from 'lucide-react';
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
import { Button, ProjectResourcesList } from '@/components/shared';
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
  xhsAspectRatio: '4:5' | '3:4';
  setXhsAspectRatio: (ratio: '4:5' | '3:4') => void;
}

const GenerationSettings: React.FC<GenerationSettingsProps> = ({
  currentProject,
  outlinePageCount,
  setOutlinePageCount,
  infographicMode,
  setInfographicMode,
  xhsAspectRatio,
  setXhsAspectRatio,
}) => {
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
            </div>
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
  xhsAspectRatio: '4:5' | '3:4';
  setXhsAspectRatio: (ratio: '4:5' | '3:4') => void;
  sensors: SensorDescriptor<SensorOptions>[];
  onDragEnd: (event: DragEndEvent) => void;
  onPageSelect: (pageId: string | null) => void;
  onPageUpdate: (pageId: string, data: Partial<Page>) => void;
  onPageDelete: (pageId: string) => void;
  onAddPage: () => void;
  onGenerateOutline: () => void;
  onExportOutline: () => void;
  onSaveAllPages: () => Promise<void>;
  onFileClick: (fileId: string) => void;
}

export const OutlineList: React.FC<OutlineListProps> = ({
  currentProject,
  projectId,
  selectedPageId,
  isAiRefining,
  outlinePageCount,
  setOutlinePageCount,
  infographicMode,
  setInfographicMode,
  xhsAspectRatio,
  setXhsAspectRatio,
  sensors,
  onDragEnd,
  onPageSelect,
  onPageUpdate,
  onPageDelete,
  onAddPage,
  onGenerateOutline,
  onExportOutline,
  onSaveAllPages,
  onFileClick,
}) => {
  return (
    <div className="flex-1 p-3 md:p-6 overflow-y-auto min-h-0">
      <div className="max-w-4xl mx-auto">
        {/* 生成设置 */}
        <GenerationSettings
          currentProject={currentProject}
          outlinePageCount={outlinePageCount}
          setOutlinePageCount={setOutlinePageCount}
          infographicMode={infographicMode}
          setInfographicMode={setInfographicMode}
          xhsAspectRatio={xhsAspectRatio}
          setXhsAspectRatio={setXhsAspectRatio}
        />

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 md:mb-6">
          <Button
            variant="primary"
            icon={<Plus size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onAddPage}
            className="w-full sm:w-auto text-sm md:text-base"
          >
            添加页面
          </Button>
          {currentProject.pages.length === 0 ? (
            <Button
              variant="secondary"
              onClick={onGenerateOutline}
              className="w-full sm:w-auto text-sm md:text-base"
            >
              {currentProject.creation_type === 'outline' ? '解析大纲' : '自动生成大纲'}
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={onGenerateOutline}
              className="w-full sm:w-auto text-sm md:text-base"
            >
              {currentProject.creation_type === 'outline' ? '重新解析大纲' : '重新生成大纲'}
            </Button>
          )}
          <Button
            variant="secondary"
            icon={<Download size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onExportOutline}
            disabled={currentProject.pages.length === 0}
            className="w-full sm:w-auto text-sm md:text-base"
          >
            导出大纲
          </Button>
          {/* 手机端：保存按钮 */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Save size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onSaveAllPages}
            className="md:hidden w-full sm:w-auto text-sm md:text-base"
          >
            保存
          </Button>
        </div>

        {/* 项目资源列表（文件和图片） */}
        <ProjectResourcesList
          projectId={projectId || null}
          onFileClick={onFileClick}
          showFiles={true}
          showImages={true}
        />

        {/* 大纲卡片列表 */}
        {currentProject.pages.length === 0 ? (
          <div className="text-center py-20">
            <div className="flex justify-center mb-4">
              <FileText size={64} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              还没有页面
            </h3>
            <p className="text-gray-500 mb-6">
              点击"添加页面"手动创建，或"自动生成大纲"让 AI 帮你完成
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={currentProject.pages.map((p, idx) => p.id || `page-${idx}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
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
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};
