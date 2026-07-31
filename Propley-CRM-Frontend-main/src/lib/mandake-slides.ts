/**
 * Mandake deck — loaded dynamically from GET /api/slides.
 * @see https://mandake.vercel.app/api/slides
 *
 * Dev override: NEXT_PUBLIC_MANDAKE_SLIDES_URL=http://localhost:3000
 */

import { ApiError, createHttpClient, withRetry } from "@/lib/api/http-client";

export type MandakeSlideApiItem = {
  id: string;
  name: string;
  url: string;
  order: number;
  guide?: {
    title: string;
    script: string;
  };
};

export type MandakeSlidesApiResponse = {
  slides: MandakeSlideApiItem[];
};

export type MandakeSlide = {
  id: string;
  order: number;
  name: string;
  path: string;
  guide?: {
    title: string;
    script: string;
  };
};

export const DEFAULT_MANDAKE_SLIDES_ORIGIN = "https://mandake.vercel.app";
const mandakeSlidesClient = createHttpClient({ timeout: 10_000 });

export function getMandakeSlidesApiUrl(): string {
  const base = (
    process.env.NEXT_PUBLIC_MANDAKE_SLIDES_URL ?? DEFAULT_MANDAKE_SLIDES_ORIGIN
  ).replace(/\/$/, "");
  return `${base}/api/slides`;
}

export function mapApiSlideToSlide(item: MandakeSlideApiItem): MandakeSlide {
  const path = item.url.startsWith("/") ? item.url : `/${item.url}`;
  return {
    id: item.id,
    order: item.order,
    name: item.name,
    path,
    guide: item.guide,
  };
}

export async function fetchMandakeSlides(): Promise<MandakeSlide[]> {
  const url = getMandakeSlidesApiUrl();
  const data = await withRetry(
    async () => {
      const response = await mandakeSlidesClient.get<MandakeSlidesApiResponse>(
        url,
        {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        },
      );
      return response.data;
    },
    { attempts: 2, initialDelayMs: 250 },
  );

  if (!Array.isArray(data.slides) || data.slides.length === 0) {
    throw new ApiError("Mandake slides API returned no slides", 502);
  }
  return [...data.slides]
    .map(mapApiSlideToSlide)
    .sort((a, b) => a.order - b.order);
}

export function getDefaultSlideId(
  slides: readonly MandakeSlide[],
): string | null {
  return slides[0]?.id ?? null;
}

export function getSlideById(
  slides: readonly MandakeSlide[],
  id: string,
): MandakeSlide | undefined {
  return slides.find((slide) => slide.id === id);
}

export function getSlideIndex(
  slides: readonly MandakeSlide[],
  id: string,
): number {
  return slides.findIndex((slide) => slide.id === id);
}

export function getMandakeSlideSrc(path: string): string {
  const base = (
    process.env.NEXT_PUBLIC_MANDAKE_SLIDES_URL ?? DEFAULT_MANDAKE_SLIDES_ORIGIN
  ).replace(/\/$/, "");
  return `${base}${path}`;
}

export function getAdjacentSlideId(
  slides: readonly MandakeSlide[],
  id: string,
  direction: "prev" | "next",
): string {
  const index = getSlideIndex(slides, id);
  if (index < 0) return slides[0]?.id ?? id;
  const delta = direction === "next" ? 1 : -1;
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= slides.length) {
    return id;
  }
  return slides[nextIndex].id;
}

export function formatSlidePosition(
  slides: readonly MandakeSlide[],
  id: string,
): string {
  const index = getSlideIndex(slides, id);
  const order = index >= 0 ? index + 1 : 0;
  const total = slides.length;
  if (total === 0) return "—";
  return `${String(order).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
}

export function formatSlidePositionCompact(
  slides: readonly MandakeSlide[],
  id: string,
): string {
  const index = getSlideIndex(slides, id);
  const order = index >= 0 ? index + 1 : 0;
  const total = slides.length;
  if (total === 0) return "—";
  return `${String(order).padStart(2, "0")}/${String(total).padStart(2, "0")}`;
}

export function canGoPrev(
  slides: readonly MandakeSlide[],
  id: string,
): boolean {
  return getSlideIndex(slides, id) > 0;
}

export function canGoNext(
  slides: readonly MandakeSlide[],
  id: string,
): boolean {
  const index = getSlideIndex(slides, id);
  return index >= 0 && index < slides.length - 1;
}
