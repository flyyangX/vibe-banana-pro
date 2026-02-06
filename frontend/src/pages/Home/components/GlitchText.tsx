import React, { useState } from 'react';

interface GlitchTextProps {
  text: string;
}

export const GlitchText: React.FC<GlitchTextProps> = ({ text }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Split text into slices for the effect
  // We will create multiple layers of the same text and clip them
  
  return (
    <div 
      className="relative cursor-default select-none group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Base Text */}
      <h1 className="font-serif text-[80px] md:text-[100px] font-bold tracking-tighter text-black relative z-10 leading-none">
        {text}
      </h1>

      {/* Glitch Slices - Only visible on hover */}
      {/* We use strict clip-paths to slice the text horizontally */}
      
      {/* Slice 1: Top */}
      <div 
        className={`absolute inset-0 font-serif text-[80px] md:text-[100px] font-bold tracking-tighter text-black leading-none pointer-events-none transition-transform duration-100 ease-linear ${isHovered ? 'translate-x-[-12px] opacity-100' : 'translate-x-0 opacity-0'}`}
        style={{ clipPath: 'inset(0 0 66% 0)' }}
      >
        {text}
      </div>

      {/* Slice 2: Middle - moves right */}
      <div 
        className={`absolute inset-0 font-serif text-[80px] md:text-[100px] font-bold tracking-tighter text-black leading-none pointer-events-none transition-transform duration-100 ease-linear ${isHovered ? 'translate-x-[12px] opacity-100' : 'translate-x-0 opacity-0'}`}
        style={{ clipPath: 'inset(33% 0 33% 0)' }}
      >
        {text}
      </div>

      {/* Slice 3: Bottom - moves left again */}
      <div 
        className={`absolute inset-0 font-serif text-[80px] md:text-[100px] font-bold tracking-tighter text-black leading-none pointer-events-none transition-transform duration-100 ease-linear ${isHovered ? 'translate-x-[-8px] opacity-100' : 'translate-x-0 opacity-0'}`}
        style={{ clipPath: 'inset(66% 0 0 0)' }}
      >
        {text}
      </div>
      
      {/* Decorative mechanical marker */}
      <div className={`absolute -right-8 top-0 h-full w-[1px] bg-black transition-opacity duration-75 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
         <div className="absolute top-0 right-0 w-2 h-[1px] bg-black"></div>
         <div className="absolute bottom-0 right-0 w-2 h-[1px] bg-black"></div>
         <div className="absolute top-1/2 right-0 w-4 h-[1px] bg-black"></div>
      </div>
    </div>
  );
};
