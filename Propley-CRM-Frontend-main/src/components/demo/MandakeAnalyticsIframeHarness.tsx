'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMandakeSlides } from '@/app/moderator/[roomId]/_hooks/useMandakeSlides';
import {
  DEFAULT_MANDAKE_SLIDES_ORIGIN,
  getMandakeSlideSrc,
  type MandakeSlide,
} from '@/lib/mandake-slides';
import {
  formatLogTime,
  isMandakeMessage,
  normalizeBaseUrl,
  type MandakeAnalyticsLogEntry,
} from '@/lib/mandake-analytics-messages';

const STORAGE_BASE = 'mandake-analytics-test-base';
const STORAGE_SLIDE = 'mandake-analytics-test-slide';
const MAX_EVENTS = 500;
const PROBE_PORTS = ['3002', '3000', '3001', '3003', '3004'];

const FALLBACK_SLIDES: MandakeSlide[] = [
  { id: 'welcome', order: 1, name: '01 Welcome', path: '/slides/welcome' },
  { id: 'who-we-are', order: 2, name: '02 Who We Are', path: '/slides/who-we-are' },
  { id: 'trust', order: 3, name: '03 Trust (PDF)', path: '/slides/trust' },
  { id: 'portfolio', order: 4, name: '04 Portfolio', path: '/slides/portfolio' },
  { id: 'project-intro', order: 5, name: '05 Project Intro (video)', path: '/slides/project-intro' },
];

type BannerState = {
  html: string;
  kind: 'error' | 'info';
  onFix?: () => void;
} | null;

function resolveDefaultBase(): string {
  if (typeof window === 'undefined') {
    return (
      process.env.NEXT_PUBLIC_MANDAKE_SLIDES_URL?.replace(/\/$/, '') ??
      DEFAULT_MANDAKE_SLIDES_ORIGIN
    );
  }
  return `${window.location.origin}/mandake-slides`;
}

function canFetchProbe(base: string): boolean {
  try {
    return new URL(normalizeBaseUrl(base)).origin === window.location.origin;
  } catch {
    return false;
  }
}

async function probeMandakeServer(base: string): Promise<boolean> {
  const url = `${normalizeBaseUrl(base)}/slides/welcome`;
  const sameOrigin = canFetchProbe(base);
  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      mode: sameOrigin ? 'cors' : 'no-cors',
    });
    if (sameOrigin) {
      const ct = res.headers.get('content-type') || '';
      return res.ok && ct.includes('text/html');
    }
    return res.type === 'opaque';
  } catch {
    return false;
  }
}

async function detectMandakeDevBase(): Promise<string | null> {
  for (const port of PROBE_PORTS) {
    const candidate = `http://localhost:${port}`;
    if (await probeMandakeServer(candidate)) return candidate;
  }
  return null;
}

