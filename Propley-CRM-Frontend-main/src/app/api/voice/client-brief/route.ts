import { NextResponse } from 'next/server';
import {
  buildClientBriefPayload,
  formatClientDetailsMessage,
  type ClientBriefPayload,
} from '@/lib/client-voice-lookup';
import { generateClientBriefWithGemini } from '@/services/ai-engine/gemini-client-brief.server';
import type { Customer } from '@/lib/mock-data';
import type { StoredMeeting } from '@/lib/mock-data';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userQuestion?: string;
      customer?: Customer;
      presentations?: StoredMeeting[];
      geminiApiKey?: string;
    };

    const customer = body.customer;
    if (!customer?.id || !customer.name) {
      return NextResponse.json({ error: 'customer is required' }, { status: 400 });
    }

    const userQuestion = body.userQuestion?.trim() || `Tell me about ${customer.name}`;
    const payload: ClientBriefPayload = buildClientBriefPayload(
      customer,
      userQuestion,
      body.presentations
    );

    const apiKey =
      process.env.GEMINI_API_KEY?.trim() ||
      body.geminiApiKey?.trim() ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json({
        brief: formatClientDetailsMessage(customer, body.presentations),
        source: 'fallback' as const,
        reason: 'no_gemini_key',
      });
    }

    const generated = await generateClientBriefWithGemini(payload, apiKey);

    if (generated.source === 'gemini' && generated.brief) {
      return NextResponse.json({
        brief: generated.brief,
        source: 'gemini' as const,
      });
    }

    return NextResponse.json({
      brief: formatClientDetailsMessage(customer, body.presentations),
      source: 'fallback' as const,
    });
  } catch (err) {
    console.error('[voice/client-brief] failed', err);
    const message = err instanceof Error ? err.message : 'Client brief generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
