import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, Sparkles, RotateCcw, Upload, ImagePlus, Settings, Home } from 'lucide-react';
import { Button } from '@/components/shared';

export interface XhsToolbarProps {
  projectId: string;
  projectTitle?: string;
  isLoading: boolean;
  isGenerating: boolean;
  onRefresh: () => void;
  onGenerate: () => void;
  onRegenerateAll: () => void;
  onOpenExportModal: () => void;
  onOpenProjectSettings: () => void;
  onOpenTemplateModal: () => void;
  onOpenMaterialModal: () => void;
}

export const XhsToolbar: React.FC<XhsToolbarProps> = ({
  projectId,
  projectTitle,
  isLoading,
  isGenerating,
  onRefresh,
  onGenerate,
  onRegenerateAll,
  onOpenExportModal,
  onOpenProjectSettings,
  onOpenTemplateModal,
  onOpenMaterialModal,
}) => {
  const navigate = useNavigate();

  return (
    <header className="h-14 md:h-16 bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-3 md:px-6 flex-shrink-0">
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="sm"
          icon={<Home size={16} className="md:w-[18px] md:h-[18px]" />}
          onClick={() => navigate('/')}
          className="sm:hidden flex-shrink-0"
          title="返回主页"
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<Home size={16} className="md:w-[18px] md:h-[18px]" />}
          onClick={() => navigate('/')}
          className="hidden sm:inline-flex flex-shrink-0"
        >
          <span className="hidden md:inline">主页</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />}
          onClick={() => navigate(`/project/${projectId}/detail`)}
          className="flex-shrink-0"
        >
          上一步
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl md:text-2xl">📌</span>
          <span className="text-base md:text-xl font-bold truncate">小红书图文</span>
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
          icon={<Settings size={16} />}
          onClick={onOpenProjectSettings}
          className="hidden md:inline-flex"
        >
          项目设置
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Upload size={16} />}
          onClick={onOpenTemplateModal}
          className="hidden md:inline-flex"
        >
          更换模板
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<ImagePlus size={16} />}
          onClick={onOpenMaterialModal}
          className="hidden md:inline-flex"
        >
          素材生成
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Download size={16} />}
          onClick={onOpenExportModal}
          className="hidden md:inline-flex"
        >
          导出
        </Button>
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
          icon={<RotateCcw size={16} />}
          onClick={onRegenerateAll}
          disabled={isGenerating}
        >
          重新生成
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={<Sparkles size={16} />}
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? '生成中...' : '生成图文'}
        </Button>
      </div>
    </header>
  );
};
