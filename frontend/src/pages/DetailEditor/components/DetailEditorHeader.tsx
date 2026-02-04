import React from 'react';
import { ArrowLeft, ArrowRight, ImagePlus } from 'lucide-react';
import { AiRefineInput, Button } from '@/components/shared';

type DetailEditorHeaderProps = {
  isPptProject: boolean;
  canProceedToPreview: boolean;
  onBack: () => void;
  onPrevious: () => void;
  onMaterials: () => void;
  onNext: () => void;
  onAiRefine: (requirement: string, previousRequirements: string[]) => Promise<void>;
  onAiStatusChange: (isRefining: boolean) => void;
};

export const DetailEditorHeader: React.FC<DetailEditorHeaderProps> = ({
  isPptProject,
  canProceedToPreview,
  onBack,
  onPrevious,
  onMaterials,
  onNext,
  onAiRefine,
  onAiStatusChange,
}) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-3 md:px-6 py-2 md:py-3 flex-shrink-0">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onBack}
            className="flex-shrink-0"
          >
            <span className="hidden sm:inline">返回</span>
          </Button>
          <div className="flex items-center gap-1.5 md:gap-2">
            <span className="text-xl md:text-2xl">🍌</span>
            <span className="text-base md:text-xl font-bold">蕉幻</span>
          </div>
          <span className="text-gray-400 hidden lg:inline">|</span>
          <span className="text-sm md:text-lg font-semibold hidden lg:inline">编辑页面描述</span>
        </div>

        <div className="flex-1 max-w-xl mx-auto hidden md:block md:-translate-x-3 pr-10">
          <AiRefineInput
            title=""
            placeholder="例如：让描述更详细、删除第2页的某个要点、强调XXX的重要性... · Ctrl+Enter提交"
            onSubmit={onAiRefine}
            disabled={false}
            className="!p-0 !bg-transparent !border-0"
            onStatusChange={onAiStatusChange}
          />
        </div>

        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onPrevious}
            className="hidden md:inline-flex"
          >
            <span className="hidden lg:inline">上一步</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<ImagePlus size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onMaterials}
            className="hidden md:inline-flex"
          >
            <span className="hidden lg:inline">素材库</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onNext}
            disabled={!canProceedToPreview}
            className="text-xs md:text-sm"
          >
            <span className="hidden sm:inline">{isPptProject ? '生成图片' : '进入预览'}</span>
          </Button>
        </div>
      </div>

      <div className="mt-2 md:hidden">
        <AiRefineInput
          title=""
          placeholder="例如：让描述更详细... · Ctrl+Enter"
          onSubmit={onAiRefine}
          disabled={false}
          className="!p-0 !bg-transparent !border-0"
          onStatusChange={onAiStatusChange}
        />
      </div>
    </header>
  );
};
