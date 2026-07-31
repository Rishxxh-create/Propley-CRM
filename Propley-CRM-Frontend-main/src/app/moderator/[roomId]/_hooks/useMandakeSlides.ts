'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchMandakeSlides, type MandakeSlide } from '@/lib/mandake-slides';

export function useMandakeSlides() {
  const [slides, setSlides] = useState<MandakeSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setIsLoading(true);
    setError(null);

    fetchMandakeSlides()
      .then((fetched) => {
        setSlides(fetched);
      })
      .catch((err) => {
        setSlides([]);
        setError(
          err instanceof Error ? err.message : "Failed to load presentation slides"
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchMandakeSlides()
      .then((fetched) => {
        if (!cancelled) {
          setSlides(fetched);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSlides([]);
          setError(
            err instanceof Error ? err.message : "Failed to load presentation slides"
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { slides, isLoading, error, reload };
}
