import React from 'react';
import { Button, Card } from '@/components/shared';

interface HistoryEmptyStateProps {
  onCreateProject: () => void;
}

export const HistoryEmptyState: React.FC<HistoryEmptyStateProps> = ({ onCreateProject }) => {
  return (
    <Card className="p-12 text-center">
      <div className="text-6xl mb-4">📭</div>
      <h3 className="text-xl font-semibold text-gray-700 mb-2">暂无历史项目</h3>
      <p className="text-gray-500 mb-6">创建你的第一个项目开始使用吧</p>
      <Button variant="primary" onClick={onCreateProject}>
        创建新项目
      </Button>
    </Card>
  );
};

export default HistoryEmptyState;
