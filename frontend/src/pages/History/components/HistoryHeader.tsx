import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/shared';

interface HistoryHeaderProps {
  projectCount: number;
  selectedCount: number;
  isDeleting: boolean;
  onClearSelection: () => void;
  onBatchDelete: () => void;
}

export const HistoryHeader: React.FC<HistoryHeaderProps> = ({
  projectCount,
  selectedCount,
  isDeleting,
  onClearSelection,
  onBatchDelete,
}) => {
  return (
    <div className="mb-8 flex flex-col sm:flex-row items-end justify-between gap-4 border-b border-border pb-6">
      <div>
        <h1 className="text-3xl font-serif font-medium text-primary mb-1">我的项目</h1>
        <p className="text-sm font-sans text-secondary">管理您的所有创作内容</p>
      </div>
      {projectCount > 0 && selectedCount > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-secondary uppercase tracking-wider">已选 {selectedCount} 项</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearSelection} 
            className="text-xs hover:bg-gray-100 rounded-none h-8"
            disabled={isDeleting}
          >
            取消
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Trash2 size={14} />}
            onClick={onBatchDelete}
            disabled={isDeleting}
            loading={isDeleting}
            className="bg-primary text-white hover:bg-black rounded-none h-8 text-xs border-none"
          >
            删除
          </Button>
        </div>
      )}
    </div>
  );
};

export default HistoryHeader;
