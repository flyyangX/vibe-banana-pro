import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  ArrowLeft,
  Download,
  RefreshCw,
  Upload,
  ImagePlus,
  Settings,
  FileText,
  Loader2,
} from 'lucide-react';
import { Button, ExportTasksPanel, Logo } from '@/components/shared';
import type { ExportTask } from '@/store/useExportTasksStore';
import type { Page } from '@/types';

interface PreviewToolbarProps {
  projectId?: string;
  fromHistory: boolean;
  isRefreshing: boolean;
  showExportMenu: boolean;
  showExportTasksPanel: boolean;
  isMultiSelectMode: boolean;
  selectedExportableCount: number;
  hasAllImages: boolean;
  exportTasks: ExportTask[];
  pages: Page[];
  onRefresh: () => void;
  onOpenProjectSettings: () => void;
  onOpenTemplateModal: () => void;
  onOpenMaterialModal: () => void;
  onToggleExportMenu: () => void;
  onToggleExportTasksPanel: () => void;
  onExport: (type: 'pptx' | 'pdf' | 'editable-pptx') => void;
}

export const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  projectId,
  fromHistory,
  isRefreshing,
  showExportMenu,
  showExportTasksPanel,
  isMultiSelectMode,
  selectedExportableCount,
  hasAllImages,
  exportTasks,
  pages,
  onRefresh,
  onOpenProjectSettings,
  onOpenTemplateModal,
  onOpenMaterialModal,
  onToggleExportMenu,
  onToggleExportTasksPanel,
  onExport,
}) => {
  const navigate = useNavigate();
  const projectExportTasks = exportTasks.filter(t => t.projectId === projectId);
  const processingTasks = projectExportTasks.filter(
    t => t.status === 'PROCESSING' || t.status === 'RUNNING' || t.status === 'PENDING'
  );

  return (
    <header className="h-14 md:h-16 bg-white border-b border-border flex items-center justify-between px-3 md:px-6 flex-shrink-0 z-10">
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        {/* 1. Logo First */}
        <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => navigate('/')}>
          <Logo size="md" />
        </div>

        {/* 2. Functional Navigation */}
        <div className="flex items-center gap-1 md:gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<Home size={16} />}
              onClick={() => navigate('/')}
              className="flex-shrink-0 hover:bg-gray-100 w-10 h-10 p-0 rounded-full"
              title="主页"
            />
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft size={18} />}
              onClick={() => {
                if (fromHistory) {
                  navigate('/history');
                } else {
                  navigate(`/project/${projectId}/detail`);
                }
              }}
              className="flex-shrink-0 hover:bg-gray-100 w-10 h-10 p-0 rounded-full"
              title="返回"
            />
        </div>

        <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
        <span className="text-sm font-sans text-secondary hidden sm:inline pl-2 font-bold uppercase tracking-wider">预览</span>
      </div>
      <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          icon={<Settings size={16} />}
          onClick={onOpenProjectSettings}
          className="hidden lg:inline-flex text-secondary hover:text-primary"
        >
          <span className="hidden xl:inline ml-1">设置</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Upload size={16} />}
          onClick={onOpenTemplateModal}
          className="hidden lg:inline-flex text-secondary hover:text-primary"
        >
          <span className="hidden xl:inline ml-1">模板</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<ImagePlus size={16} />}
          onClick={onOpenMaterialModal}
          className="hidden lg:inline-flex text-secondary hover:text-primary"
        >
          <span className="hidden xl:inline ml-1">素材</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={16} className={`${isRefreshing ? 'animate-spin' : ''}`} />}
          onClick={onRefresh}
          disabled={isRefreshing}
          className="hidden md:inline-flex w-9 h-9 p-0 rounded-none border border-transparent hover:border-border"
          title="刷新"
        />

        {/* 导出任务按钮 */}
        {projectExportTasks.length > 0 && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExportTasksPanel}
              className="relative rounded-none h-9 border border-transparent hover:border-border"
            >
              {processingTasks.length > 0 ? (
                <Loader2 size={16} className="animate-spin text-primary" />
              ) : (
                <FileText size={16} />
              )}
              <span className="ml-1 text-xs">
                {projectExportTasks.length}
              </span>
            </Button>
            {showExportTasksPanel && (
              <div className="absolute right-0 mt-2 z-20">
                <ExportTasksPanel
                  projectId={projectId}
                  pages={pages}
                  className="w-96 max-h-[28rem] shadow-xl border border-border"
                />
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <Button
            variant="primary"
            size="sm"
            icon={<Download size={14} />}
            onClick={onToggleExportMenu}
            disabled={isMultiSelectMode ? selectedExportableCount === 0 : !hasAllImages}
            className="text-xs md:text-sm rounded-none h-9 bg-primary text-white hover:bg-black"
          >
            <span className="hidden sm:inline">
              {isMultiSelectMode && selectedExportableCount > 0
                ? `导出 (${selectedExportableCount})`
                : '导出'}
            </span>
            <span className="sm:hidden">
              {isMultiSelectMode && selectedExportableCount > 0
                ? `(${selectedExportableCount})`
                : '导出'}
            </span>
          </Button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white shadow-xl border border-border py-2 z-10 animate-in fade-in zoom-in-95 duration-200">
              {isMultiSelectMode && selectedExportableCount > 0 && (
                <div className="px-4 py-2 text-xs text-secondary border-b border-border bg-gray-50 mb-1">
                  导出选中 {selectedExportableCount} 页
                </div>
              )}
              <button
                onClick={() => onExport('pptx')}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm text-primary"
              >
                导出 PPTX
              </button>
              <button
                onClick={() => onExport('editable-pptx')}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm text-primary flex items-center justify-between"
              >
                <span>导出可编辑 PPTX</span>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded">Beta</span>
              </button>
              <button
                onClick={() => onExport('pdf')}
                className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm text-primary"
              >
                导出 PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
