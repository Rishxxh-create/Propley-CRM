'use client';

import { cn } from '@/lib/utils';
import { ScreenShareSurface } from '@/components/session/ScreenShareSurface';
import { SHARE_CONTAINER_ID, PRESENTATION_STAGE_ID } from '@/lib/enx-media';
import { useEffect, useRef, useState } from 'react';

interface ParticipantTheaterProps {
  isAnnotating: boolean;
  setIsAnnotating?: (val: boolean) => void;
  agentName?: string;
  viewportLabel?: string;
  currentUrl?: string | null;
  screenShareActive?: boolean;
  screenSharePresenter?: string | null;
  socket?: any;
}

export function ParticipantTheater({
  isAnnotating,
  setIsAnnotating,
  agentName = "Lead Advisor",
  viewportLabel = "The Ivory Pavilion - Master Suite",
  currentUrl,
  screenShareActive = false,
  screenSharePresenter = null,
  socket,
}: ParticipantTheaterProps) {
  const shouldRenderIframe = !screenShareActive;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const strokesRef = useRef<Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    size: number;
    mode: 'pencil' | 'eraser';
  }>>([]);

  // Live cursor state
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; name: string } | null>(null);
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const screenShareActiveRef = useRef(screenShareActive);
  screenShareActiveRef.current = screenShareActive;

  // Resize canvas to match container size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const width = parent.clientWidth;
      const height = parent.clientHeight;

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

  // Listen to socket events for drawing & cursor sync
  useEffect(() => {
    if (!socket) return;

    const handleDraw = (data: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
      size: number;
      mode: 'pencil' | 'eraser';
    }) => {
      if (screenShareActiveRef.current) return;

      // Auto-enable annotation view when drawing starts
      if (!isAnnotating && setIsAnnotating) {
        setIsAnnotating(true);
      }

      // Add to local buffer
      strokesRef.current.push(data);

      // Memory limit: cap stroke buffer length to prevent memory leaks on 4GB RAM devices
      if (strokesRef.current.length > 2000) {
        strokesRef.current.shift();
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.beginPath();
      ctx.lineCap = 'round';
      if (data.mode === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = data.size;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.size;
      }
      ctx.moveTo(data.x1 * width, data.y1 * height);
      ctx.lineTo(data.x2 * width, data.y2 * height);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over'; // restore
    };

    const handleClear = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      strokesRef.current = [];
      if (setIsAnnotating) {
        setIsAnnotating(false);
      }
    };

    const handleCursor = (data: { x: number; y: number; name: string }) => {
      if (screenShareActiveRef.current) return;
      setCursorPos({ x: data.x, y: data.y, name: data.name || 'Lead Advisor' });

      // Reset fade-out timeout
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      cursorTimeoutRef.current = setTimeout(() => {
        setCursorPos(null);
      }, 3000);
    };

    socket.on('whiteboard-draw', handleDraw);
    socket.on('whiteboard-clear', handleClear);
    socket.on('moderator-cursor', handleCursor);

    return () => {
      socket.off('whiteboard-draw', handleDraw);
      socket.off('whiteboard-clear', handleClear);
      socket.off('moderator-cursor', handleCursor);
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
    };
  }, [socket, isAnnotating, setIsAnnotating]);

  return (
    <section 
      ref={containerRef}
      className="flex-1 relative bg-black rounded-lg overflow-hidden group flex flex-col"
    >
      <div className="relative flex-1 bg-zinc-950 overflow-hidden">
        {/* PRESENTATION STAGE — Region Capture crops the screen share to THIS element, so it must
            stay mounted for the whole session; the iframe inside may remount freely (url change,
            loading state) without killing an in-progress share. */}
        <div id={PRESENTATION_STAGE_ID.participant} className="absolute inset-0">
          {!shouldRenderIframe ? null : !currentUrl ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
                Loading presentation…
              </span>
            </div>
          ) : (
            <iframe
              src={currentUrl}
              className="w-full h-full border-none"
              title="Property Walkthrough"
              allow="fullscreen"
              loading="lazy"
            />
          )}
        </div>

        {/* SCREEN SHARE AREA (always mounted so the session hook can play stream 101 into it). */}
        <ScreenShareSurface
          active={screenShareActive}
          presenterName={screenSharePresenter}
          containerId={SHARE_CONTAINER_ID.participant}
        />

        {/* ANNOTATION CANVAS (Agent's Markups) */}
        <canvas
          ref={canvasRef}
          id="annotationCanvas"
          className={cn(
            "absolute inset-0 z-40 pointer-events-none opacity-0 transition-opacity duration-300",
            isAnnotating && "opacity-100"
          )}
        />

        {/* LIVE ADVISOR CURSOR */}
        {cursorPos && (
          <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
            {/* Full-size layer translated by % of its own (container-equal) size — moves on the
                compositor only, no layout/paint per cursor update. */}
            <div
              className="h-full w-full will-change-transform transition-transform duration-75"
              style={{ transform: `translate(${cursorPos.x * 100}%, ${cursorPos.y * 100}%)` }}
            >
              <div className="-ml-1 -mt-1 inline-flex flex-col items-start gap-1">
                {/* Custom SVG pointer */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-gold-light drop-shadow-md"
                >
                  <path
                    d="M4.5 3V19L9.5 14H16.5L4.5 3Z"
                    fill="currentColor"
                    stroke="#0A0A0A"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
                {/* Label tag */}
                <div className="bg-[#0A0A0A]/95 text-gold-light border border-gold-light/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap shadow-lg">
                  {cursorPos.name}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

