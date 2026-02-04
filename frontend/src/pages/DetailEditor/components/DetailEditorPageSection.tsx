import React from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/shared';
import { DescriptionCard } from '@/components/preview/DescriptionCard';
import type { Page } from '@/types';

type DetailEditorPageSectionProps = {
  pages: Page[];
  projectId: string | null;
  isAiRefining: boolean;
  pageDescriptionGeneratingTasks: Record<string, unknown>;
  onUpdatePage: (pageId: string, data: Partial<Page>) => void;
  onRegeneratePage: (pageId: string) => void;
  onNavigateOutline: () => void;
};

export const DetailEditorPageSection: React.FC<DetailEditorPageSectionProps> = ({
  pages,
  projectId,
  isAiRefining,
  pageDescriptionGeneratingTasks,
  onUpdatePage,
  onRegeneratePage,
  onNavigateOutline,
}) => {
  if (pages.length === 0) {
    return (
      <div className="text-center py-12 md:py-20">
        <div className="flex justify-center mb-4">
          <FileText size={48} className="text-gray-300" />
        </div>
        <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">还没有页面</h3>
        <p className="text-sm md:text-base text-gray-500 mb-6">
          请先返回大纲编辑页添加页面
        </p>
        <Button
          variant="primary"
          onClick={onNavigateOutline}
          className="text-sm md:text-base"
        >
          返回大纲编辑
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
      {pages.map((page, index) => {
        const pageId = page.id || page.page_id;
        return (
          <DescriptionCard
            key={pageId}
            page={page}
            index={index}
            totalPages={pages.length}
            projectId={projectId}
            onUpdate={(data) => onUpdatePage(pageId, data)}
            onRegenerate={() => onRegeneratePage(pageId)}
            isGenerating={pageId ? !!pageDescriptionGeneratingTasks[pageId] : false}
            isAiRefining={isAiRefining}
          />
        );
      })}
    </div>
  );
};
