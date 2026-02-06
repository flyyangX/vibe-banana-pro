import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Upload, ImagePlus, Palette, Settings, Sparkles } from 'lucide-react';
import { Button, Logo } from '@/components/shared';

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
    <header className="h-14 md:h-16 bg-white border-b border-border flex items-center justify-between px-3 md:px-6 flex-shrink-0 z-10">
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate('/')}
          className="flex-shrink-0 hover:bg-gray-100 w-10 h-10 p-0 rounded-full"
          title="返回"
        />
        <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => navigate('/')}>
          <Logo size="md" />
          <span className="text-sm font-sans text-secondary hidden sm:inline border-l border-gray-300 pl-2">信息图</span>
        </div>
      </div>
      <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          icon={<Settings size={16} />}
          onClick={onOpenSettingsModal}
          className="hidden md:inline-flex text-secondary hover:text-primary"
        >
          <span className="hidden xl:inline ml-1">设置</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Upload size={16} />}
          onClick={onOpenTemplateModal}
          className="hidden md:inline-flex text-secondary hover:text-primary"
        >
          <span className="hidden xl:inline ml-1">模板</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<ImagePlus size={16} />}
          onClick={onOpenMaterialModal}
          className="hidden md:inline-flex text-secondary hover:text-primary"
        >
          <span className="hidden xl:inline ml-1">素材</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />}
          onClick={onRefresh}
          disabled={isLoading}
          className="hidden md:inline-flex w-9 h-9 p-0 rounded-none border border-transparent hover:border-border"
          title="刷新"
        />
        <Button
          variant="primary"
          size="sm"
          icon={<Sparkles size={16} />}
          onClick={onGenerate}
          disabled={isGenerating}
          className="bg-primary text-white hover:bg-black rounded-none h-9 px-4"
        >
          {isGenerating ? '生成中...' : '生成信息图'}
        </Button>
      </div>
    </header>
  );
};
