import React from 'react';
import { Button, Card } from '@/components/shared';

interface HistoryErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const HistoryErrorState: React.FC<HistoryErrorStateProps> = ({ message, onRetry }) => {
  return (
    <Card className="p-8 text-center">
      <div className="text-6xl mb-4">⚠️</div>
      <p className="text-gray-600 mb-4">{message}</p>
      <Button variant="primary" onClick={onRetry}>
        重试
      </Button>
    </Card>
  );
};

export default HistoryErrorState;
