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
import { Button, ExportTasksPanel } from '@/components/shared';
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
    <header className="h-14 md:h-16 bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-3 md:px-6 flex-shrink-0">
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
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
          onClick={() => {
            if (fromHistory) {
              navigate('/history');
            } else {
              navigate(`/project/${projectId}/detail`);
            }
          }}
          className="flex-shrink-0"
        >
          <span className="hidden sm:inline">返回</span>
        </Button>
        <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
          <span className="text-xl md:text-2xl">🍌</span>
          <span className="text-base md:text-xl font-bold truncate">蕉幻</span>
        </div>
        <span className="text-gray-400 hidden md:inline">|</span>
        <span className="text-sm md:text-lg font-semibold truncate hidden sm:inline">预览</span>
      </div>
      <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          icon={<Settings size={16} className="md:w-[18px] md:h-[18px]" />}
          onClick={onOpenProjectSettings}
          className="hidden lg:inline-flex"
        >
          <span className="hidden xl:inline">项目设置</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Upload size={16} className="md:w-[18px] md:h-[18px]" />}
          onClick={onOpenTemplateModal}
          className="hidden lg:inline-flex"
        >
          <span className="hidden xl:inline">更换模板</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<ImagePlus size={16} className="md:w-[18px] md:h-[18px]" />}
          onClick={onOpenMaterialModal}
          className="hidden lg:inline-flex"
        >
          <span className="hidden xl:inline">素材生成</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />}
          onClick={() => navigate(`/project/${projectId}/detail`)}
          className="hidden sm:inline-flex"
        >
          <span className="hidden md:inline">上一步</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={16} className={`md:w-[18px] md:h-[18px] ${isRefreshing ? 'animate-spin' : ''}`} />}
          onClick={onRefresh}
          disabled={isRefreshing}
          className="hidden md:inline-flex"
        >
          <span className="hidden lg:inline">刷新</span>
        </Button>

        {/* 导出任务按钮 */}
        {projectExportTasks.length > 0 && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExportTasksPanel}
              className="relative"
            >
              {processingTasks.length > 0 ? (
                <Loader2 size={16} className="animate-spin text-banana-500" />
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
                  className="w-96 max-h-[28rem] shadow-lg"
                />
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <Button
            variant="primary"
            size="sm"
            icon={<Download size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onToggleExportMenu}
            disabled={isMultiSelectMode ? selectedExportableCount === 0 : !hasAllImages}
            className="text-xs md:text-sm"
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
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
              {isMultiSelectMode && selectedExportableCount > 0 && (
                <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                  将导出选中的 {selectedExportableCount} 页（仅已生成图片的页面）
                </div>
              )}
              <button
                onClick={() => onExport('pptx')}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm"
              >
                导出为 PPTX
              </button>
              <button
                onClick={() => onExport('editable-pptx')}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm"
              >
                导出可编辑 PPTX（Beta）
              </button>
              <button
                onClick={() => onExport('pdf')}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm"
              >
                导出为 PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