export function MandakeAnalyticsIframeHarness() {
  const searchParams = useSearchParams();
  const { slides: apiSlides, isLoading: slidesLoading, error: slidesError } = useMandakeSlides();

  const slides = apiSlides.length > 0 ? apiSlides : FALLBACK_SLIDES;

  const [baseUrl, setBaseUrl] = useState('');
  const [slidePath, setSlidePath] = useState('');
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [frameMetaError, setFrameMetaError] = useState(false);
  const [banner, setBanner] = useState<BannerState>(null);
  const [paused, setPaused] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);
  const [activeFilter, setActiveFilter] = useState('');
  const [events, setEvents] = useState<MandakeAnalyticsLogEntry[]>([]);
  const [typeCounts, setTypeCounts] = useState<Map<string, number>>(new Map());
  const [initialized, setInitialized] = useState(false);

  const pausedRef = useRef(paused);
  const showIgnoredRef = useRef(showIgnored);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    showIgnoredRef.current = showIgnored;
  }, [showIgnored]);

  const slideUrl = useMemo(() => {
    if (!baseUrl || !slidePath) return '';
    return `${normalizeBaseUrl(baseUrl)}${slidePath}`;
  }, [baseUrl, slidePath]);

  const initFromStorage = useCallback(() => {
    const queryBase = searchParams.get('base');
    const querySlide = searchParams.get('slide');
    const queryPort = searchParams.get('port');

    let base = resolveDefaultBase();
    if (queryBase) base = normalizeBaseUrl(queryBase);
    else if (queryPort) base = `http://localhost:${queryPort}`;
    else {
      const saved = localStorage.getItem(STORAGE_BASE);
      if (saved) base = normalizeBaseUrl(saved);
    }

    let path = slides.find((s) => s.id === 'trust')?.path ?? slides[0]?.path ?? '/slides/welcome';
    if (querySlide) {
      const match = slides.find(
        (s) =>
          s.path === `/slides/${querySlide}` ||
          s.path.endsWith(`/${querySlide}`) ||
          s.id === querySlide,
      );
      if (match) path = match.path;
    } else {
      const savedSlide = localStorage.getItem(STORAGE_SLIDE);
      if (savedSlide && slides.some((s) => s.path === savedSlide)) {
        path = savedSlide;
      }
    }

    setBaseUrl(base);
    setSlidePath(path);
    setInitialized(true);
  }, [searchParams, slides]);

  useEffect(() => {
    if (slidesLoading) return;
    if (initialized) return;
    initFromStorage();
  }, [slidesLoading, initialized, initFromStorage]);

  const mountIframe = useCallback(
    (url: string, base: string) => {
      setBanner(null);
      setIframeSrc(url);
      setFrameMetaError(false);
      localStorage.setItem(STORAGE_BASE, base);
      localStorage.setItem(STORAGE_SLIDE, slidePath);
    },
    [slidePath],
  );

  const loadIframe = useCallback(async () => {
    if (!baseUrl || !slidePath) return;

    const url = `${normalizeBaseUrl(baseUrl)}${slidePath}`;
    const base = normalizeBaseUrl(baseUrl);
    setFrameMetaError(false);

    const onDetect = async () => {
      const proxyBase = `${window.location.origin}/mandake-slides`;
      if (await probeMandakeServer(proxyBase)) {
        setBaseUrl(proxyBase);
        return;
      }
      const found = await detectMandakeDevBase();
      if (found) setBaseUrl(found);
      else {
        setBanner({
          html: 'No Mandake dev server found. Run <code>npm run dev</code> on Mandake or use the Propley proxy at <code>/mandake-slides</code>.',
          kind: 'error',
        });
      }
    };

    if (!canFetchProbe(base)) {
      mountIframe(url, base);
      setBanner({
        html:
          `Slides load from <code>${base}</code>. Cross-origin preflight is limited here; the iframe still loads if the URL is correct. ` +
          'Use <code>/mandake-slides</code> on this origin for same-origin testing.',
        kind: 'info',
        onFix: onDetect,
      });
      return;
    }

    const ok = await probeMandakeServer(base);
    if (!ok) {
      setIframeSrc(null);
      setFrameMetaError(true);
      setBanner({
        html:
          `<strong>Cannot load slide</strong> at <code>${url}</code>. Try the Propley proxy ` +
          `<code>${window.location.origin}/mandake-slides</code> or a running Mandake dev server.`,
        kind: 'error',
        onFix: onDetect,
      });
      return;
    }

    mountIframe(url, base);
  }, [baseUrl, slidePath, mountIframe]);

  useEffect(() => {
    if (!initialized || !baseUrl || !slidePath) return;
    void loadIframe();
  }, [initialized, baseUrl, slidePath, loadIframe]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (pausedRef.current) return;

      const mandake = isMandakeMessage(event.data);
      if (!mandake) {
        if (!showIgnoredRef.current) return;
        const entry: MandakeAnalyticsLogEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          receivedAt: Date.now(),
          ignored: true,
          type: null,
          slide: null,
          payload: { origin: event.origin, data: event.data },
        };
        setEvents((prev) => [entry, ...prev].slice(0, MAX_EVENTS));
        return;
      }

      const entry: MandakeAnalyticsLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        receivedAt: Date.now(),
        ignored: false,
        type: event.data.event.type,
        slide: event.data.event.slide ?? null,
        payload: event.data,
      };

      setEvents((prev) => [entry, ...prev].slice(0, MAX_EVENTS));
      setTypeCounts((prev) => {
        const next = new Map(prev);
        const t = event.data.event.type;
        next.set(t, (next.get(t) ?? 0) + 1);
        return next;
      });
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const typeFilterOptions = useMemo(
    () => [...typeCounts.keys()].sort(),
    [typeCounts],
  );

  const visibleEvents = useMemo(
    () =>
      events.filter((entry) => {
        if (!showIgnored && entry.ignored) return false;
        if (activeFilter && entry.type !== activeFilter) return false;
        return true;
      }),
    [events, showIgnored, activeFilter],
  );

  const handleClear = () => {
    setEvents([]);
    setTypeCounts(new Map());
    setActiveFilter('');
  };

  const handleExport = () => {
    const blob = new Blob(
      [JSON.stringify(events.filter((e) => !e.ignored).map((e) => e.payload), null, 2)],
      { type: 'application/json' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mandake-analytics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleDetect = async () => {
    if (banner?.onFix) {
      await banner.onFix();
      return;
    }
    const proxyBase = `${window.location.origin}/mandake-slides`;
    if (await probeMandakeServer(proxyBase)) {
      setBaseUrl(proxyBase);
      return;
    }
    const found = await detectMandakeDevBase();
    if (found) setBaseUrl(found);
    else {
      setBanner({
        html: `No Mandake server on ports ${PROBE_PORTS.join(', ')}. Run Mandake <code>npm run dev</code>.`,
        kind: 'error',
      });
    }
  };

  return (
    <>
      <header className="mh-header">
        <h1>Mandake analytics — iframe test harness</h1>
        <p>
          Simulates the <strong>participant parent</strong> that embeds slides in an iframe. Pick a
          slide, interact inside the iframe, and inspect <code>postMessage</code> events with{' '}
          <code>source: &quot;mandake&quot;</code>. Default origin uses the Propley proxy at{' '}
          <code>/mandake-slides</code> — or set <strong>Slides origin</strong> to a Mandake dev URL
          (e.g. <code>http://localhost:3002</code>).
          {' '}
          <Link href="/demo" style={{ color: 'var(--mh-accent)' }}>
            Back to demo
          </Link>
        </p>
        {slidesError ? (
          <p style={{ marginTop: 8, color: '#f0a0a0', fontSize: 12 }}>
            Slide list API failed ({slidesError}) — using fallback paths.
          </p>
        ) : null}
      </header>

      {banner ? (
        <div
          className={`mh-banner visible${banner.kind === 'info' ? ' info' : ''}`}
          role="alert"
        >
          <span dangerouslySetInnerHTML={{ __html: banner.html }} />
          {banner.onFix ? (
            <button type="button" className="mh-btn" onClick={() => void handleDetect()}>
              Detect Mandake / proxy
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mh-toolbar">
        <div className="mh-field grow">
          <label htmlFor="base-url">Slides origin</label>
          <input
            id="base-url"
            type="text"
            spellCheck={false}
            placeholder="http://localhost:3000 or /mandake-slides proxy"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            onBlur={() => void loadIframe()}
          />
        </div>
        <div className="mh-field grow">
          <label htmlFor="slide-path">Slide path</label>
          <select
            id="slide-path"
            value={slidePath}
            onChange={(e) => setSlidePath(e.target.value)}
            disabled={slides.length === 0}
          >
            {slides.map((slide) => (
              <option key={slide.id} value={slide.path}>
                {String(slide.order).padStart(2, '0')} {slide.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mh-field">
          <label>&nbsp;</label>
          <button type="button" className="mh-btn primary" onClick={() => void loadIframe()}>
            Reload iframe
          </button>
        </div>
        <div className="mh-field">
          <label>&nbsp;</label>
          <button
            type="button"
            className="mh-btn"
            title="Find Mandake dev server or Propley proxy"
            onClick={() => void handleDetect()}
          >
            Detect origin
          </button>
        </div>
        <div className="mh-field">
          <label>&nbsp;</label>
          <button
            type="button"
            className="mh-btn"
            onClick={() => window.open(getMandakeSlideSrc('/'), '_blank')}
          >
            Open Mandake
          </button>
        </div>
      </div>

      <div className="mh-layout">
        <section className="mh-frame-wrap" aria-label="Slide iframe">
          <div className={`mh-frame-meta${frameMetaError ? ' error' : ''}`}>
            {(iframeSrc ?? slideUrl) || '—'}
          </div>
          {iframeSrc ? (
            <iframe
              key={iframeSrc}
              src={iframeSrc}
              title="Mandake slide"
              allow="fullscreen"
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--mh-muted)',
                fontSize: 13,
              }}
            >
              {slidesLoading ? 'Loading slides…' : 'Select a slide and reload the iframe'}
            </div>
          )}
        </section>

        <aside className="mh-log-panel" aria-label="Analytics event log">
          <div className="mh-log-header">
            <span className={`mh-status${paused ? ' paused' : ''}`}>
              {paused ? 'Paused' : 'Listening'}
            </span>
            <label className="mh-checkbox-inline">
              <input
                type="checkbox"
                checked={showIgnored}
                onChange={(e) => setShowIgnored(e.target.checked)}
              />
              Show non-mandake messages
            </label>
            <button type="button" className="mh-btn" onClick={() => setPaused((p) => !p)}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" className="mh-btn" onClick={handleExport}>
              Export JSON
            </button>
            <button type="button" className="mh-btn danger" onClick={handleClear}>
              Clear
            </button>
          </div>

          {typeCounts.size > 0 ? (
            <div className="mh-counts">
              {[...typeCounts.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([type, count]) => (
                  <span key={type} className="mh-chip">
                    <strong>{count}</strong>
                    {type}
                  </span>
                ))}
            </div>
          ) : null}

          <div className="mh-filters">
            <label htmlFor="type-filter">Filter by type</label>
            <select
              id="type-filter"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="">All types</option>
              {typeFilterOptions.map((type) => (
                <option key={type} value={type}>
                  {type} ({typeCounts.get(type)})
                </option>
              ))}
            </select>
          </div>

          <ol className="mh-event-log">
            {visibleEvents.map((entry) => (
              <li
                key={entry.id}
                className={`mh-event-item${entry.ignored ? ' ignored' : ''}`}
              >
                <div className="mh-event-top">
                  <span className="mh-event-type">
                    {entry.ignored ? 'other message' : entry.type}
                  </span>
                  {!entry.ignored && entry.slide ? (
                    <span className="mh-event-slide">· {entry.slide}</span>
                  ) : null}
                  <span className="mh-event-time">{formatLogTime(entry.receivedAt)}</span>
                </div>
                <pre>{JSON.stringify(entry.payload, null, 2)}</pre>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </>
  );
}
