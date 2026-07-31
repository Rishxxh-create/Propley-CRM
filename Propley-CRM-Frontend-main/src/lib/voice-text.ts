const VOICE_FILLER_PREFIX =
  /^(?:ah|uh|um|hm|hmm|so|ok|okay|well|like|yeah|yes|right|please|bas|haan|ha|ji)\s*,?\s*/i;

/** Strip leading disfluencies from STT (e.g. "Okay tell me something about Rahul"). */
export function stripVoiceFillers(text: string): string {
  let t = text.trim();
  let guard = 0;
  while (VOICE_FILLER_PREFIX.test(t) && guard++ < 8) {
    t = t.replace(VOICE_FILLER_PREFIX, '').trim();
  }
  return t;
}
