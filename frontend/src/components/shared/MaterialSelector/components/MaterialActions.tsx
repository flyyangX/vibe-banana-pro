import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/shared';
import { MaterialUploader } from './MaterialUploader';
import type { Project } from '@/types';

interface MaterialActionsProps {
  materials: { length: number };
  selectedCount: number;
  isLoading: boolean;
  isUploading: boolean;
  filterProjectId: string;
  projects: Project[];
  projectId?: string;
  showAllProjects: boolean;
  onFilterChange: (value: string) => void;
  onShowAllProjects: () => void;
  onRefresh: () => void;
  onUpload: (files: File[]) => void;
  onOpenGenerator: () => void;
  onClearSelection: () => void;
  renderProjectLabel: (p: Project) => string;
}

export const MaterialActions: React.FC<MaterialActionsProps> = ({
  materials,
  selectedCount,
  isLoading,
  isUploading,
  filterProjectId,
  projects,
  projectId,
  showAllProjects,
  onFilterChange,
  onShowAllProjects,
  onRefresh,
  onUpload,
  onOpenGenerator,
  onClearSelection,
  renderProjectLabel,
}) => {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'show_more') {
      onShowAllProjects();
      return;
    }
    onFilterChange(value);
  };

  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>{materials.length > 0 ? `共 ${materials.length} 个素材` : '暂无素材'}</span>
        {selectedCount > 0 && (
          <span className="ml-2 text-banana-600">已选择 {selectedCount} 个</span>
        )}
        {isLoading && materials.length > 0 && (
          <RefreshCw size={14} className="animate-spin text-gray-400" />
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {/* 项目筛选下拉菜单 */}
        <select
          value={filterProjectId}
          onChange={handleSelectChange}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-banana-500 w-40 sm:w-48 max-w-[200px] truncate"
        >
          {/* 固定显示的前三个选项 */}
          <option value="all">所有素材</option>
          <option value="none">未关联项目</option>
          {projectId && (
            <option value={projectId}>
              当前项目
              {projects.find((p) => p.project_id === projectId)
                ? `: ${renderProjectLabel(projects.find((p) => p.project_id === projectId)!)}`
                : ''}
            </option>
          )}

          {/* 展开后显示所有项目 */}
          {showAllProjects ? (
            <>
              <option disabled>───────────</option>
              {projects
                .filter((p) => p.project_id !== projectId)
                .map((p) => (
                  <option key={p.project_id} value={p.project_id} title={p.idea_prompt || p.outline_text}>
                    {renderProjectLabel(p)}
                  </option>
                ))}
            </>
          ) : (
            // 未展开时显示"查看更多项目"选项
            projects.length > (projectId ? 1 : 0) && <option value="show_more">+ 查看更多项目...</option>
          )}
        </select>

        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={16} />}
          onClick={onRefresh}
          disabled={isLoading}
        >
          刷新
        </Button>

        {/* 上传按钮 */}
        <MaterialUploader isUploading={isUploading} onUpload={onUpload} />

        {/* 素材生成按钮 */}
        {projectId && (
          <Button variant="ghost" size="sm" icon={<Sparkles size={16} />} onClick={onOpenGenerator}>
            生成素材
          </Button>
        )}

        {selectedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            清空选择
          </Button>
        )}
      </div>
    </div>
  );
};
