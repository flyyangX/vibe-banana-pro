import React from 'react';
import { Home } from 'lucide-react';
import { Logo } from '@/components/shared';


interface HistoryNavbarProps {
  onGoHome: () => void;
}

export const HistoryNavbar: React.FC<HistoryNavbarProps> = ({ onGoHome }) => {
  return (
    <nav className="h-14 md:h-16 bg-white border-b border-border">
      <div className="max-w-6xl mx-auto px-3 md:px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onGoHome}>
          <Logo size="md" />
          <span className="text-sm font-medium text-gray-400">History</span>
        </div>
        <div className="flex items-center gap-6 text-[13px] font-medium text-secondary">
          <button onClick={onGoHome} className="hover:text-primary transition-colors flex items-center gap-2">
            <Home size={14} />
            返回首页
          </button>
        </div>
      </div>
    </nav>
  );
};

export default HistoryNavbar;
