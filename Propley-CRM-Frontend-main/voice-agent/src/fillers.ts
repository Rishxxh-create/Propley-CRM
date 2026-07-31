const FILLERS: Record<string, string[]> = {
  "en-IN": ["Mm-hmm.", "Right.", "Sure.", "Okay.", "Of course.", "One moment."],
  "hi-IN": ["जी।", "हाँ।", "ठीक है।", "एक सेकंड।"],
  "mr-IN": ["हो.", "बरं.", "ठीक आहे.", "एक सेकंद."],
  "bn-IN": ["আচ্ছা।", "হ্যাঁ।", "এক সেকেন্ড।"],
  "ta-IN": ["சரி.", "ஆம்.", "ஒரு நிமிடம்."],
  "te-IN": ["సరే.", "అవును.", "ఒక్క నిమిషం."],
  "kn-IN": ["ಸರಿ.", "ಹೌದು.", "ಒಂದು ಕ್ಷಣ."],
  "gu-IN": ["બરાબર.", "હા.", "એક સેકન્ડ."],
  "pa-IN": ["ਠੀਕ ਹੈ।", "ਹਾਂ।", "ਇੱਕ ਸਕਿੰਟ।"],
  "ml-IN": ["ശരി.", "അതെ.", "ഒരു നിമിഷം."],
  "od-IN": ["ଠିକ୍ ଅଛି।", "ହଁ।", "ଏକ ସେକେଣ୍ଡ।"],
};

const DEFAULT_LANGUAGE = "en-IN";

export const FILLER_LANGUAGES = Object.keys(FILLERS);

let lastSpoken: string | null = null;

export function fillersFor(language: string | null): string[] {
  return FILLERS[language ?? DEFAULT_LANGUAGE] ?? FILLERS[DEFAULT_LANGUAGE];
}

export function pickFiller(language: string | null): string {
  const options = fillersFor(language);

  const fresh = options.filter((f) => f !== lastSpoken);
  const pool = fresh.length > 0 ? fresh : options;
  const choice = pool[Math.floor(Math.random() * pool.length)];

  lastSpoken = choice;
  return choice;
}

export function resetFillerHistory(): void {
  lastSpoken = null;
}
