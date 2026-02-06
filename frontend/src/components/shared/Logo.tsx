import React from 'react';
import logo from '@/assets/logo.png';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  showText = true,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={logo} 
        alt="ViveVision Logo" 
        className={`${sizeClasses[size]} w-auto object-contain`} 
      />
      {showText && (
        <span className={`font-serif font-black tracking-tighter ${
          size === 'sm' ? 'text-lg' : 
          size === 'md' ? 'text-xl' : 'text-2xl'
        }`}>
          ViveVision
        </span>
      )}
    </div>
  );
};
