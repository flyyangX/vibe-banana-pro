import React from 'react';
import { Loading } from '@/components/shared';

interface HistoryLoadingStateProps {
  message?: string;
}

export const HistoryLoadingState: React.FC<HistoryLoadingStateProps> = ({ message }) => {
  return (
    <div className="flex items-center justify-center py-12">
      <Loading message={message || '加载中...'} />
    </div>
  );
};

export default HistoryLoadingState;
