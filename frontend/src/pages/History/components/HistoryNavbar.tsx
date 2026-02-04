import React from 'react';
import { Home } from 'lucide-react';
import { Button } from '@/components/shared';

interface HistoryNavbarProps {
  onGoHome: () => void;
}

export const HistoryNavbar: React.FC<HistoryNavbarProps> = ({ onGoHome }) => {
  return (
    <nav className="h-14 md:h-16 bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-3 md:px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-banana-500 to-banana-600 rounded-lg flex items-center justify-center text-xl md:text-2xl">
            🍌
          </div>
          <span className="text-lg md:text-xl font-bold text-gray-900">蕉幻</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="sm"
            icon={<Home size={16} className="md:w-[18px] md:h-[18px]" />}
            onClick={onGoHome}
            className="text-xs md:text-sm"
          >
            <span className="hidden sm:inline">主页</span>
            <span className="sm:hidden">主页</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default HistoryNavbar;
