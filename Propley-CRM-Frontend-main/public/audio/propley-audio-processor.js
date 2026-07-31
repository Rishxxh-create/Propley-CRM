/**
 * AudioWorklet processor that runs in the audio rendering thread.
 * Calculates RMS volume level and optionally passes raw PCM frames to the main thread.
 */
class PropleyAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];

    // Calculate RMS amplitude for visual level meter
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sum / channelData.length);

    // Send a compact message: {rms, pcm}
    // Transfer the buffer ownership for zero-copy to the main thread
    const pcmCopy = new Float32Array(channelData);
    this.port.postMessage({ rms, pcm: pcmCopy }, [pcmCopy.buffer]);

    return true; // keep processor alive
  }
}

registerProcessor('propley-audio-processor', PropleyAudioProcessor);
