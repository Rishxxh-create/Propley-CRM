import { AudioFrame } from "@livekit/rtc-node";

const CHANNELS = 1;
const BLOCK_MS = 100;

export function silentAmbience(sampleRate: number): AsyncIterable<AudioFrame> {
  const samples = Math.round((sampleRate * BLOCK_MS) / 1000);

  return {
    async *[Symbol.asyncIterator]() {
      for (;;) {
        yield new AudioFrame(
          new Int16Array(samples * CHANNELS),
          sampleRate,
          CHANNELS,
          samples,
        );
      }
    },
  };
}
