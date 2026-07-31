export interface TurnMetrics {
  endpointingMs?: number;
  sttLagMs?: number;
  llmTtftMs?: number;
  ttsTtfbMs?: number;
}

const round = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? Math.round(value) : undefined;

export class TurnRecorder {
  private metrics: TurnMetrics = {};
  private transcript = "";
  private heardLanguage: string | null = null;
  private index = 0;

  constructor(
    private readonly room: string,
    private readonly advisor: string,
  ) {}

  heard(transcript: string, language: string | null): void {
    this.transcript = transcript;
    this.heardLanguage = language;
    this.metrics = {};
  }

  metric(m: Record<string, unknown> & { type: string }): void {
    if (m.type === "eou_metrics") {
      this.metrics.endpointingMs = round(m.endOfUtteranceDelayMs);
      this.metrics.sttLagMs = round(m.transcriptionDelayMs);
    } else if (m.type === "llm_metrics") {
      this.metrics.llmTtftMs ??= round(m.ttftMs);
    } else if (m.type === "tts_metrics") {
      this.metrics.ttsTtfbMs ??= round(m.ttfbMs);
    }
  }

  private timeToFirstSound(): number | undefined {
    const { endpointingMs, sttLagMs, llmTtftMs, ttsTtfbMs } = this.metrics;
    if (llmTtftMs === undefined || ttsTtfbMs === undefined) return undefined;

    const thinking = (sttLagMs ?? 0) + llmTtftMs;
    return Math.round(Math.max(endpointingMs ?? 0, thinking) + ttsTtfbMs);
  }

  said(reply: string, replyLanguage: string | null): void {
    if (!reply.trim()) return;

    console.log(
      JSON.stringify({
        evt: "turn",
        room: this.room,
        advisor: this.advisor,
        n: ++this.index,
        heard: this.transcript,
        heardLang: this.heardLanguage,
        said: reply,
        saidLang: replyLanguage,
        firstSoundMs: this.timeToFirstSound(),
        ...this.metrics,
      }),
    );
  }
}
