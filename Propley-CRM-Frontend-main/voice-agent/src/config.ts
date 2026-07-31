import { config as loadEnv } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), "../.env.local") });

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`voice-agent: ${name} must be a number, got ${JSON.stringify(raw)}`);
  }
  return value;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === "") return fallback;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  throw new Error(`voice-agent: ${name} must be true or false, got ${JSON.stringify(raw)}`);
}

export type SttProvider = "deepgram" | "sarvam";

export const STT_PROVIDER: SttProvider =
  process.env.STT_PROVIDER === "deepgram" ? "deepgram" : "sarvam";

export const DEEPGRAM_STT_MODEL = process.env.DEEPGRAM_STT_MODEL ?? "deepgram/flux-general-multi";
export const DEEPGRAM_EAGER_EOT = num("DEEPGRAM_EAGER_EOT", 0.5);
export const DEEPGRAM_EOT = num("DEEPGRAM_EOT", 0.7);

export const SARVAM_STT_MODEL = "saaras:v3";
export const SARVAM_STT_MODE = "transcribe";
export const SARVAM_STT_LANGUAGE = "unknown";

export const INTERRUPTION_MIN_DURATION_MS = num("INTERRUPTION_MIN_DURATION_MS", 250);
export const INTERRUPTION_MIN_WORDS = num("INTERRUPTION_MIN_WORDS", 0);

export const VAD_ACTIVATION_THRESHOLD = num("VAD_ACTIVATION_THRESHOLD", 0.6);
export const VAD_MIN_SPEECH_MS = num("VAD_MIN_SPEECH_MS", 150);

export const ENDPOINTING_MIN_DELAY_MS = num("ENDPOINTING_MIN_DELAY_MS", 400);
export const ENDPOINTING_MAX_DELAY_MS = num("ENDPOINTING_MAX_DELAY_MS", 1600);

export const GREETING =
  process.env.GREETING ?? "Hi, I'm your Propley assistant. What can I do for you?";

export const TTS_MODEL = "bulbul:v3" as const;
export const TTS_SPEAKER = process.env.TTS_SPEAKER ?? "shubh";
export const TTS_TEMPERATURE = num("TTS_TEMPERATURE", 0.85);
export const TTS_PACE = num("TTS_PACE", 1.0);
export const TTS_SAMPLE_RATE = num("TTS_SAMPLE_RATE", 24000);

export const BACKGROUND_AUDIO_SAMPLE_RATE = 48000;

export const TTS_STREAMING = bool("TTS_STREAMING", true);

export const GEMINI_MODEL = process.env.VERTEX_MODEL ?? "gemini-2.5-flash";

export const LLM_TEMPERATURE = num("LLM_TEMPERATURE", 0.5);
export const VERTEX_PROJECT = process.env.VERTEX_PROJECT?.trim() ?? "";
export const VERTEX_LOCATION = process.env.VERTEX_LOCATION?.trim() ?? "us-central1";

export const RPC_TIMEOUT_MS = num("RPC_TIMEOUT_MS", 10_000);

export const IDLE_PROCESSES = num("IDLE_PROCESSES", 3);

export const DRAIN_TIMEOUT_MS = num("DRAIN_TIMEOUT_MS", 30_000);

export const WORKER_PORT = num("PORT", 8081);

export const FILLER_CACHE_DIR =
  process.env.FILLER_CACHE_DIR ?? resolve(tmpdir(), "propley-voice", "fillers");

export const VOICE_LANGUAGES = (process.env.VOICE_LANGUAGES ?? "")
  .split(",")
  .map((code) => code.trim())
  .filter(Boolean);

export const FILLER_DELAY_MS = num("FILLER_DELAY_MS", 150);

export function bootstrapVertexCredentials(): void {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return;

  let raw = process.env.VERTEX_CREDENTIAL?.trim();
  if (!raw) return;

  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    raw = raw.slice(1, -1);
  }

  try {
    JSON.parse(raw);
  } catch {
    throw new Error(
      "voice-agent: VERTEX_CREDENTIAL is not valid JSON. Prefer mounting the service account as a file and setting GOOGLE_APPLICATION_CREDENTIALS.",
    );
  }

  const dir = resolve(tmpdir(), "propley-voice");
  const file = resolve(dir, "vertex-sa.json");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(file, raw, { mode: 0o600 });
  process.env.GOOGLE_APPLICATION_CREDENTIALS = file;
}

export function assertConfigured(): void {
  const missing: string[] = [];
  if (!process.env.LIVEKIT_URL) missing.push("LIVEKIT_URL");
  if (!process.env.LIVEKIT_API_KEY) missing.push("LIVEKIT_API_KEY");
  if (!process.env.LIVEKIT_API_SECRET) missing.push("LIVEKIT_API_SECRET");

  if (!process.env.SARVAM_API_KEY) missing.push("SARVAM_API_KEY");
  if (!VERTEX_PROJECT) missing.push("VERTEX_PROJECT");
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) missing.push("VERTEX_CREDENTIAL");

  if (missing.length > 0) {
    throw new Error(`voice-agent is missing required env: ${missing.join(", ")}`);
  }
}
