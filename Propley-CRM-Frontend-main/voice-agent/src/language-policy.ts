import {
  agreesWithScript,
  DEFAULT_TTS_LANGUAGE,
  normalizeLanguage,
  ttsLanguageForText,
} from "./language.js";

const ESTABLISH_MIN_WORDS = 4;

const SWITCH_MIN_WORDS = 2;

const MIN_CONFIDENCE = 0.75;

export interface LanguageEvidence {
  detected: string | null | undefined;
  transcript: string;

  confidence?: number;
}

export interface LanguageDecision {
  language: string;
  switched: boolean;
  reason?: string;
}

export class LanguagePolicy {
  private current: string;
  private readonly established = new Set<string>();
  private readonly allowed: Set<string> | null;

  constructor(initial: string = DEFAULT_TTS_LANGUAGE, allowed?: string[]) {
    this.current = initial;

    this.established.add(initial);

    this.allowed = allowed && allowed.length > 0 ? new Set(allowed) : null;
  }

  get language(): string {
    return this.current;
  }

  private permitted(language: string): boolean {
    return this.allowed === null || this.allowed.has(language);
  }

  observe(evidence: LanguageEvidence): LanguageDecision {
    const transcript = evidence.transcript ?? "";
    const words = transcript.trim().split(/\s+/).filter(Boolean).length;
    const confidence = evidence.confidence ?? 1;

    const tag = normalizeLanguage(evidence.detected);
    const script = ttsLanguageForText(transcript);

    let candidate = tag;
    if (tag && transcript.trim() && !agreesWithScript(tag, transcript)) {
      candidate = script;
    }
    if (!candidate) candidate = script;

    if (!this.permitted(candidate)) {
      return { language: this.current, switched: false, reason: `${candidate} is not a language we serve` };
    }

    if (candidate === this.current) {
      if (words >= ESTABLISH_MIN_WORDS) this.established.add(candidate);
      return { language: this.current, switched: false };
    }

    if (confidence < MIN_CONFIDENCE) {
      return {
        language: this.current,
        switched: false,
        reason: `only ${Math.round(confidence * 100)}% sure it was ${candidate}`,
      };
    }

    const needed = this.established.has(candidate) ? SWITCH_MIN_WORDS : ESTABLISH_MIN_WORDS;
    if (words < needed) {
      return {
        language: this.current,
        switched: false,
        reason: `${words} word${words === 1 ? "" : "s"} of ${candidate} is not enough to switch`,
      };
    }

    this.current = candidate;
    this.established.add(candidate);
    return { language: candidate, switched: true };
  }
}
