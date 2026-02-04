import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/shared';
import { getImageUrl } from '@/api/client';
import type { Page, ImageVersion } from '@/types';

interface PreviewCanvasProps {
  projectId?: string;
  pages: Page[];
  selectedIndex: number;
  selectedPage?: Page;
  imageUrl: string;
  imageVersions: ImageVersion[];
  showVersionMenu: boolean;
  isRefreshing: boolean;
  pageGeneratingTasks: Record<string, string>;
  onSelectIndex: (index: number) => void;
  onSetShowVersionMenu: (show: boolean) => void;
  onSwitchVersion: (versionId: string) => void;
  onEditPage: () => void;
  onClearPageImage: () => void;
  onRegeneratePage: () => void;
  onRefresh: () => void;
  onOpenTemplateModal: () => void;
  onOpenMaterialModal: () => void;
  formatElapsed: (seconds: number) => string;
  getElapsedSeconds: (pageId?: string | null) => number | undefined;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  projectId,
  pages,
  selectedIndex,
  selectedPage,
  imageUrl,
  imageVersions,
  showVersionMenu,
  isRefreshing,
  pageGeneratingTasks,
  onSelectIndex,
  onSetShowVersionMenu,
  onSwitchVersion,
  onEditPage,
  onClearPageImage,
  onRegeneratePage,
  onRefresh,
  onOpenTemplateModal,
  onOpenMaterialModal,
  formatElapsed,
  getElapsedSeconds,
}) => {
  const navigate = useNavigate();

  if (pages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <div className="text-center">
          <div className="text-4xl md:text-6xl mb-4">📊</div>
          <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">
            还没有页面
          </h3>
          <p className="text-sm md:text-base text-gray-500 mb-6">
            请先返回编辑页面添加内容
          </p>
          <Button
            variant="primary"
            onClick={() => navigate(`/project/${projectId}/outline`)}
            className="text-sm md:text-base"
          >
            返回编辑
          </Button>
        </div>
      </div>
    );
  }

  const isPageGenerating = selectedPage?.id && pageGeneratingTasks[selectedPage.id];
  const elapsedSeconds = getElapsedSeconds(selectedPage?.id);

  return (
    <>
      {/* 预览区 */}
      <div className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center p-4 md:p-8">
        <div className="max-w-5xl w-full">
          <div className="relative aspect-video bg-white rounded-lg shadow-xl overflow-hidden touch-manipulation">
            {selectedPage?.generated_image_path ? (
              <img
                src={imageUrl}
                alt={`Slide ${selectedIndex + 1}`}
                className="w-full h-full object-cover select-none"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="text-6xl mb-4">🍌</div>
                  <p className="text-gray-500 mb-4">
                    {isPageGenerating
                      ? `正在生成中... 已运行 ${formatElapsed(elapsedSeconds || 0)}`
                      : selectedPage?.status === 'GENERATING' && typeof elapsedSeconds === 'number'
                      ? `正在生成中... 已运行 ${formatElapsed(elapsedSeconds || 0)}`
                      : selectedPage?.status === 'GENERATING'
                      ? '正在生成中...'
                      : '尚未生成图片'}
                  </p>
                  {!isPageGenerating && selectedPage?.status !== 'GENERATING' && (
                    <Button
                      variant="primary"
                      onClick={onRegeneratePage}
                    >
                      生成此页
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 控制栏 */}
      <div className="bg-white border-t border-gray-200 px-3 md:px-6 py-3 md:py-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-5xl mx-auto">
          {/* 导航 */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <Button
              variant="ghost"
              size="sm"
              icon={<ChevronLeft size={16} className="md:w-[18px] md:h-[18px]" />}
              onClick={() => onSelectIndex(Math.max(0, selectedIndex - 1))}
              disabled={selectedIndex === 0}
              className="text-xs md:text-sm"
            >
              <span className="hidden sm:inline">上一页</span>
              <span className="sm:hidden">上一页</span>
            </Button>
            <span className="px-2 md:px-4 text-xs md:text-sm text-gray-600 whitespace-nowrap">
              {selectedIndex + 1} / {pages.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={<ChevronRight size={16} className="md:w-[18px] md:h-[18px]" />}
              onClick={() => onSelectIndex(Math.min(pages.length - 1, selectedIndex + 1))}
              disabled={selectedIndex === pages.length - 1}
              className="text-xs md:text-sm"
            >
              <span className="hidden sm:inline">下一页</span>
              <span className="sm:hidden">下一页</span>
            </Button>
          </div>

          {/* 操作 */}
          <div className="flex items-center gap-1.5 md:gap-2 w-full sm:w-auto justify-center">
            <Button
              variant="ghost"
              size="sm"
              icon={<ImagePlus size={16} />}
              onClick={() => navigate(`/project/${projectId}/materials`)}
              className="hidden lg:inline-flex text-xs"
            >
              素材库
            </Button>
            {/* 手机端：模板更换按钮 */}
            <Button
              variant="ghost"
              size="sm"
              icon={<Upload size={16} />}
              onClick={onOpenTemplateModal}
              className="lg:hidden text-xs"
              title="更换模板"
            />
            {/* 手机端：素材生成按钮 */}
            <Button
              variant="ghost"
              size="sm"
              icon={<ImagePlus size={16} />}
              onClick={onOpenMaterialModal}
              className="lg:hidden text-xs"
              title="素材生成"
            />
            {/* 手机端：刷新按钮 */}
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />}
              onClick={onRefresh}
              disabled={isRefreshing}
              className="md:hidden text-xs"
              title="刷新"
            />
            {imageVersions.length > 1 && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSetShowVersionMenu(!showVersionMenu)}
                  className="text-xs md:text-sm"
                >
                  <span className="hidden md:inline">历史版本 ({imageVersions.length})</span>
                  <span className="md:hidden">版本</span>
                </Button>
                {showVersionMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-56 md:w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 max-h-96 overflow-y-auto">
                    {imageVersions.map((version) => (
                      <button
                        key={version.version_id}
                        onClick={() => onSwitchVersion(version.version_id)}
                        className={`w-full px-3 md:px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center justify-between text-xs md:text-sm ${
                          version.is_current ? 'bg-banana-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>
                            版本 {version.version_number}
                          </span>
                          {version.is_current && (
                            <span className="text-xs text-banana-600 font-medium">
                              (当前)
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 hidden md:inline">
                          {version.created_at
                            ? new Date(version.created_at).toLocaleString('zh-CN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={onEditPage}
              disabled={!selectedPage?.generated_image_path}
              className="text-xs md:text-sm flex-1 sm:flex-initial"
            >
              编辑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearPageImage}
              disabled={!selectedPage?.generated_image_path || (selectedPage?.id ? !!pageGeneratingTasks[selectedPage.id] : false)}
              className="text-xs md:text-sm flex-1 sm:flex-initial"
            >
              清除图片
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegeneratePage}
              disabled={selectedPage?.id && pageGeneratingTasks[selectedPage.id] ? true : false}
              className="text-xs md:text-sm flex-1 sm:flex-initial"
            >
              {selectedPage?.id && pageGeneratingTasks[selectedPage.id]
                ? '生成中...'
                : '重新生成'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
