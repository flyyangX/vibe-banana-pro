import React, { useEffect, useRef } from 'react';

interface HeroGridProps {
  mousePos: { x: number; y: number };
}

export const HeroGrid: React.FC<HeroGridProps> = ({ mousePos }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const drawGrid = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      const gridSize = 40; // Size of grid cells
      const snapRadius = 150; // Radius where snapping occurs
      const snapStrength = 15; // Max pixel offset

      // Draw Vertical Lines
      for (let x = 0; x <= width; x += gridSize) {
        let drawX = x;
        // Simple proximity check for column against mouse point
        
        // Check if mouse is near this vertical line
        const dx = x - mousePos.x;
        const distanceToLine = Math.abs(dx);
        
        let isActive = false;

        if (distanceToLine < snapRadius) {
           const offsetDir = dx > 0 ? 1 : -1;
           const offset = offsetDir * snapStrength * (1 - distanceToLine / snapRadius);
           drawX = x + offset;
           isActive = true;
        }

        ctx.beginPath();
        ctx.strokeStyle = isActive ? '#000000' : '#E5E7EB';
        ctx.lineWidth = isActive ? 1.5 : 1;
        ctx.moveTo(drawX, 0);
        ctx.lineTo(drawX, height);
        ctx.stroke();
      }

      // Draw Horizontal Lines
      for (let y = 0; y <= height; y += gridSize) {
        let drawY = y;
        const dy = y - mousePos.y;
        const distanceToLine = Math.abs(dy);

        let isActive = false;

        if (distanceToLine < snapRadius) {
            const offsetDir = dy > 0 ? 1 : -1;
            const offset = offsetDir * snapStrength * (1 - distanceToLine / snapRadius);
            drawY = y + offset;
            isActive = true;
        }

        ctx.beginPath();
        ctx.strokeStyle = isActive ? '#000000' : '#E5E7EB';
        ctx.lineWidth = isActive ? 1.5 : 1;
        ctx.moveTo(0, drawY);
        ctx.lineTo(width, drawY);
        ctx.stroke();
      }
    };

    const render = () => {
      drawGrid();
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [mousePos]);

  // Handle Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    
    window.addEventListener('resize', resize);
    resize();
    
    return () => window.removeEventListener('resize', resize);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
};
