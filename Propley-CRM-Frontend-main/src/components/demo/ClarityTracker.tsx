'use client';

import { useEffect, useRef } from 'react';
import Clarity from '@microsoft/clarity';
import { CLARITY_PROJECT_ID } from '@/lib/clarity-config';

interface ClarityTrackerProps {
  /** Clarity custom tag: which demo surface is active */
  page: 'demo-landing' | 'demo-analytics';
}

let initialized = false;

export function ClarityTracker({ page }: ClarityTrackerProps) {
  const tagged = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!initialized) {
      Clarity.init(CLARITY_PROJECT_ID);
      Clarity.consent(true);
      initialized = true;
    }

    if (!tagged.current) {
      Clarity.setTag('surface', page);
      Clarity.setTag('project', 'propley-demo');
      Clarity.identify(`demo-${page}`, undefined, page, 'Propley Demo');
      tagged.current = true;
    } else {
      Clarity.setTag('surface', page);
      Clarity.event(`view_${page.replace('-', '_')}`);
    }
  }, [page]);

  return null;
}
