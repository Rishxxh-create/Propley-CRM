import type { SlideHeatmap } from '@/lib/post-meeting-analysis';

/** Architectural stills for slide heatmap mockups (Unsplash) */
export const SLIDE_HEATMAP_IMAGES: string[] = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1600607687939-4e2a09cf159d?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1616594039964-4085749b4b43?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1600489000022-2086c72a66b4?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800',
];

export interface HeatmapHotspot {
  x: number;
  y: number;
  intensity: number;
}

function slideIndex(slideId: string): number {
  const n = parseInt(slideId.replace(/\D/g, ''), 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n - 1);
}

export function slideHeatmapImageUrl(slideId: string): string {
  const idx = slideIndex(slideId);
  return SLIDE_HEATMAP_IMAGES[idx % SLIDE_HEATMAP_IMAGES.length];
}

/** Pseudo-random hotspots for Clarity-style overlay (percent 0–100) */
export function heatmapHotspotsForSlide(slide: SlideHeatmap): HeatmapHotspot[] {
  const seed = slide.engagementScore + slide.clickCount * 3 + slide.viewTimeSeconds;
  const spots: HeatmapHotspot[] = [];
  const count = 4 + (seed % 4);

  for (let i = 0; i < count; i += 1) {
    const a = seed + i * 41;
    spots.push({
      x: 18 + (a % 64),
      y: 15 + ((a * 7) % 70),
      intensity: 0.35 + ((a % 60) / 100),
    });
  }

  if (slide.rageClicks > 0) {
    spots.push({ x: 72, y: 28, intensity: 0.95 });
    spots.push({ x: 68, y: 32, intensity: 0.88 });
  }

  return spots;
}

export function averageEngagementScore(slides: SlideHeatmap[]): number {
  if (slides.length === 0) return 0;
  const sum = slides.reduce((acc, s) => acc + s.engagementScore, 0);
  return Math.round(sum / slides.length);
}

export function engagementLabel(avg: number): string {
  if (avg >= 85) return 'Excellent';
  if (avg >= 70) return 'Strong';
  if (avg >= 55) return 'Moderate';
  return 'Needs attention';
}
