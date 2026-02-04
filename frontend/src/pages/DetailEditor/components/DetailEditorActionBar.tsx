import React from 'react';
import { Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/shared';

type DetailEditorActionBarProps = {
  isBatchGenerating: boolean;
  isGeneratingXhsBlueprint: boolean;
  isXhsProject: boolean;
  completedCount: number;
  totalCount: number;
  hasAnyDescriptions: boolean;
  progressCompleted: number;
  progressTotal: number;
  progressPercent: number;
  onGenerateAll: () => void;
  onExportDescriptions: () => void;
};

export const DetailEditorActionBar: React.FC<DetailEditorActionBarProps> = ({
  isBatchGenerating,
  isGeneratingXhsBlueprint,
  isXhsProject,
  completedCount,
  totalCount,
  hasAnyDescriptions,
  progressCompleted,
  progressTotal,
  progressPercent,
  onGenerateAll,
  onExportDescriptions,
}) => {
  const isGenerating = isBatchGenerating || isGeneratingXhsBlueprint;

  return (
    <div className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 md:py-4 flex-shrink-0">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-1">
          <Button
            variant="primary"
            icon={<Sparkles size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onGenerateAll}
            className="flex-1 sm:flex-initial text-sm md:text-base"
            disabled={isGenerating}
          >
            {isGenerating ? '生成中...' : '批量生成描述'}
          </Button>
          <Button
            variant="secondary"
            icon={<Download size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onExportDescriptions}
            disabled={!hasAnyDescriptions}
            className="flex-1 sm:flex-initial text-sm md:text-base"
          >
            导出描述
          </Button>
          <span className="text-xs md:text-sm text-gray-500 whitespace-nowrap">
            {completedCount} / {totalCount} 页已完成
          </span>
        </div>
      </div>

      {isGenerating && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="inline-flex w-2 h-2 rounded-full bg-banana-500 animate-pulse" />
              <span>
                {isXhsProject
                  ? '正在生成小红书文案/卡片蓝图…'
                  : '正在批量生成页面描述…'}
              </span>
            </div>
            {!isXhsProject && (
              <span className="tabular-nums">
                {progressCompleted} / {progressTotal}
              </span>
            )}
          </div>
          {!isXhsProject && (
            <div className="mt-2 h-2 bg-gray-100 rounded overflow-hidden">
              <div
                className="h-full bg-banana-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
