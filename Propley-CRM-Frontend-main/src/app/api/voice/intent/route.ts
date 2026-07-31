import { NextResponse } from 'next/server';
import {
  parseTranscriptWithGemini,
  parseTranscriptWithVertex,
  isVertexConfigured,
} from '@/services/ai-engine/gemini-intent.server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      transcript?: string;
      originalTranscript?: string;
      apiKey?: string;
    };
    const transcript = body.transcript?.trim();
    const originalTranscript = body.originalTranscript?.trim();

    if (!transcript) {
      return NextResponse.json({ error: 'transcript is required' }, { status: 400 });
    }

    // Prefer Vertex when its creds are configured — server-side, no key in browser.
    if (isVertexConfigured()) {
      const result = await parseTranscriptWithVertex(transcript, originalTranscript);
      return NextResponse.json({
        commands: result.commands,
        agentReply: result.agentReply,
        source: 'vertex' as const,
      });
    }

    // Fallback: Gemini API key (legacy path).
    const apiKey =
      process.env.GEMINI_API_KEY?.trim() ||
      body.apiKey?.trim() ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'No AI backend configured. Set VERTEX_CREDENTIAL/PROJECT/LOCATION (preferred) or GEMINI_API_KEY in Propley-meeting/.env.local.',
        },
        { status: 503 }
      );
    }

    const result = await parseTranscriptWithGemini(transcript, apiKey, originalTranscript);
    return NextResponse.json({
      commands: result.commands,
      agentReply: result.agentReply,
      source: 'gemini' as const,
    });
  } catch (err) {
    console.error('[voice/intent] parse failed', err);
    const message = err instanceof Error ? err.message : 'AI intent parsing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
