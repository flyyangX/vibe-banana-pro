import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Upload, ImagePlus, Palette, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/components/shared';

interface InfographicToolbarProps {
  projectId: string;
  projectTitle?: string;
  isLoading: boolean;
  isGenerating: boolean;
  onRefresh: () => void;
  onOpenTemplateModal: () => void;
  onOpenMaterialModal: () => void;
  onOpenSettingsModal: () => void;
  onGenerate: () => void;
}

export const InfographicToolbar: React.FC<InfographicToolbarProps> = ({
  projectId,
  projectTitle,
  isLoading,
  isGenerating,
  onRefresh,
  onOpenTemplateModal,
  onOpenMaterialModal,
  onOpenSettingsModal,
  onGenerate,
}) => {
  const navigate = useNavigate();

  return (
    <header className="h-14 md:h-16 bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-3 md:px-6 flex-shrink-0">
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />}
          onClick={() => navigate('/')}
          className="flex-shrink-0"
        >
          返回
        </Button>
        <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
          <span className="text-xl md:text-2xl">📊</span>
          <span className="text-base md:text-xl font-bold truncate">信息图</span>
        </div>
        <span className="text-gray-400 hidden md:inline">|</span>
        <span className="text-sm md:text-lg font-semibold truncate hidden sm:inline">
          {projectTitle || '项目'}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />}
          onClick={onRefresh}
          disabled={isLoading}
        >
          刷新
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Upload size={16} />}
          onClick={onOpenTemplateModal}
        >
          更换模板
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<ImagePlus size={16} />}
          onClick={onOpenMaterialModal}
        >
          素材生成
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Palette size={16} />}
          onClick={() => navigate(`/project/${projectId}/materials`)}
        >
          素材库
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Settings size={16} />}
          onClick={onOpenSettingsModal}
        >
          项目设置
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={<Sparkles size={16} />}
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? '生成中...' : '生成信息图'}
        </Button>
      </div>
    </header>
  );
};
