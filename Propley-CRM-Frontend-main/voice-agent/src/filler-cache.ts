import { AudioFrame, AudioResampler } from "@livekit/rtc-node";
import type * as sarvam from "@livekit/agents-plugin-sarvam";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fillersFor } from "./fillers.js";
import { FILLER_CACHE_DIR } from "./config.js";

const SILENCE_THRESHOLD = 350;

const THROTTLE_MS = 250;
const MAX_RETRIES = 3;
const BACKOFF_MS = 600;
const FRAME_SAMPLES = 4800;

const STALE_LOCK_MS = 5 * 60_000;
const WAIT_FOR_RENDERER_MS = 120_000;
const WAIT_POLL_MS = 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class ClipStore {
  private readonly dir: string | null;

  constructor(private readonly voice: string) {
    try {
      mkdirSync(FILLER_CACHE_DIR, { recursive: true });
      this.dir = FILLER_CACHE_DIR;
    } catch {
      console.warn(`[filler] ${FILLER_CACHE_DIR} is not writable — clips will not persist`);
      this.dir = null;
    }
  }

  private path(language: string, text: string): string | null {
    if (!this.dir) return null;
    const key = createHash("sha1").update(`${this.voice}|${language}|${text}`).digest("hex");
    return resolve(this.dir, `${key}.pcm`);
  }

  read(language: string, text: string, sampleRate: number): AudioFrame[] | null {
    const file = this.path(language, text);
    if (!file) return null;

    try {
      const raw = readFileSync(file);
      if (raw.byteLength < 2) return null;

      const pcm = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength >> 1);
      const frames: AudioFrame[] = [];
      for (let i = 0; i < pcm.length; i += FRAME_SAMPLES) {
        const slice = pcm.subarray(i, Math.min(i + FRAME_SAMPLES, pcm.length));
        const owned = new Int16Array(slice.length);
        owned.set(slice);
        frames.push(new AudioFrame(owned, sampleRate, 1, owned.length));
      }
      return frames.length > 0 ? frames : null;
    } catch {
      return null;
    }
  }

  claimRenderer(): boolean {
    if (!this.dir) return true;

    const lock = resolve(this.dir, ".rendering");
    try {
      mkdirSync(lock);
      return true;
    } catch {
      try {
        const age = Date.now() - statSync(lock).mtimeMs;
        if (age > STALE_LOCK_MS) {
          rmSync(lock, { recursive: true, force: true });
          mkdirSync(lock);
          return true;
        }
      } catch {}
      return false;
    }
  }

  isRendering(): boolean {
    if (!this.dir) return false;
    try {
      const age = Date.now() - statSync(resolve(this.dir, ".rendering")).mtimeMs;
      return age < STALE_LOCK_MS;
    } catch {
      return false;
    }
  }

  releaseRenderer(): void {
    if (!this.dir) return;
    try {
      rmSync(resolve(this.dir, ".rendering"), { recursive: true, force: true });
    } catch {}
  }

  write(language: string, text: string, frames: AudioFrame[]): void {
    const file = this.path(language, text);
    if (!file || frames.length === 0) return;

    const total = frames.reduce((n, f) => n + f.data.length, 0);
    const pcm = new Int16Array(total);
    let offset = 0;
    for (const frame of frames) {
      pcm.set(frame.data, offset);
      offset += frame.data.length;
    }

    try {
      const temp = `${file}.${process.pid}.tmp`;
      writeFileSync(temp, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength));
      renameSync(temp, file);
    } catch {}
  }
}

function isSilent(frame: AudioFrame): boolean {
  const samples = frame.data;
  let peak = 0;
  for (let i = 0; i < samples.length; i += 8) {
    const value = Math.abs(samples[i]);
    if (value > peak) peak = value;
    if (peak > SILENCE_THRESHOLD) return false;
  }
  return true;
}

function trimTrailingSilence(frames: AudioFrame[]): AudioFrame[] {
  let last = frames.length - 1;
  while (last > 0 && isSilent(frames[last])) last--;
  return frames.slice(0, last + 1);
}

