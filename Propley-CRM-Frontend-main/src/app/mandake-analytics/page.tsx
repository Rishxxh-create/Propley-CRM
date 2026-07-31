import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MandakeAnalyticsIframeHarness } from '@/components/demo/MandakeAnalyticsIframeHarness';

export const metadata: Metadata = {
  title: 'Mandake analytics — iframe test harness',
  description:
    'Embed Mandake slides in an iframe and inspect postMessage analytics events (source: mandake).',
};

export default function MandakeAnalyticsTestPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 24, color: '#8b9cb3', fontFamily: 'system-ui' }}>
          Loading harness…
        </div>
      }
    >
      <MandakeAnalyticsIframeHarness />
    </Suspense>
  );
}
