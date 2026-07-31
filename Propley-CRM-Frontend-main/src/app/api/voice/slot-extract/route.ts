import { NextResponse } from 'next/server';
import {
  parseSlotFieldsWithVertex,
  isVertexConfigured,
} from '@/services/ai-engine/gemini-intent.server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      commandId?: string;
      missingFields?: string[];
      filledArgs?: Record<string, string | number | boolean | null | undefined>;
      text?: string;
    };

    const commandId = body.commandId?.trim();
    const missingFields = Array.isArray(body.missingFields) ? body.missingFields : [];
    const text = body.text?.trim();

    if (!commandId) {
      return NextResponse.json({ error: 'commandId is required' }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }
    if (!isVertexConfigured()) {
      return NextResponse.json(
        { error: 'Vertex AI is not configured. Set VERTEX_CREDENTIAL/PROJECT/LOCATION in .env.local.' },
        { status: 503 }
      );
    }

    const result = await parseSlotFieldsWithVertex({
      commandId,
      missingFields,
      filledArgs: body.filledArgs ?? {},
      text,
    });

    return NextResponse.json({
      action: result.action,
      fields: result.fields,
      commands: result.commands ?? [],
      source: 'vertex' as const,
    });
  } catch (err) {
    console.error('[voice/slot-extract] failed', err);
    const message = err instanceof Error ? err.message : 'Slot extraction failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
