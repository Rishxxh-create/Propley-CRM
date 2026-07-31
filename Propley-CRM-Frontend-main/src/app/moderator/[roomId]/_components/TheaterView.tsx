'use client';

import { cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';
import { GuideOverlay } from './GuideOverlay';
import { ScreenShareSurface } from '@/components/session/ScreenShareSurface';
import { SHARE_CONTAINER_ID, PRESENTATION_STAGE_ID } from '@/lib/enx-media';
import { memo, useEffect, useRef, useState } from 'react';
import { RiBrushLine, RiEraserLine, RiDeleteBin2Line } from 'react-icons/ri';

interface TheaterViewProps {
  isAnnotating: boolean;
  showGuide: boolean;
  onCloseGuide: () => void;
  slideSrc?: string;
  slideName: string;
  guide?: {
    title: string;
    script: string;
  };
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  screenShareActive?: boolean;
  screenSharePresenter?: string | null;
  socket?: any;
  advisorName?: string;
}

export const TheaterView = memo(function TheaterView({
  isAnnotating,
  showGuide,
  onCloseGuide,
  slideSrc,
  slideName,
  guide,
  isLoading = false,
  error = null,
  onRetry,
  screenShareActive = false,
  screenSharePresenter = null,
  socket,
  advisorName,
}: TheaterViewProps) {
  const shouldRenderIframe = !screenShareActive;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastEmittedPosRef = useRef<{ x: number; y: number } | null>(null);
  const strokesRef = useRef<Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    size: number;
    mode: 'pencil' | 'eraser';
  }>>([]);

  // Toolbar settings
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [color, setColor] = useState<string>('#FFC977'); // default gold-light
  const [brushSize, setBrushSize] = useState<number>(4);

  const colors = [
    { name: 'Gold Light', value: '#FFC977' },
    { name: 'Red', value: '#EF4444' },
    { name: 'White', value: '#FFFFFF' },
    { name: 'Black', value: '#0A0A0A' },
  ];

  const sizes = [2, 4, 8, 16];

  // Emit cursor position helper
  const lastCursorEmitRef = useRef(0);
  const handleMouseMoveForCursor = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!socket || !canvasRef.current) return;
    if (screenShareActive) return;
    const now = Date.now();
    if (now - lastCursorEmitRef.current < 50) return; // limit to ~20fps

    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Only emit if cursor is within the bounds of the presentation container
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      socket.emit('moderator-cursor', {
        x,
        y,
        name: advisorName || 'Lead Advisor',
      });
      lastCursorEmitRef.current = now;
    }
  };

  // Resize canvas to match container size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      
      // Store current drawing before resizing resets canvas
      canvas.width = width;
      canvas.height = height;

      // Redraw history of strokes scaled to new dimensions
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        strokesRef.current.forEach((stroke) => {
          ctx.beginPath();
          if (stroke.mode === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = stroke.size;
          } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;
          }
          ctx.moveTo(stroke.x1 * width, stroke.y1 * height);
          ctx.lineTo(stroke.x2 * width, stroke.y2 * height);
          ctx.stroke();
        });
        // Restore default composite operation
        ctx.globalCompositeOperation = 'source-over';
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Set up observer for element bounds change
    const resizeObserver = new ResizeObserver(resizeCanvas);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      resizeObserver.disconnect();
    };
  }, []);

  // Drawing event handlers
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const drawSegment = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    drawColor: string,
    drawSize: number,
    drawMode: 'pencil' | 'eraser'
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.lineCap = 'round';
    if (drawMode === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = drawSize;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawSize;
    }
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; // restore
  };

  const lastDrawEmitRef = useRef(0);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isAnnotating) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    isDrawingRef.current = true;
    lastPosRef.current = coords;
    lastEmittedPosRef.current = coords;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPosRef.current || !lastEmittedPosRef.current || !canvasRef.current) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    if (width === 0 || height === 0) return;

    const currentMode = tool;
    const currentSize = currentMode === 'eraser' ? 40 : brushSize;
    const currentColor = color;

    // Draw locally first for instant response
    drawSegment(lastPosRef.current.x, lastPosRef.current.y, coords.x, coords.y, currentColor, currentSize, currentMode);

    // Save segment locally
    const normLocalStroke = {
      x1: lastPosRef.current.x / width,
      y1: lastPosRef.current.y / height,
      x2: coords.x / width,
      y2: coords.y / height,
      color: currentColor,
      size: currentSize,
      mode: currentMode,
    };
    strokesRef.current.push(normLocalStroke);

    // Memory limit: cap stroke buffer length to prevent memory issues on low-end 4GB RAM devices
    if (strokesRef.current.length > 2000) {
      strokesRef.current.shift();
    }

    // Emit event throttled to ~30fps connecting the last emitted position to the current position
    const now = Date.now();
    if (socket && !screenShareActive && (now - lastDrawEmitRef.current > 33)) {
      const normEmitStroke = {
        x1: lastEmittedPosRef.current.x / width,
        y1: lastEmittedPosRef.current.y / height,
        x2: coords.x / width,
        y2: coords.y / height,
        color: currentColor,
        size: currentSize,
        mode: currentMode,
      };
      socket.emit('whiteboard-draw', normEmitStroke);
      lastDrawEmitRef.current = now;
      lastEmittedPosRef.current = coords;
    }

    lastPosRef.current = coords;
  };

  const stopDrawing = () => {
    if (isDrawingRef.current && lastPosRef.current && lastEmittedPosRef.current && canvasRef.current && socket && !screenShareActive) {
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;
      if (width > 0 && height > 0) {
        const dx = lastPosRef.current.x - lastEmittedPosRef.current.x;
        const dy = lastPosRef.current.y - lastEmittedPosRef.current.y;
        // If there's any remaining segment not emitted, flush it now
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          socket.emit('whiteboard-draw', {
            x1: lastEmittedPosRef.current.x / width,
            y1: lastEmittedPosRef.current.y / height,
            x2: lastPosRef.current.x / width,
            y2: lastPosRef.current.y / height,
            color: color,
            size: tool === 'eraser' ? 40 : brushSize,
            mode: tool,
          });
        }
      }
    }
    isDrawingRef.current = false;
    lastPosRef.current = null;
    lastEmittedPosRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokesRef.current = [];

    if (socket) {
      socket.emit('whiteboard-clear');
    }
  };

  return (
    <section 
      ref={containerRef}
      className="flex-1 lg:flex-[3] relative bg-black rounded-lg overflow-hidden border-r border-white/10 group flex flex-col"
      onMouseMove={handleMouseMoveForCursor}
    >
      <div className="relative flex-1 bg-zinc-950 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-zinc-950">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Loading presentation…
            </span>
          </div>
        )}
        {!isLoading && error && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
              Could not load slides
            </span>
            <p className="text-xs text-zinc-600 max-w-sm">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="text-[10px] font-semibold uppercase tracking-widest text-gold-light border border-gold-light/40 px-4 py-2 hover:bg-gold-light/10 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        )}
        {/* PRESENTATION STAGE — Region Capture crops the screen share to THIS element, so it must
            stay mounted for the whole session; the iframe inside may remount freely (slide change,
            load/error states) without killing an in-progress share. */}
        <div id={PRESENTATION_STAGE_ID.moderator} className="absolute inset-0">
          {shouldRenderIframe && slideSrc && !error && (
            <iframe
              src={slideSrc}
              title={slideName}
              className="w-full h-full border-none"
              allow="fullscreen"
              loading="lazy"
            />
          )}
        </div>

        {/* SCREEN SHARE AREA (always mounted so the session hook can play stream 101 into it). */}
        <ScreenShareSurface
          active={screenShareActive}
          presenterName={screenSharePresenter}
          containerId={SHARE_CONTAINER_ID.moderator}
        />

        {/* ANNOTATION CANVAS (Layered) */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={cn(
            "absolute inset-0 z-40 pointer-events-none opacity-0 transition-opacity duration-300",
            isAnnotating && "pointer-events-auto opacity-100 cursor-crosshair"
          )}
        />

        {/* FLOATING ANNOTATION TOOLBAR */}
        {isAnnotating && (
          <div className="absolute top-4 right-4 z-50 bg-[#0A0A0A]/90 border border-white/10 p-2 flex items-center gap-4 rounded-lg backdrop-blur-md shadow-2xl animate-fade-in select-none">
            {/* Draw / Eraser Toggle */}
            <div className="flex items-center gap-1 border-r border-white/10 pr-3">
              <button
                onClick={() => setTool('pencil')}
                className={cn(
                  "w-8 h-8 flex items-center justify-center border transition-colors rounded-lg",
                  tool === 'pencil' ? "bg-gold text-white border-gold" : "border-transparent text-white/60 hover:text-white"
                )}
                title="Pencil"
              >
                <RiBrushLine size={16} />
              </button>
              <button
                onClick={() => setTool('eraser')}
                className={cn(
                  "w-8 h-8 flex items-center justify-center border transition-colors rounded-lg",
                  tool === 'eraser' ? "bg-gold text-white border-gold" : "border-transparent text-white/60 hover:text-white"
                )}
                title="Eraser"
              >
                <RiEraserLine size={16} />
              </button>
            </div>

            {/* Colors picker (Pencil only) */}
            {tool === 'pencil' && (
              <div className="flex items-center gap-1.5 border-r border-white/10 pr-3">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    style={{ backgroundColor: c.value }}
                    className={cn(
                      "w-4 h-4 border transition-transform rounded-lg",
                      color === c.value ? "scale-125 border-white" : "border-white/20 hover:scale-110"
                    )}
                    title={c.name}
                  />
                ))}
              </div>
            )}

            {/* Brush sizes (Pencil only) */}
            {tool === 'pencil' && (
              <div className="flex items-center gap-1 border-r border-white/10 pr-3">
                {sizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setBrushSize(sz)}
                    className={cn(
                      "w-6 h-6 flex items-center justify-center text-[10px] font-semibold transition-colors rounded-lg",
                      brushSize === sz ? "bg-white/10 text-white font-bold" : "text-white/40 hover:text-white"
                    )}
                    title={`${sz}px`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            )}

            {/* Clear Button */}
            <button
              onClick={clearCanvas}
              className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 border border-transparent transition-all rounded-lg"
              title="Clear Canvas"
            >
              <RiDeleteBin2Line size={16} />
            </button>
          </div>
        )}

        {/* GUIDE OVERLAY (In Viewport) */}
        <AnimatePresence>
          {showGuide && (
            <GuideOverlay onClose={onCloseGuide} guide={guide} />
          )}
        </AnimatePresence>
      </div>
    </section>
  );
});

