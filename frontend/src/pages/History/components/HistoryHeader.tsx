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
    <div className="mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">历史项目</h1>
        <p className="text-sm md:text-base text-gray-600">查看和管理你的所有项目</p>
      </div>
      {projectCount > 0 && selectedCount > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">已选择 {selectedCount} 项</span>
          <Button variant="secondary" size="sm" onClick={onClearSelection} disabled={isDeleting}>
            取消选择
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Trash2 size={16} />}
            onClick={onBatchDelete}
            disabled={isDeleting}
            loading={isDeleting}
          >
            批量删除
          </Button>
        </div>
      )}
    </div>
  );
};

export default HistoryHeader;
