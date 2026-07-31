/**
 * Merge STT partial/final segments into one utterance before intent commit.
 */

/** Prefer the longer string when one extends the other (cumulative STT). */
export function mergeTranscriptSegment(current: string, incoming: string): string {
  const a = current.trim();
  const b = incoming.trim();
  if (!b) return a;
  if (!a) return b;
  if (b === a) return a;
  if (b.startsWith(a)) return b;
  if (a.startsWith(b)) return a;
  if (a.includes(b)) return a;
  if (b.includes(a)) return b;
  return `${a} ${b}`.replace(/\s+/g, ' ').trim();
}
