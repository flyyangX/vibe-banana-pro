import React from 'react';
import { ZoomIn, Move, Trash2, Image as ImageIcon, Edit2 } from 'lucide-react';
import { Logo } from '@/components/shared';
import { StatusBadge, Skeleton, useConfirm } from '@/components/shared';
import { getImageUrl } from '@/api/client';
import type { Page } from '@/types';

interface SlideCardProps {
  page: Page;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isGenerating?: boolean;
  elapsedSeconds?: number;
}

export const SlideCard: React.FC<SlideCardProps> = ({
  page,
  index,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  isGenerating = false,
  elapsedSeconds,
}) => {
  const { confirm, ConfirmDialog } = useConfirm();
  const imageUrl = page.generated_image_path
    ? getImageUrl(page.generated_image_path, page.updated_at)
    : '';
  
  const generating = isGenerating || page.status === 'GENERATING';

  const formatElapsed = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div
      className={`group cursor-pointer transition-all border outline-none ${
        isSelected ? 'border-primary ring-1 ring-primary bg-gray-50' : 'border-transparent hover:border-gray-200'
      }`}
      onClick={onClick}
    >
      {/* 缩略图 */}
      <div className="relative aspect-video bg-gray-50 overflow-hidden mb-2 border border-border">
        {generating ? (
          <Skeleton className="w-full h-full" />
        ) : page.generated_image_path ? (
          <>
            <img
              src={imageUrl}
              alt={`Slide ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {/* 悬停操作 */}
            <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 border border-primary">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 text-primary hover:bg-gray-100 transition-colors border border-primary rounded-none"
                title="编辑"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  confirm(
                    '确定要删除这一页吗？',
                    onDelete,
                    { title: '确认删除', variant: 'danger' }
                  );
                }}
                className="p-2 text-primary hover:bg-red-50 hover:text-red-600 transition-colors border border-primary hover:border-red-600 rounded-none"
                title="删除"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <div className="text-center">
              <div className="mb-1 flex justify-center opacity-50 grayscale">
                <Logo size="md" showText={false} />
              </div>
              <div className="text-[10px] font-sans uppercase tracking-wider">Not Generated</div>
            </div>
          </div>
        )}
        
        {/* 计时角标 */}
        {generating && typeof elapsedSeconds === 'number' && (
          <div className="absolute top-2 left-2 text-[10px] px-2 py-0.5 bg-black text-white font-mono">
            {formatElapsed(elapsedSeconds)}
          </div>
        )}

        {/* 状态标签 */}
        <div className="absolute bottom-2 right-2">
          <StatusBadge status={page.status} />
        </div>
      </div>

      {/* 标题 */}
      <div className="flex items-center gap-2 px-1">
        <span
          className={`text-xs font-sans truncate ${
            isSelected ? 'text-primary font-bold' : 'text-secondary'
          }`}
        >
          {String(index + 1).padStart(2, '0')}. {page.outline_content.title}
        </span>
      </div>
      {ConfirmDialog}
    </div>
  );
};

