import React from 'react';
import { ArrowLeft, Save, ArrowRight, ImagePlus } from 'lucide-react';
import { Button, AiRefineInput } from '@/components/shared';

interface OutlineToolbarProps {
  onNavigateBack: () => void;
  onSave: () => Promise<void>;
  onNavigateToMaterials: () => void;
  onNavigateNext: () => void;
  onAiRefine: (requirement: string, previousRequirements: string[]) => Promise<void>;
  onAiRefiningChange: (isRefining: boolean) => void;
}

export const OutlineToolbar: React.FC<OutlineToolbarProps> = ({
  onNavigateBack,
  onSave,
  onNavigateToMaterials,
  onNavigateNext,
  onAiRefine,
  onAiRefiningChange,
}) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-3 md:px-6 py-2 md:py-3 flex-shrink-0">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        {/* 左侧：Logo 和标题 */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onNavigateBack}
            className="flex-shrink-0"
          >
            <span className="hidden sm:inline">返回</span>
          </Button>
          <div className="flex items-center gap-1.5 md:gap-2">
            <span className="text-xl md:text-2xl">🍌</span>
            <span className="text-base md:text-xl font-bold">蕉幻</span>
          </div>
          <span className="text-gray-400 hidden lg:inline">|</span>
          <span className="text-sm md:text-lg font-semibold hidden lg:inline">编辑大纲</span>
        </div>

        {/* 中间：AI 修改输入框 */}
        <div className="flex-1 max-w-xl mx-auto hidden md:block md:-translate-x-2 pr-10">
          <AiRefineInput
            title=""
            placeholder="例如：增加一页关于XXX的内容、删除第3页、合并前两页... · Ctrl+Enter提交"
            onSubmit={onAiRefine}
            disabled={false}
            className="!p-0 !bg-transparent !border-0"
            onStatusChange={onAiRefiningChange}
          />
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          <Button
            variant="secondary"
            size="sm"
            icon={<Save size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onSave}
            className="hidden md:inline-flex"
          >
            <span className="hidden lg:inline">保存</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<ImagePlus size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onNavigateToMaterials}
            className="hidden md:inline-flex"
          >
            <span className="hidden lg:inline">素材库</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onNavigateNext}
            className="text-xs md:text-sm"
          >
            <span className="hidden sm:inline">下一步</span>
          </Button>
        </div>
      </div>

      {/* 移动端：AI 输入框 */}
      <div className="mt-2 md:hidden">
        <AiRefineInput
          title=""
          placeholder="例如：增加/删除页面... · Ctrl+Enter"
          onSubmit={onAiRefine}
          disabled={false}
          className="!p-0 !bg-transparent !border-0"
          onStatusChange={onAiRefiningChange}
        />
      </div>
    </header>
  );
};
