import React, { useState, useEffect } from 'react';
import { GripVertical, Edit2, Trash2, Check, X } from 'lucide-react';
import { Card, useConfirm, Markdown, ShimmerOverlay } from '@/components/shared';
import type { Page, PageType } from '@/types';

interface OutlineCardProps {
  page: Page;
  index: number;
  totalPages: number;
  onUpdate: (data: Partial<Page>) => void;
  onDelete: () => void;
  onClick: () => void;
  isSelected: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isAiRefining?: boolean;
}

export const OutlineCard: React.FC<OutlineCardProps> = ({
  page,
  index,
  totalPages,
  onUpdate,
  onDelete,
  onClick,
  isSelected,
  dragHandleProps,
  isAiRefining = false,
}) => {
  const { confirm, ConfirmDialog } = useConfirm();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(page.outline_content.title);
  const [editPoints, setEditPoints] = useState(page.outline_content.points.join('\n'));

  // Logic for page type labels and inference remains same
  const pageTypeLabels: Record<PageType, string> = {
    auto: '自动',
    cover: '封面',
    content: '内容',
    transition: '过渡',
    ending: '结尾',
  };

  const inferPageType = () => {
    const title = page.outline_content?.title || '';
    const titleLower = title.toLowerCase();
    const transitionKeywords = ['过渡', '章节', '部分', '目录', '篇章', 'section', 'part', 'agenda', 'outline', 'overview'];
    const endingKeywords = ['结尾', '总结', '致谢', '谢谢', 'ending', 'summary', 'thanks', 'q&a', 'qa', '结论', '回顾'];

    if (index === 0) return { type: 'cover' as PageType, reason: '第 1 页默认封面' };
    if (totalPages > 0 && index === totalPages - 1) return { type: 'ending' as PageType, reason: '最后一页默认结尾' };
    if (transitionKeywords.some((keyword) => titleLower.includes(keyword))) return { type: 'transition' as PageType, reason: `标题包含关键词：${title}` };
    if (endingKeywords.some((keyword) => titleLower.includes(keyword))) return { type: 'ending' as PageType, reason: `标题包含关键词：${title}` };
    return { type: 'content' as PageType, reason: '默认内容页' };
  };

  const currentType = (page.page_type || 'auto') as PageType;
  const inferred = inferPageType();
  const displayType = currentType === 'auto' ? inferred.type : currentType;

  // Effects
  useEffect(() => {
    if (!isEditing) {
      setEditTitle(page.outline_content.title);
      setEditPoints(page.outline_content.points.join('\n'));
    }
  }, [page.outline_content.title, page.outline_content.points, isEditing]);

  const handleSave = () => {
    onUpdate({
      outline_content: {
        title: editTitle,
        points: editPoints.split('\n').filter((p) => p.trim()),
      },
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(page.outline_content.title);
    setEditPoints(page.outline_content.points.join('\n'));
    setIsEditing(false);
  };

  return (
    <div
      className={`relative group bg-white border transition-all duration-200 ${
        isSelected ? 'border-black ring-1 ring-black z-10' : 'border-gray-200 hover:border-black'
      }`}
      onClick={!isEditing ? onClick : undefined}
    >
      <ShimmerOverlay show={isAiRefining} />
      
      <div className="flex items-stretch min-h-[100px]">
        {/* Left: Drag Handle & Number */}
        <div 
          className="w-8 flex-shrink-0 border-r border-gray-100 flex flex-col items-center bg-gray-50"
        >
          <div 
            {...dragHandleProps}
            className="h-8 w-full flex items-center justify-center cursor-move text-gray-400 hover:text-black hover:bg-gray-200 transition-colors"
          >
            <GripVertical size={14} />
          </div>
          <div className="flex-1 flex items-center justify-center">
             <span className="text-[10px] font-mono font-bold text-gray-400 -rotate-90 whitespace-nowrap">
               PAGE {String(index + 1).padStart(2, '0')}
             </span>
          </div>
        </div>

        {/* Right: Content */}
        <div className="flex-1 min-w-0 p-3 md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3 mb-2">
             <div className="flex flex-wrap items-center gap-1.5">
                {page.part && (
                  <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-900 rounded-full font-bold uppercase tracking-wider border border-gray-200">
                    {page.part}
                  </span>
                )}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                    displayType === 'cover' ? 'bg-black text-white border-black' :
                    displayType === 'ending' ? 'bg-gray-100 text-gray-900 border-gray-200' :
                    'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {pageTypeLabels[displayType]}
                </span>
             </div>
             
             {/* Edit/Delete Actions */}
             {!isEditing && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                  className="p-1 text-gray-400 hover:text-black hover:bg-gray-100"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirm('确定要删除此页吗?', onDelete, { title: '删除页面', variant: 'danger' });
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            /* 编辑模式 */
            <div className="space-y-3 px-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border-b border-black font-bold text-sm focus:outline-none"
                placeholder="页面标题"
              />
              <textarea
                value={editPoints}
                onChange={(e) => setEditPoints(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-gray-50 border-b border-gray-200 focus:border-black font-mono text-xs focus:outline-none resize-none"
                placeholder="要点内容 (每行一条)"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-xs font-bold text-gray-500 hover:text-black uppercase"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-1 text-xs font-bold bg-black text-white hover:bg-gray-800 uppercase"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            /* 查看模式 */
            <div className="px-1">
              <h4 className="font-bold text-base text-black mb-3 font-serif leading-tight">
                {page.outline_content.title}
              </h4>
              
              <div className="text-gray-600 text-xs leading-relaxed font-sans space-y-1">
                <div className="line-clamp-4">
                   <Markdown>{page.outline_content.points.join('\n')}</Markdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {ConfirmDialog}
    </div>
  );
};
