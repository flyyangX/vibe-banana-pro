import React from 'react';

interface HistorySelectToolbarProps {
  projectCount: number;
  selectedCount: number;
  isAllSelected: boolean;
  onToggleAll: () => void;
}

export const HistorySelectToolbar: React.FC<HistorySelectToolbarProps> = ({
  projectCount,
  selectedCount,
  isAllSelected,
  onToggleAll,
}) => {
  if (projectCount === 0) return null;

  return (
    <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isAllSelected && projectCount > 0}
          onChange={onToggleAll}
          className="w-4 h-4 text-banana-600 border-gray-300 rounded focus:ring-banana-500"
        />
        <span className="text-sm text-gray-700">{selectedCount === projectCount ? '取消全选' : '全选'}</span>
      </label>
    </div>
  );
};

export default HistorySelectToolbar;
