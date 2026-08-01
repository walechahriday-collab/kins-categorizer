'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export type SketchHandle = {
  exportPaths: () => Promise<string>;
  clear: () => void;
  hasChanges: () => boolean;
};

interface Props {
  active: boolean;
  color?: string;
  strokeWidth?: number;
  initialData?: string;
}

const SketchCanvas = forwardRef<SketchHandle, Props>(
  ({ active, color = '#c41515', strokeWidth = 3, initialData }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const last = useRef<{ x: number; y: number } | null>(null);
    const sized = useRef(false);
    const changed = useRef(false);
    const initialDataRef = useRef(initialData);
    initialDataRef.current = initialData;

    /* Expose clear + export to parent */
    useImperativeHandle(ref, () => ({
      exportPaths: async () => {
        return canvasRef.current?.toDataURL('image/png') ?? '';
      },
      clear: () => {
        const c = canvasRef.current;
        if (!c) return;
        c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
        changed.current = true;
      },
      hasChanges: () => changed.current,
    }));

    /* Size canvas to its CSS dimensions the first time it becomes active —
       only once per mount, so toggling TYPE/SKETCH back and forth doesn't
       wipe whatever's already been drawn. Loads any previously saved
       drawing (initialData) once sizing is done. */
    useEffect(() => {
      if (!active || sized.current) return;
      const c = canvasRef.current;
      if (!c) return;
      const dpr = typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1;
      const r = c.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      c.width  = r.width  * dpr;
      c.height = r.height * dpr;
      const ctx = c.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      sized.current = true;
      const dataUrl = initialDataRef.current;
      if (ctx && dataUrl) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height);
        img.src = dataUrl;
      }
    }, [active]);

    /* Pointer helpers */
    const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const c = canvasRef.current!;
      const r = c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      drawing.current = true;
      last.current = pos(e);
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    };

    const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawing.current || !last.current) return;
      const c = canvasRef.current!;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const p = pos(e);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth   = strokeWidth;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last.current = p;
      changed.current = true;
    };

    const onUp = () => { drawing.current = false; last.current = null; };

    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-20"
        style={{
          display: active ? 'block' : 'none',
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
          touchAction: 'none',
          background: 'transparent',
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      />
    );
  }
);
SketchCanvas.displayName = 'SketchCanvas';
export default SketchCanvas;
