import { NextResponse } from 'next/server';
import {
  ClarityExportError,
  fetchClarityLiveInsights,
  filterDemoUrlRows,
  type ClarityExportDimension,
  type FetchClarityInsightsOptions,
} from '@/lib/clarity-export.server';

const DIMENSIONS = new Set<ClarityExportDimension>([
  'Browser',
  'Device',
  'Country/Region',
  'OS',
  'Source',
  'Medium',
  'Campaign',
  'Channel',
  'URL',
]);

function parseNumOfDays(raw: string | null): 1 | 2 | 3 {
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return n;
  return 3;
}

function parseDimension(raw: string | null): ClarityExportDimension | undefined {
  if (!raw) return undefined;
  return DIMENSIONS.has(raw as ClarityExportDimension)
    ? (raw as ClarityExportDimension)
    : undefined;
}

export async function GET(request: Request) {
  const token = process.env.CLARITY_DATA_EXPORT_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      {
        configured: false,
        error:
          'Add CLARITY_DATA_EXPORT_TOKEN to .env.local (Clarity → Settings → Data Export).',
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const demoOnly = searchParams.get('demoOnly') !== 'false';

  const options: FetchClarityInsightsOptions = {
    numOfDays: parseNumOfDays(searchParams.get('numOfDays')),
    dimension1: parseDimension(searchParams.get('dimension1')) ?? 'URL',
    dimension2: parseDimension(searchParams.get('dimension2')),
    dimension3: parseDimension(searchParams.get('dimension3')),
  };

  try {
    let metrics = await fetchClarityLiveInsights(token, options);
    if (demoOnly && options.dimension1 === 'URL') {
      metrics = filterDemoUrlRows(metrics);
    }

    return NextResponse.json({
      configured: true,
      fetchedAt: new Date().toISOString(),
      params: options,
      demoOnly,
      metrics,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Clarity export failed';
    const status = err instanceof ClarityExportError ? err.status : 502;
    return NextResponse.json({ configured: true, error: message }, { status: status >= 400 ? status : 502 });
  }
}
