import React, { useState, useEffect } from 'react';
import { Clock, FileText, ChevronRight, Trash2 } from 'lucide-react';
import { getProjectTitle, getFirstPageImage, formatDate, getStatusText, getProjectDisplayCount } from '@/utils/projectUtils';
import type { Project } from '@/types';

export interface ProjectCardProps {
  project: Project;
  isSelected: boolean;
  isEditing: boolean;
  editingTitle: string;
  onSelect: (project: Project) => void;
  onToggleSelect: (projectId: string) => void;
  onDelete: (e: React.MouseEvent, project: Project) => void;
  onStartEdit: (e: React.MouseEvent, project: Project) => void;
  onTitleChange: (title: string) => void;
  onTitleKeyDown: (e: React.KeyboardEvent, projectId: string) => void;
  onSaveEdit: (projectId: string) => void;
  isBatchMode: boolean;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isSelected,
  isEditing,
  editingTitle,
  onSelect,
  onToggleSelect,
  onDelete,
  onStartEdit,
  onTitleChange,
  onTitleKeyDown,
  onSaveEdit,
  isBatchMode,
}) => {
  // 检测屏幕尺寸，只在非手机端加载图片（必须在早期返回之前声明hooks）
  const [shouldLoadImage, setShouldLoadImage] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      // sm breakpoint is 640px
      setShouldLoadImage(window.innerWidth >= 640);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const projectId = project.id || project.project_id;
  if (!projectId) return null;

  const title = getProjectTitle(project);
  const { count: displayCount, unit } = getProjectDisplayCount(project);
  const statusText = getStatusText(project);

  
  const firstPageImage = shouldLoadImage ? getFirstPageImage(project) : null;

  return (
    <div
      className={`p-4 md:p-6 transition-all border-b border-border bg-white group ${
        isSelected 
          ? 'bg-gray-50' 
          : 'hover:bg-gray-50'
      } ${isBatchMode ? 'cursor-default' : 'cursor-pointer'}`}
      onClick={() => onSelect(project)}
    >
      <div className="flex items-start gap-4 md:gap-6">
        {/* 复选框 */}
        <div className="pt-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(projectId)}
            className="w-4 h-4 accent-black cursor-pointer"
          />
        </div>
        
        {/* 中间：项目信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {isEditing ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                onKeyDown={(e) => onTitleKeyDown(e, projectId)}
                onBlur={() => onSaveEdit(projectId)}
                autoFocus
                className="text-lg font-serif font-medium text-primary px-2 py-1 border-b border-primary bg-transparent focus:outline-none w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3 
                className={`text-lg font-serif font-medium text-primary truncate ${
                  isBatchMode 
                    ? 'cursor-default' 
                    : 'cursor-pointer group-hover:text-black transition-colors'
                }`}
                onClick={(e) => onStartEdit(e, project)}
                title={isBatchMode ? undefined : "点击编辑名称"}
              >
                {title}
              </h3>
            )}
            <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold border border-border text-secondary`}>
              {statusText}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-sans text-secondary flex-wrap">
            <span className="flex items-center gap-1.5">
              <FileText size={12} />
              {displayCount} {unit}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} />
              {formatDate(project.updated_at || project.created_at)}
            </span>
          </div>
        </div>
        
        {/* 右侧：图片预览 */}
        <div className="hidden sm:block w-32 h-20 md:w-48 md:h-28 bg-gray-100 border border-border flex-shrink-0">
          {firstPageImage ? (
            <img
              src={firstPageImage}
              alt="第一页预览"
              className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <span className="font-serif italic text-xs">No Preview</span>
            </div>
          )}
        </div>
        
        {/* 右侧：操作按钮 */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 flex-shrink-0 self-center">
          <button
            onClick={(e) => onDelete(e, project)}
            className="p-2 text-secondary hover:text-black transition-colors opacity-0 group-hover:opacity-100"
            title="删除项目"
          >
            <Trash2 size={16} />
          </button>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </div>
  );
};

