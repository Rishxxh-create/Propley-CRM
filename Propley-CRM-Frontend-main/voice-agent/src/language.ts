const SCRIPT_RANGES: Array<{ re: RegExp; language: string }> = [
  { re: /[ऀ-ॣ०-ॿ]/, language: "hi-IN" },
  { re: /[ঀ-৿]/, language: "bn-IN" },
  { re: /[਀-੿]/, language: "pa-IN" },
  { re: /[઀-૿]/, language: "gu-IN" },
  { re: /[଀-୿]/, language: "od-IN" },
  { re: /[஀-௿]/, language: "ta-IN" },
  { re: /[ఀ-౿]/, language: "te-IN" },
  { re: /[ಀ-೿]/, language: "kn-IN" },
  { re: /[ഀ-ൿ]/, language: "ml-IN" },
];

export const DEFAULT_TTS_LANGUAGE = "en-IN";

export const SPOKEN_LANGUAGES: Record<string, string> = {
  "en-IN": "English",
  "hi-IN": "Hindi",
  "bn-IN": "Bengali",
  "pa-IN": "Punjabi",
  "gu-IN": "Gujarati",
  "od-IN": "Odia",
  "ta-IN": "Tamil",
  "te-IN": "Telugu",
  "kn-IN": "Kannada",
  "ml-IN": "Malayalam",
  "mr-IN": "Marathi",
};

const ALIASES: Record<string, string> = {
  "or-IN": "od-IN",
  "ory-IN": "od-IN",
  or: "od-IN",
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-IN",
  pa: "pa-IN",
  gu: "gu-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  mr: "mr-IN",
  "en-US": "en-IN",
  "en-GB": "en-IN",
};

export function normalizeLanguage(code: string | null | undefined): string | null {
  if (!code) return null;
  const raw = code.trim();
  if (!raw || raw === "unknown") return null;
  const mapped = ALIASES[raw] ?? raw;
  return SPOKEN_LANGUAGES[mapped] ? mapped : null;
}

export function languageName(code: string): string {
  return SPOKEN_LANGUAGES[code] ?? "English";
}

export function ttsLanguageForText(text: string): string {
  for (const { re, language } of SCRIPT_RANGES) {
    if (re.test(text)) return language;
  }
  return DEFAULT_TTS_LANGUAGE;
}

const DEVANAGARI = new Set(["hi-IN", "mr-IN"]);

export function agreesWithScript(detected: string, text: string): boolean {
  const script = ttsLanguageForText(text);
  if (script === detected) return true;
  return DEVANAGARI.has(script) && DEVANAGARI.has(detected);
}

const INDIC_LETTER = /[ऀ-ॣ०-෿]/g;
const LATIN_LETTER = /[A-Za-z]/g;

const MAX_INDIC_IN_ENGLISH = 0.35;

function scriptMix(text: string): { indic: number; latin: number } {
  return {
    indic: (text.match(INDIC_LETTER) ?? []).length,
    latin: (text.match(LATIN_LETTER) ?? []).length,
  };
}

export function speaksLanguage(reply: string, expected: string): boolean {
  const { indic, latin } = scriptMix(reply);
  const total = indic + latin;
  if (total === 0) return true;

  if (expected === DEFAULT_TTS_LANGUAGE) {
    return indic / total < MAX_INDIC_IN_ENGLISH;
  }

  if (indic === 0) return false;

  const script = ttsLanguageForText(reply);
  if (script === expected) return true;

  return DEVANAGARI.has(script) && DEVANAGARI.has(expected);
}

export function resolveLanguage(detected: string | null | undefined, text: string): string {
  const tag = normalizeLanguage(detected);
  const script = ttsLanguageForText(text);

  if (!tag) return script;
  if (!text.trim()) return tag;
  return agreesWithScript(tag, text) ? tag : script;
}
