/** Microsoft Clarity project — demo landing + analytics only. */
export const CLARITY_PROJECT_ID = 'wsfm0rhyky';

export function getDemoSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

/** Absolute stylesheet URL so Clarity replay can fetch CSS (relative paths often 404 in replay). */
export function getDemoStylesheetUrl(): string {
  return `${getDemoSiteOrigin()}/demo/clarity-demo.css`;
}

export function getClarityProjectUrls() {
  const base = `https://clarity.microsoft.com/projects/view/${CLARITY_PROJECT_ID}`;
  return {
    home: base,
    dashboard: `${base}/dashboard`,
    recordings: `${base}/recordings`,
    heatmaps: `${base}/heatmaps`,
    sessions: `${base}/sessions`,
    settings: `${base}/settings`,
  } as const;
}

export const DEMO_TRACKED_PATHS = ['/demo', '/demo/analytics'] as const;
