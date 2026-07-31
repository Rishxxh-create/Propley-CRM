'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMandakeSlides } from './useMandakeSlides';
import {
  getSlideById,
  getMandakeSlideSrc,
  getAdjacentSlideId,
  canGoPrev,
  canGoNext,
  getDefaultSlideId
} from '@/lib/mandake-slides';

export function useSlideDeck() {
  const { slides, isLoading, error, reload } = useMandakeSlides();
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);

  useEffect(() => {
    if (slides.length > 0 && !activeSlideId) {
      setActiveSlideId(getDefaultSlideId(slides));
    }
  }, [slides, activeSlideId]);

  const selectSlide = useCallback((slideId: string) => {
    setActiveSlideId(slideId);
  }, []);

  const goPrev = useCallback(() => {
    if (activeSlideId) {
      const prevId = getAdjacentSlideId(slides, activeSlideId, 'prev');
      setActiveSlideId(prevId);
    }
  }, [slides, activeSlideId]);

  const goNext = useCallback(() => {
    if (activeSlideId) {
      const nextId = getAdjacentSlideId(slides, activeSlideId, 'next');
      setActiveSlideId(nextId);
    }
  }, [slides, activeSlideId]);

  const currentSlide = activeSlideId ? getSlideById(slides, activeSlideId) : undefined;
  const slideSrc = currentSlide ? getMandakeSlideSrc(currentSlide.path) : undefined;

  const hasPrev = activeSlideId ? canGoPrev(slides, activeSlideId) : false;
  const hasNext = activeSlideId ? canGoNext(slides, activeSlideId) : false;

  return {
    slides,
    isLoading,
    error,
    reload,
    activeSlideId,
    currentSlide,
    slideSrc,
    selectSlide,
    goPrev,
    goNext,
    canPrev: hasPrev,
    canNext: hasNext,
    navReady: !isLoading && slides.length > 0,
  };
}
