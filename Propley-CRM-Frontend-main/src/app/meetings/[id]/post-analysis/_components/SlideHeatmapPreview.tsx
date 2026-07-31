'use client';

import Image from 'next/image';
import type { SlideHeatmap } from '@/lib/post-meeting-analysis';
import {
  heatmapHotspotsForSlide,
  slideHeatmapImageUrl,
} from '@/lib/heatmap-mockups';

interface SlideHeatmapPreviewProps {
  slide: SlideHeatmap;
  className?: string;
}

export function SlideHeatmapPreview({ slide, className }: SlideHeatmapPreviewProps) {
  const hotspots = heatmapHotspotsForSlide(slide);
  const imageUrl = slideHeatmapImageUrl(slide.slideId);

  return (
    <div
      className={`relative aspect-[16/10] w-full overflow-hidden border border-stone-alt bg-stone ${className ?? ''}`}
    >
      <Image
        src={imageUrl}
        alt={`Heatmap mockup for ${slide.title}`}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 320px"
      />

      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: hotspots
            .map(
              (h) =>
                `radial-gradient(circle at ${h.x}% ${h.y}%, rgba(220,38,38,${h.intensity * 0.55}) 0%, rgba(251,191,36,${h.intensity * 0.25}) 28%, transparent 52%)`
            )
            .join(', '),
        }}
      />

      {hotspots.slice(0, 6).map((h, i) => (
        <span
          key={i}
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ivory/80 bg-red-500/70 shadow-sm"
          style={{ left: `${h.x}%`, top: `${h.y}%` }}
        />
      ))}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-ink/75 to-transparent px-3 pb-2 pt-8">
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ivory">
          Click heatmap
        </span>
        <span className="text-[9px] font-medium text-ivory/90">Slide view</span>
      </div>
    </div>
  );
}
