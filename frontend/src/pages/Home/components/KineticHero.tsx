import React, { useState, useRef } from 'react';
import { HeroGrid } from './HeroGrid';
import { GlitchText } from './GlitchText';
import { ArrowDown } from 'lucide-react';

export const KineticHero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseLeave = () => {
    setMousePos({ x: -1000, y: -1000 });
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-[600px] relative flex flex-col items-center justify-center overflow-hidden border-b border-gray-200 bg-white"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Canvas Grid Layer */}
      <HeroGrid mousePos={mousePos} />
      
      {/* Content Layer */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-2">
           <span className="font-mono text-xs uppercase tracking-[0.2em] text-gray-400">[ SYSTEM_READY ]</span>
        </div>
        
        <GlitchText text="ViveVision" />
        
        <div className="mt-8 max-w-md text-center">
          <p className="font-mono text-sm text-gray-500 uppercase tracking-wide leading-relaxed">
            Kinetic Presentation Terminal<br/>
            Neural Rendering Engine V1.0
          </p>
        </div>
      </div>

      {/* Industrial Decorative Elements */}
      <div className="absolute top-8 left-8 w-4 h-4 border-l border-t border-black"></div>
      <div className="absolute top-8 right-8 w-4 h-4 border-r border-t border-black"></div>
      <div className="absolute bottom-8 left-8 w-4 h-4 border-l border-b border-black"></div>
      <div className="absolute bottom-8 right-8 w-4 h-4 border-r border-b border-black"></div>
      
      {/* Scroll Indicator */}
      <div className="absolute bottom-12 animate-bounce">
        <ArrowDown size={16} className="text-gray-400" />
      </div>
    </div>
  );
};
