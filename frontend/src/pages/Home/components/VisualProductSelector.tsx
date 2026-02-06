import React from 'react';
import { Monitor, FileImage, Smartphone } from 'lucide-react';

interface VisualProductSelectorProps {
  value: 'ppt' | 'infographic' | 'xiaohongshu';
  onChange: (value: 'ppt' | 'infographic' | 'xiaohongshu') => void;
  disabled?: boolean;
}

export const VisualProductSelector: React.FC<VisualProductSelectorProps> = ({
  value,
  onChange,
  disabled
}) => {
  const options = [
    { id: 'ppt', label: '演示文稿 / PPT' },
    { id: 'infographic', label: '信息长图' },
    { id: 'xiaohongshu', label: '小红书笔记' }
  ] as const;

  return (
    <div className="flex items-center gap-8 w-full border-b border-gray-100 pb-4 mb-6">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-2">生成类型:</span>
      {options.map((option) => {
        const isSelected = value === option.id;
        return (
          <button
            key={option.id}
            onClick={() => !disabled && onChange(option.id)}
            disabled={disabled}
            className={`
              text-sm font-medium transition-all duration-200 relative
              ${isSelected ? 'text-black' : 'text-gray-400 hover:text-black'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {option.label}
            {isSelected && (
              <span className="absolute -bottom-[17px] left-0 w-full h-[1px] bg-black"></span>
            )}
          </button>
        );
      })}
    </div>
  );
};
