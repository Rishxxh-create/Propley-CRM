import type { CommandExecution } from '@/types/voice-agent';

export type IntentSource = 'vertex' | 'gemini';

export interface ResolveTranscriptOptions {
  intentEngine?: 'gemini' | 'rules' | 'hybrid';
  geminiApiKey?: string | null;
  signal?: AbortSignal;
}

export interface ResolveTranscriptResult {
  queue: CommandExecution[];
  source: IntentSource;
  agentReply: string | null;
}

export async function resolveTranscriptToQueue(
  transcript: string,
  options: ResolveTranscriptOptions
): Promise<ResolveTranscriptResult> {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return { queue: [], source: 'vertex', agentReply: null };
  }

  try {
    const res = await fetch('/api/voice/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: trimmed,
        originalTranscript: trimmed,
        apiKey: options.geminiApiKey || undefined,
      }),
      signal: options.signal,
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        queue: [],
        source: 'vertex',
        agentReply: errBody.error ?? 'The AI could not parse that request.',
      };
    }

    const data = (await res.json()) as {
      commands?: CommandExecution[];
      agentReply?: string | null;
      source?: IntentSource;
    };

    return {
      queue: data.commands ?? [],
      source: data.source ?? 'vertex',
      agentReply: data.agentReply ?? null,
    };
  } catch (err) {
    console.error('[resolveTranscript] AI intent call failed', err);
    return {
      queue: [],
      source: 'vertex',
      agentReply: 'The AI intent service is unavailable. Check your connection and try again.',
    };
  }
}
