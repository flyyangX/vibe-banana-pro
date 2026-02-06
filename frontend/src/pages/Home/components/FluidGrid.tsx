import React, { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
}

export const FluidGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const gridConfig = {
    spacing: 50, // Grid cell size
    mouseRadius: 200, // Radius of influence
    mouseStrength: 0.1, // Push force factor
    elasticity: 0.05, // Spring stiffness (return to origin)
    damping: 0.9, // Friction (velocity decay)
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // We want mouse interaction even if hovering over other elements on top,
    // so we track window mouse relative to canvas.
    const handleWindowMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        mouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    window.addEventListener('mousemove', handleWindowMouseMove);

    let animationFrameId: number;
    let cols = 0;
    let rows = 0;

    const initPoints = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      cols = Math.ceil(width / gridConfig.spacing) + 1;
      rows = Math.ceil(height / gridConfig.spacing) + 1;
      
      const newPoints: Point[] = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          newPoints.push({
            x: x * gridConfig.spacing,
            y: y * gridConfig.spacing,
            originX: x * gridConfig.spacing,
            originY: y * gridConfig.spacing,
            vx: 0,
            vy: 0
          });
        }
      }
      pointsRef.current = newPoints;
    };

    const updatePhysics = () => {
      const points = pointsRef.current;
      const { x: mx, y: my } = mouseRef.current;
      
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        
        // 1. Mouse Repulsion
        const dx = p.x - mx;
        const dy = p.y - my;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        
        if (dist < gridConfig.mouseRadius) {
          const force = (1 - dist / gridConfig.mouseRadius) * gridConfig.spacing * 0.5; // Max push is half cell
          const angle = Math.atan2(dy, dx);
          p.vx += Math.cos(angle) * force * gridConfig.mouseStrength;
          p.vy += Math.sin(angle) * force * gridConfig.mouseStrength;
        }
        
        // 2. Spring force (return to origin)
        const ox = p.originX - p.x;
        const oy = p.originY - p.y;
        
        p.vx += ox * gridConfig.elasticity;
        p.vy += oy * gridConfig.elasticity;
        
        // 3. Damping
        p.vx *= gridConfig.damping;
        p.vy *= gridConfig.damping;
        
        // 4. Update position
        p.x += p.vx;
        p.y += p.vy;
      }
    };

    const drawGrid = () => {
       const width = canvas.width;
       const height = canvas.height;
       
       ctx.clearRect(0, 0, width, height);
       ctx.strokeStyle = '#E5E7EB'; // gray-200
       ctx.lineWidth = 1;

       const points = pointsRef.current;
       if (points.length === 0) return;

       // Helper to get point at col/row
       const getP = (c: number, r: number) => points[r * cols + c];

       // Draw Horizontal Curves
       for (let r = 0; r < rows; r++) {
         ctx.beginPath();
         const firstP = getP(0, r);
         if (!firstP) continue;
         ctx.moveTo(firstP.x, firstP.y);
         
         for (let c = 1; c < cols; c++) {
           const p0 = getP(c - 1, r);
           const p1 = getP(c, r);
           // Simple smooth curve: quadratic to midpoint
           if (p0 && p1) {
              const midX = (p0.x + p1.x) / 2;
              const midY = (p0.y + p1.y) / 2;
              // For cleaner look in a grid, just formatting straight lines is often enough?
              // Or bezier through them.
              // Let's use simple lineTo for now, "bezier" through many points is complex.
              // Actually, simply doing lineTo between simulated points IS smooth if grid is fine.
              // But 50px is large.
              // Simple midpoint smoothing for catmull-rom style:
              // ctx.quadraticCurveTo(p0.x, p0.y, midX, midY); // This requires offset inputs
              
              // Standard "smooth line through points":
              // Draw from midpoint to midpoint.
              // Start: move to p0.
              // Loop: curve to midpoint between p_i and p_i+1 using p_i as control?
              // No, better: move to (p0+p1)/2 ?
           }
         }
         
         // Let's stick to lineTo first, it usually looks "curved" enough with spring physics on a mesh.
         // If user specifically requested "Smooth Bezier Curves", let's try midpoint strat.
         const p0 = getP(0, r);
         ctx.moveTo(p0.x, p0.y);
         for (let c = 1; c < cols - 1; c++) {
            const p = getP(c, r);
            const nextP = getP(c+1, r);
            const midX = (p.x + nextP.x) / 2;
            const midY = (p.y + nextP.y) / 2;
            ctx.quadraticCurveTo(p.x, p.y, midX, midY); 
         }
         // Last point
         const lastP = getP(cols - 1, r);
         ctx.lineTo(lastP.x, lastP.y);
         ctx.stroke();
       }

       // Draw Vertical Curves
       for (let c = 0; c < cols; c++) {
         ctx.beginPath();
         const firstP = getP(c, 0);
         if (!firstP) continue;
         ctx.moveTo(firstP.x, firstP.y);
         
         for (let r = 1; r < rows - 1; r++) {
            const p = getP(c, r);
            const nextP = getP(c, r+1);
            const midX = (p.x + nextP.x) / 2;
            const midY = (p.y + nextP.y) / 2;
            ctx.quadraticCurveTo(p.x, p.y, midX, midY);
         }
         const lastP = getP(c, rows - 1);
         ctx.lineTo(lastP.x, lastP.y);
         ctx.stroke();
       }
    };

    const render = () => {
      updatePhysics();
      drawGrid();
      animationFrameId = requestAnimationFrame(render);
    };

    const resize = () => {
       const parent = canvas.parentElement;
       if (parent) {
         canvas.width = parent.clientWidth;
         canvas.height = parent.clientHeight;
         initPoints();
       }
    };

    window.addEventListener('resize', resize);
    resize();
    render();

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
};
