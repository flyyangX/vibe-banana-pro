import React from 'react';
import { Copy, MoveRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/shared';

type BulkActionsBarProps = {
  selectedCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  onBulkMove: () => void;
  onBulkCopy: () => void;
  onBulkDelete: () => void;
};

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onSelectAll,
  onClear,
  onBulkMove,
  onBulkCopy,
  onBulkDelete,
}) => {
  return (
    <div className="mb-4 bg-white border border-gray-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="text-sm text-gray-700">
        已选择 <span className="font-semibold">{selectedCount}</span> 个素材
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={onSelectAll}>
          全选（当前列表）
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          清空选择
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<MoveRight size={14} />}
          onClick={onBulkMove}
          disabled={selectedCount === 0}
        >
          批量移动
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Copy size={14} />}
          onClick={onBulkCopy}
          disabled={selectedCount === 0}
        >
          批量复制
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Trash2 size={14} />}
          onClick={onBulkDelete}
          disabled={selectedCount === 0}
        >
          批量删除
        </Button>
      </div>
    </div>
  );
};
