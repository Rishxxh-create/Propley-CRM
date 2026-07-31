const FILLERS = new Set([
  "so",
  "and",
  "but",
  "then",
  "well",
  "like",
  "anyway",
  "actually",
  "hmm",
  "hm",
  "mmm",
  "mm",
  "uh",
  "um",
  "uhh",
  "umm",
  "ah",
  "aah",
  "oh",
  "ohh",
  "eh",
  "huh",
  "hmmm",
  "aa",
  "ay",
  "haan",
  "haa",
  "ha",
  "हम्म",
  "हम",
  "अरे",
  "अच्छा",
  "हाँ",
  "हा",
  "अं",
  "उम",
  "okay",
  "ok",
  "alright",
  "right",
  "cool",
  "nice",
  "sure",
  "thanks",
  "thank you",
  "ठीक",
  "ठीक है",
  "अच्छा है",
]);

const MIN_LETTERS = 2;

function stripPunctuation(text: string): string {
  return text.replace(/[.,!?;:'"()\[\]{}…।॥\-–—\s]+/g, " ").trim();
}

const FILLER_PHRASES = new Set([
  "thank you",
  "thanks a lot",
  "ठीक है",
  "अच्छा है",
  "समझ गया",
]);

export function isMeaningfulUtterance(raw: string): boolean {
  const text = stripPunctuation(raw ?? "").toLowerCase();
  if (!text) return false;

  const letters = text.replace(/[^\p{L}\p{N}]/gu, "");
  if (letters.length < MIN_LETTERS) return false;

  if (FILLER_PHRASES.has(text)) return false;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  if (words.every((w) => FILLERS.has(w))) return false;

  return true;
}
