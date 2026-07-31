'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Clarity from '@microsoft/clarity';
import {
  CLARITY_PROJECT_ID,
  getClarityProjectUrls,
  getDemoSiteOrigin,
  getDemoStylesheetUrl,
  DEMO_TRACKED_PATHS,
} from '@/lib/clarity-config';
import { ClarityTracker } from '@/components/demo/ClarityTracker';
import { ClarityLiveInsights } from '@/components/demo/ClarityLiveInsights';

type ClarityState = 'loading' | 'active' | 'inactive';

export function ClarityAnalyticsHub() {
  const [state, setState] = useState<ClarityState>('loading');
  const urls = getClarityProjectUrls();
  const origin = getDemoSiteOrigin();
  const cssUrl = getDemoStylesheetUrl();

  useEffect(() => {
    const check = () => {
      const w = window as Window & { clarity?: (...args: unknown[]) => void };
      setState(typeof w.clarity === 'function' ? 'active' : 'inactive');
    };
    check();
    const t = window.setTimeout(check, 1200);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="clarity-analytics-shell">
      <ClarityTracker page="demo-analytics" />

      <header className="clarity-analytics-header">
        <p className="clarity-demo-logo" style={{ marginBottom: '0.75rem' }}>
          Propley · Clarity analytics
        </p>
        <h1>Session recordings & heatmaps</h1>
        <p>
          Project <span className="clarity-analytics-code">{CLARITY_PROJECT_ID}</span> — open
          Microsoft Clarity for live replays, click heatmaps, and rage-click insights from the demo
          landing page.
        </p>
      </header>

      <div className="clarity-analytics-body">
        <div className="clarity-analytics-status">
          <span
            className={`clarity-analytics-status-dot ${state === 'active' ? '' : 'pending'}`}
            aria-hidden
          />
          <div>
            <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600 }}>
              Clarity SDK:{' '}
              {state === 'loading'
                ? 'Checking…'
                : state === 'active'
                  ? 'Recording on this site'
                  : 'Not detected — reload /demo'}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#71717a' }}>
              Tracked routes: {DEMO_TRACKED_PATHS.join(', ')}
            </p>
          </div>
          <button
            type="button"
            className="clarity-demo-nav-cta"
            style={{ marginLeft: 'auto' }}
            onClick={() => Clarity.event('analytics_test_ping')}
          >
            Send test event
          </button>
        </div>

        <div className="clarity-analytics-grid">
          <section className="clarity-analytics-panel">
            <h2>Recordings & sessions</h2>
            <ul className="clarity-analytics-link-list">
              <li>
                <a href={urls.recordings} target="_blank" rel="noopener noreferrer">
                  Session recordings
                  <span aria-hidden>↗</span>
                </a>
              </li>
              <li>
                <a href={urls.sessions} target="_blank" rel="noopener noreferrer">
                  All sessions
                  <span aria-hidden>↗</span>
                </a>
              </li>
              <li>
                <a href={urls.dashboard} target="_blank" rel="noopener noreferrer">
                  Project dashboard
                  <span aria-hidden>↗</span>
                </a>
              </li>
            </ul>
            <p className="clarity-analytics-tips" style={{ marginTop: '1rem' }}>
              Filter sessions by URL containing{' '}
              <span className="clarity-analytics-code">/demo</span> to isolate this landing page.
            </p>
          </section>

          <section className="clarity-analytics-panel">
            <h2>Heatmaps</h2>
            <ul className="clarity-analytics-link-list">
              <li>
                <a href={urls.heatmaps} target="_blank" rel="noopener noreferrer">
                  Click heatmaps
                  <span aria-hidden>↗</span>
                </a>
              </li>
              <li>
                <a href={urls.home} target="_blank" rel="noopener noreferrer">
                  Clarity project home
                  <span aria-hidden>↗</span>
                </a>
              </li>
              <li>
                <a href={urls.settings} target="_blank" rel="noopener noreferrer">
                  Project settings
                  <span aria-hidden>↗</span>
                </a>
              </li>
            </ul>
          </section>

          <section className="clarity-analytics-panel clarity-analytics-full">
            <h2>Replay styles not loading?</h2>
            <ul className="clarity-analytics-tips">
              <li>
                Demo CSS is served at an <strong>absolute URL</strong>:{' '}
                <span className="clarity-analytics-code">{cssUrl}</span> with{' '}
                <span className="clarity-analytics-code">data-clarity-unmask=&quot;true&quot;</span>{' '}
                so Clarity does not strip stylesheet links during masking.
              </li>
              <li>
                Set{' '}
                <span className="clarity-analytics-code">NEXT_PUBLIC_SITE_URL={origin}</span> in
                production so replay fetches CSS from your live domain (not localhost).
              </li>
              <li>
                In Clarity → Settings → Masking, use <strong>Relaxed</strong> mode if styles still
                fail; whitelist <span className="clarity-analytics-code">Clarity-Bot</span> if your
                CDN blocks non-browser user agents.
              </li>
              <li>
                Avoid relying only on Tailwind-injected styles for tracked pages — this demo uses a
                static file under <span className="clarity-analytics-code">/public/demo/</span>.
              </li>
            </ul>
          </section>

          <ClarityLiveInsights />

          <section className="clarity-analytics-panel clarity-analytics-full">
            <h2>Quick actions</h2>
            <ul className="clarity-analytics-link-list">
              <li>
                <Link href="/demo">← Back to demo landing (generate new session)</Link>
              </li>
              <li>
                <Link href="/">Main Propley portal (Clarity disabled)</Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
