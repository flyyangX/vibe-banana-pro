import React from 'react';
import { ImagePlus, Palette, Settings } from 'lucide-react';
import { Button } from '@/components/shared';

interface QuickActionsProps {
  onOpenMaterialModal: () => void;
  onOpenMaterialsLibrary: () => void;
  onNavigateToHistory: () => void;
  onNavigateToSettings: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onOpenMaterialModal,
  onOpenMaterialsLibrary,
  onNavigateToHistory,
  onNavigateToSettings,
}) => {
  return (
    <div className="flex items-center gap-2 md:gap-3">
      {/* 桌面端：带文字的素材生成按钮 */}
      <Button
        variant="ghost"
        size="sm"
        icon={<ImagePlus size={16} className="md:w-[18px] md:h-[18px]" />}
        onClick={onOpenMaterialModal}
        className="hidden sm:inline-flex hover:bg-banana-100/60 hover:shadow-sm hover:scale-105 transition-all duration-200 font-medium"
      >
        <span className="hidden md:inline">素材生成</span>
      </Button>
      {/* 桌面端：带文字的素材库按钮 */}
      <Button
        variant="ghost"
        size="sm"
        icon={<Palette size={16} className="md:w-[18px] md:h-[18px]" />}
        onClick={onOpenMaterialsLibrary}
        className="hidden sm:inline-flex hover:bg-banana-100/60 hover:shadow-sm hover:scale-105 transition-all duration-200 font-medium"
      >
        <span className="hidden md:inline">素材库</span>
      </Button>
      {/* 手机端：仅图标的素材生成按钮 */}
      <Button
        variant="ghost"
        size="sm"
        icon={<ImagePlus size={16} />}
        onClick={onOpenMaterialModal}
        className="sm:hidden hover:bg-banana-100/60 hover:shadow-sm hover:scale-105 transition-all duration-200"
        title="素材生成"
      />
      {/* 手机端：仅图标的素材库按钮 */}
      <Button
        variant="ghost"
        size="sm"
        icon={<Palette size={16} />}
        onClick={onOpenMaterialsLibrary}
        className="sm:hidden hover:bg-banana-100/60 hover:shadow-sm hover:scale-105 transition-all duration-200"
        title="素材库"
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={onNavigateToHistory}
        className="text-xs md:text-sm hover:bg-banana-100/60 hover:shadow-sm hover:scale-105 transition-all duration-200 font-medium"
      >
        <span className="hidden sm:inline">历史项目</span>
        <span className="sm:hidden">历史</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        icon={<Settings size={16} className="md:w-[18px] md:h-[18px]" />}
        onClick={onNavigateToSettings}
        className="text-xs md:text-sm hover:bg-banana-100/60 hover:shadow-sm hover:scale-105 transition-all duration-200 font-medium"
      >
        <span className="hidden md:inline">设置</span>
        <span className="sm:hidden">设</span>
      </Button>
      <Button variant="ghost" size="sm" className="hidden md:inline-flex hover:bg-banana-50/50">帮助</Button>
    </div>
  );
};

export default QuickActions;
