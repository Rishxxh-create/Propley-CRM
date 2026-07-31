const OPENERS: RegExp[] = [
  /^(oh[,\s]+)?my\s+apolog(y|ies)\b[\s.,!—–-]*/i,
  /^i\s+apologi[sz]e\b([^.!?]*)?[\s.,!—–-]*/i,
  /^apolog(y|ies)\b[\s.,!—–-]*/i,
  /^(you'?re|you\s+are)\s+(absolutely|completely|quite|entirely)?\s*right\b[\s.,!—–-]*/i,
  /^sorry\s+about\s+that\b[\s.,!—–-]*/i,
  /^my\s+mistake\b[\s.,!—–-]*/i,
];

const LEAD_IN = /^(ah|oh|well|hm+|right|ok|okay|sorry)\b[\s,.!—–-]*/i;

const startsWithApology = (text: string) => OPENERS.some((opener) => opener.test(text));

function peelToApology(text: string): string | null {
  let rest = text;
  for (let depth = 0; depth < 3; depth++) {
    const lead = LEAD_IN.exec(rest);
    if (!lead) return null;
    rest = rest.slice(lead[0].length);
    if (startsWithApology(rest)) return rest;
  }
  return null;
}

const PLUMBING: Array<[RegExp, string]> = [

  [/\[?reply-language:?[^\]]*\]?/gi, ""],

  [/\bI (cannot|can'?t|won'?t|am not able to) [^.!?]*\b(system )?(prompt|instructions?|functions?|tools?|capabilities)\b[^.!?]*[.!?]/gi, "I'm here for your pipeline."],
  [/\bmy (system )?(prompt|instructions?) (are|is|say|says)\b[^.!?]*[.!?]/gi, ""],

  [/\bI(?:'m| am)? ?(?:can )?only (?:see|seeing|have)[^.!?]*[.!?]/gi, "I'd need a name to pull that one up."],
  [/\bI can only (provide|give you|share) (details|information|data|anything) that (are|is) in (the|our|your) [a-z]+\b/gi, "I don't have that"],
  [/\bI (only )?have access to\b/gi, "I have"],
  [/\b(the|our) (system|crm|database) (shows|says|has)\b/gi, "I have"],
  [/\s+(in|from) (the|our|your) (system|crm|database|records)\b/gi, ""],
];

const MACHINERY =
  /(सिस्टम|सिस्टम्|डेटाबेस|डेटाबेस्|सीआरएम|रिकॉर्ड|ସିଷ୍ଟମ୍|ସିଷ୍ଟମ|ଡାଟାବେସ|ସିଆରଏମ|સિસ્ટમ|ડેટાબેઝ|সিস্টেম|ডেটাবেস|ਸਿਸਟਮ|சிஸ்டம்|సిస్టమ్|ಸಿಸ್ಟಂ|സിസ്റ്റം)/;

const SENTENCE = /(?<=[.!?।])\s+/;

export function stripPlumbing(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PLUMBING) out = out.replace(pattern, replacement);

  if (MACHINERY.test(out)) {
    const kept = out
      .split(SENTENCE)
      .filter((sentence) => !MACHINERY.test(sentence))
      .join(" ")
      .trim();

    if (kept) out = kept;
  }

  return out.replace(/\s{2,}/g, " ").replace(/\s+([.,!?])/g, "$1");
}

export function stripGrovel(text: string): string {
  let out = text.trimStart();

  for (let pass = 0; pass < 4; pass++) {
    const before = out;

    if (startsWithApology(out)) {
      for (const opener of OPENERS) out = out.replace(opener, "");
    } else {
      const peeled = peelToApology(out);
      if (peeled !== null) out = peeled;
    }

    out = out.trimStart();
    if (out === before) break;
  }

  if (!out) return text;
  if (out === text.trimStart()) return text;

  return out.charAt(0).toUpperCase() + out.slice(1);
}
