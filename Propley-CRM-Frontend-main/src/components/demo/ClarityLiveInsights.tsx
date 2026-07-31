'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ClarityInsightMetric } from '@/types/clarity-export';

interface InsightsResponse {
  configured?: boolean;
  error?: string;
  fetchedAt?: string;
  demoOnly?: boolean;
  params?: { numOfDays?: number; dimension1?: string };
  metrics?: ClarityInsightMetric[];
}

type LoadState = 'idle' | 'loading' | 'ok' | 'error' | 'not_configured';

async function requestInsights(
  numOfDays: 1 | 2 | 3,
  demoOnly: boolean
): Promise<{ state: LoadState; data: InsightsResponse | null }> {
  const qs = new URLSearchParams({
    numOfDays: String(numOfDays),
    dimension1: 'URL',
    demoOnly: demoOnly ? 'true' : 'false',
  });

  const res = await fetch(`/api/demo/clarity-insights?${qs.toString()}`);
  const json = (await res.json()) as InsightsResponse;

  if (res.status === 503 && !json.configured) {
    return { state: 'not_configured', data: json };
  }
  if (!res.ok) {
    return { state: 'error', data: json };
  }
  return { state: 'ok', data: json };
}

export function ClarityLiveInsights() {
  const [state, setState] = useState<LoadState>('loading');
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [numOfDays, setNumOfDays] = useState<1 | 2 | 3>(3);
  const [demoOnly, setDemoOnly] = useState(true);

  const load = useCallback(async () => {
    setState('loading');
    setData(null);
    try {
      const result = await requestInsights(numOfDays, demoOnly);
      setState(result.state);
      setData(result.data);
    } catch {
      setState('error');
      setData({ error: 'Network error while calling Clarity export API.' });
    }
  }, [numOfDays, demoOnly]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await requestInsights(numOfDays, demoOnly);
        if (cancelled) return;
        setState(result.state);
        setData(result.data);
      } catch {
        if (cancelled) return;
        setState('error');
        setData({ error: 'Network error while calling Clarity export API.' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [numOfDays, demoOnly]);

  return (
    <section className="clarity-analytics-panel clarity-analytics-full">
      <h2>Live insights (Data Export API)</h2>
      <p className="clarity-analytics-tips" style={{ marginTop: 0 }}>
        Pulls project metrics from{' '}
        <span className="clarity-analytics-code">project-live-insights</span> (last 24–72h, UTC).
        Limited to <strong>10 requests per day</strong> per project.
      </p>

      <div className="clarity-analytics-toolbar">
        <label style={{ fontSize: '0.75rem', fontWeight: 500 }}>
          Days{' '}
          <select
            className="clarity-analytics-select"
            value={numOfDays}
            onChange={(e) => setNumOfDays(Number(e.target.value) as 1 | 2 | 3)}
          >
            <option value={1}>1 (24h)</option>
            <option value={2}>2 (48h)</option>
            <option value={3}>3 (72h)</option>
          </select>
        </label>
        <label style={{ fontSize: '0.75rem', fontWeight: 500, display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={demoOnly}
            onChange={(e) => setDemoOnly(e.target.checked)}
          />
          Only /demo URLs
        </label>
        <button type="button" className="clarity-demo-nav-cta" onClick={() => void load()} disabled={state === 'loading'}>
          {state === 'loading' ? 'Loading…' : 'Refresh API data'}
        </button>
      </div>

      {state === 'not_configured' && (
        <div className="clarity-analytics-error">
          {data?.error ?? 'Set CLARITY_DATA_EXPORT_TOKEN in .env.local and restart the dev server.'}
        </div>
      )}

      {state === 'error' && (
        <div className="clarity-analytics-error">{data?.error ?? 'Failed to load Clarity insights.'}</div>
      )}

      {state === 'ok' && data?.fetchedAt && (
        <p className="clarity-analytics-muted">
          Last fetched {new Date(data.fetchedAt).toLocaleString()} · dimension:{' '}
          {data.params?.dimension1 ?? 'URL'}
          {data.demoOnly ? ' · filtered to /demo' : ''}
        </p>
      )}

      {state === 'ok' && data?.metrics && data.metrics.length === 0 && (
        <p className="clarity-analytics-muted">
          No rows returned. Visit /demo to generate traffic, wait a few hours, then refresh. If demo-only
          filter is on, ensure sessions include <span className="clarity-analytics-code">/demo</span> in
          the URL dimension.
        </p>
      )}

      {state === 'ok' &&
        data?.metrics?.map((metric) => (
          <div key={metric.metricName} style={{ marginTop: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.35rem', fontSize: '0.8125rem', fontWeight: 600 }}>{metric.metricName}</h3>
            {metric.information.length === 0 ? (
              <p className="clarity-analytics-muted">No data for this metric.</p>
            ) : (
              <div className="clarity-analytics-table-wrap">
                <table className="clarity-analytics-table">
                  <thead>
                    <tr>
                      {Object.keys(metric.information[0]).map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metric.information.slice(0, 25).map((row, i) => (
                      <tr key={i}>
                        {Object.keys(metric.information[0]).map((col) => (
                          <td key={col}>{formatCell(row[col])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {metric.information.length > 25 && (
                  <p className="clarity-analytics-muted">Showing 25 of {metric.information.length} rows.</p>
                )}
              </div>
            )}
          </div>
        ))}
    </section>
  );
}

function formatCell(value: string | number | undefined): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return String(value);
}
