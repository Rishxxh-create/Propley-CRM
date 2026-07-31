import type {
  ClarityExportDimension,
  ClarityInsightMetric,
  FetchClarityInsightsOptions,
} from '@/types/clarity-export';

const CLARITY_EXPORT_BASE = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';

export type { ClarityExportDimension, ClarityInsightMetric, FetchClarityInsightsOptions };

export class ClarityExportError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string
  ) {
    super(message);
    this.name = 'ClarityExportError';
  }
}

/** Server-only: Microsoft Clarity Data Export API (max 10 requests/project/day). */
export async function fetchClarityLiveInsights(
  token: string,
  options: FetchClarityInsightsOptions = {}
): Promise<ClarityInsightMetric[]> {
  const { numOfDays = 3, dimension1 = 'URL', dimension2, dimension3 } = options;

  const params = new URLSearchParams({
    numOfDays: String(numOfDays),
    dimension1,
  });
  if (dimension2) params.set('dimension2', dimension2);
  if (dimension3) params.set('dimension3', dimension3);

  const res = await fetch(`${CLARITY_EXPORT_BASE}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const text = await res.text();

  if (!res.ok) {
    throw new ClarityExportError(
      clarityExportErrorMessage(res.status, text),
      res.status,
      text
    );
  }

  try {
    const data = JSON.parse(text) as ClarityInsightMetric[];
    return Array.isArray(data) ? data : [];
  } catch {
    throw new ClarityExportError('Invalid JSON from Clarity Data Export API', 502, text);
  }
}

function clarityExportErrorMessage(status: number, body: string): string {
  if (status === 401) return 'Clarity token is missing, invalid, or expired.';
  if (status === 403) return 'Clarity token is not authorized for this project.';
  if (status === 429) return 'Clarity daily API limit reached (10 requests per project per day).';
  if (status === 400) return 'Invalid Clarity export request parameters.';
  if (body) return `Clarity export failed (${status}): ${body.slice(0, 200)}`;
  return `Clarity export failed (${status}).`;
}

/** Keep rows relevant to the Propley demo routes when dimension is URL. */
export function filterDemoUrlRows(metrics: ClarityInsightMetric[]): ClarityInsightMetric[] {
  return metrics.map((metric) => ({
    ...metric,
    information: metric.information.filter((row) => {
      const url = String(row.URL ?? row.Url ?? row.url ?? '').toLowerCase();
      if (!url) return true;
      return url.includes('/demo');
    }),
  }));
}
