import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, Sparkles, RotateCcw, Upload, ImagePlus, Settings, Home } from 'lucide-react';
import { Button, Logo } from '@/components/shared';

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
    <header className="h-14 md:h-16 bg-white border-b border-border flex items-center justify-between px-3 md:px-6 flex-shrink-0 z-10">
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="sm"
          icon={<Home size={18} />}
          onClick={() => navigate('/')}
          className="hidden sm:inline-flex flex-shrink-0 hover:bg-black hover:text-white w-10 h-10 p-0 rounded-none transition-colors"
          title="主页"
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={18} />}
          onClick={() => navigate(`/project/${projectId}/detail`)}
          className="flex-shrink-0 hover:bg-black hover:text-white w-10 h-10 p-0 rounded-none transition-colors"
          title="返回"
        />
        <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => navigate('/')}>
          <Logo size="md" />
          <span className="text-sm font-sans text-secondary hidden sm:inline border-l border-gray-300 pl-2">小红书</span>
        </div>
      </div>
      <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          icon={<Settings size={18} />}
          onClick={onOpenProjectSettings}
          className="hidden md:inline-flex text-secondary hover:text-black hover:bg-gray-100 rounded-none"
        >
          <span className="hidden xl:inline ml-1 text-xs font-bold tracking-wide">设置</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Upload size={18} />}
          onClick={onOpenTemplateModal}
          className="hidden md:inline-flex text-secondary hover:text-black hover:bg-gray-100 rounded-none"
        >
          <span className="hidden xl:inline ml-1 text-xs font-bold tracking-wide">模板</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<ImagePlus size={18} />}
          onClick={onOpenMaterialModal}
          className="hidden md:inline-flex text-secondary hover:text-black hover:bg-gray-100 rounded-none"
        >
          <span className="hidden xl:inline ml-1 text-xs font-bold tracking-wide">素材</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Download size={18} />}
          onClick={onOpenExportModal}
          className="hidden md:inline-flex text-secondary hover:text-black hover:bg-gray-100 rounded-none"
        >
          <span className="hidden xl:inline ml-1 text-xs font-bold tracking-wide">导出</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />}
          onClick={onRefresh}
          disabled={isLoading}
          className="hidden md:inline-flex w-10 h-10 p-0 rounded-none border border-transparent hover:border-black hover:bg-transparent"
          title="刷新"
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<RotateCcw size={18} />}
          onClick={onRegenerateAll}
          disabled={isGenerating}
          className="hidden md:inline-flex px-4 rounded-none border border-black text-black hover:bg-black hover:text-white transition-all text-xs font-bold tracking-wide"
        >
          <span className="ml-1">重新生成</span>
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={<Sparkles size={18} />}
          onClick={onGenerate}
          disabled={isGenerating}
          className="bg-black text-white hover:bg-gray-800 rounded-none h-10 px-6 text-xs font-bold tracking-wide border border-transparent hover:border-black"
        >
          {isGenerating ? '生成中...' : '生成图文'}
        </Button>
      </div>
    </header>
  );
};