function resample(frames: AudioFrame[], targetRate: number): AudioFrame[] {
  if (frames.length === 0) return frames;

  const source = frames[0];
  if (source.sampleRate === targetRate) return frames;

  const resampler = new AudioResampler(source.sampleRate, targetRate, source.channels);
  const out: AudioFrame[] = [];
  for (const frame of frames) out.push(...resampler.push(frame));
  out.push(...resampler.flush());
  return out;
}

export class FillerCache {
  private readonly frames = new Map<string, AudioFrame[]>();
  private readonly warmed = new Set<string>();
  private readonly inFlight = new Map<string, Promise<void>>();

  private readonly store: ClipStore;

  constructor(
    private readonly tts: sarvam.TTS,
    private readonly targetSampleRate: number,
    voice = "default",
  ) {
    this.store = new ClipStore(voice);
  }

  get size(): number {
    return this.frames.size;
  }

  get languages(): number {
    return this.warmed.size;
  }

  private key(language: string, text: string): string {
    return `${language}::${text}`;
  }

  has(language: string, text: string): boolean {
    return this.frames.has(this.key(language, text));
  }

  async warmAll(languages: string[]): Promise<void> {
    const renderer = this.store.claimRenderer();

    if (renderer) {
      try {
        for (const language of languages) await this.warm(language);
      } finally {
        this.store.releaseRenderer();
      }
      return;
    }

    for (const language of languages) this.loadFromDisk(language);

    const deadline = Date.now() + WAIT_FOR_RENDERER_MS;
    while (this.store.isRendering() && Date.now() < deadline) {
      await sleep(WAIT_POLL_MS);
    }

    for (const language of languages) this.loadFromDisk(language);
  }

  private loadFromDisk(language: string): void {
    let ready = 0;
    for (const text of fillersFor(language)) {
      const key = this.key(language, text);
      if (this.frames.has(key)) {
        ready++;
        continue;
      }
      const cached = this.store.read(language, text, this.targetSampleRate);
      if (!cached) continue;
      this.frames.set(key, cached);
      ready++;
    }
    if (ready > 0) this.warmed.add(language);
  }

  async warm(language: string): Promise<void> {
    if (this.warmed.has(language)) return;

    const existing = this.inFlight.get(language);
    if (existing) return existing;

    const job = this.render(language).finally(() => this.inFlight.delete(language));
    this.inFlight.set(language, job);
    return job;
  }

  private async render(language: string): Promise<void> {
    let ready = 0;
    let synthesised = 0;

    for (const text of fillersFor(language)) {
      const key = this.key(language, text);
      if (this.frames.has(key)) {
        ready++;
        continue;
      }

      const cached = this.store.read(language, text, this.targetSampleRate);
      if (cached) {
        this.frames.set(key, cached);
        ready++;
        continue;
      }

      if (synthesised === 0) this.tts.updateOptions({ targetLanguageCode: language });

      const frames = await this.synthesize(text, language);
      if (!frames) continue;

      this.frames.set(key, frames);
      this.store.write(language, text, frames);
      ready++;
      synthesised++;

      await sleep(THROTTLE_MS);
    }

    if (ready > 0) this.warmed.add(language);
  }

  private async synthesize(text: string, language: string): Promise<AudioFrame[] | null> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const collected: AudioFrame[] = [];
        for await (const chunk of this.tts.synthesize(text)) {
          collected.push(chunk.frame);
        }
        if (collected.length === 0) return null;
        return resample(trimTrailingSilence(collected), this.targetSampleRate);
      } catch (err) {
        if (attempt === MAX_RETRIES) {
          console.warn(`[filler] gave up on ${JSON.stringify(text)} (${language}): ${String(err).slice(0, 80)}`);
          return null;
        }
        await sleep(BACKOFF_MS * 2 ** attempt + Math.random() * BACKOFF_MS);
      }
    }
    return null;
  }

  frameStream(language: string, text: string): AsyncIterable<AudioFrame> | null {
    const cached = this.frames.get(this.key(language, text));
    if (!cached || cached.length === 0) return null;

    return (async function* () {
      for (const frame of cached) yield frame;
    })();
  }
}
