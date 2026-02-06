import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity duration-200"
        onClick={onClose}
      />
      
      {/* 对话框 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={cn(
            'relative bg-white shadow-2xl w-full transition-all duration-200 border border-black',
            sizes[size]
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题栏 */}
          {title && (
            <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-black uppercase tracking-wide">{title}</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-black transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          )}
          
          {/* 内容 */}
          <div className="px-8 py-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

