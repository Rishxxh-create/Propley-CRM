/**
 * Algorithmic Devanagari ↔ Latin transliteration for voice intent normalization.
 * No per-customer static tables — names and phrases are derived at runtime.
 */

const HALANT = '\u094d';
const ANUSVARA = '\u0902';
const VISARGA = '\u0903';

const INDEPENDENT_VOWELS: Record<string, string> = {
  '\u0905': 'a',
  '\u0906': 'aa',
  '\u0907': 'i',
  '\u0908': 'ee',
  '\u0909': 'u',
  '\u090a': 'oo',
  '\u090f': 'e',
  '\u0910': 'ai',
  '\u0913': 'o',
  '\u0914': 'au',
};

const MATRAS: Record<string, string> = {
  '\u093e': 'aa',
  '\u093f': 'i',
  '\u0940': 'ee',
  '\u0941': 'u',
  '\u0942': 'oo',
  '\u0947': 'e',
  '\u0948': 'ai',
  '\u094b': 'o',
  '\u094c': 'au',
};

const CONSONANTS: Record<string, string> = {
  '\u0915': 'k',
  '\u0916': 'kh',
  '\u0917': 'g',
  '\u0918': 'gh',
  '\u0919': 'ng',
  '\u091a': 'ch',
  '\u091b': 'chh',
  '\u091c': 'j',
  '\u091d': 'jh',
  '\u091e': 'ny',
  '\u091f': 't',
  '\u0920': 'th',
  '\u0921': 'd',
  '\u0922': 'dh',
  '\u0923': 'n',
  '\u0924': 't',
  '\u0925': 'th',
  '\u0926': 'd',
  '\u0927': 'dh',
  '\u0928': 'n',
  '\u092a': 'p',
  '\u092b': 'ph',
  '\u092c': 'b',
  '\u092d': 'bh',
  '\u092e': 'm',
  '\u092f': 'y',
  '\u0930': 'r',
  '\u0932': 'l',
  '\u0935': 'v',
  '\u0936': 'sh',
  '\u0937': 'sh',
  '\u0938': 's',
  '\u0939': 'h',
  '\u0958': 'k',
  '\u0959': 'kh',
  '\u095a': 'g',
  '\u095b': 'j',
  '\u095c': 'd',
  '\u095d': 'dh',
  '\u095e': 'f',
  '\u095f': 'y',
};

/** English loanwords often use ट/ड in Hinglish Devanagari (not त/द). */
const LOANWORD_CONSONANT: Record<string, string> = {
  t: '\u091f',
  d: '\u0921',
  p: '\u092a',
  b: '\u092c',
  k: '\u0915',
  g: '\u0917',
  m: '\u092e',
  n: '\u0928',
  l: '\u0932',
  r: '\u0930',
  v: '\u0935',
  s: '\u0938',
  h: '\u0939',
  y: '\u092f',
  f: '\u095e',
  c: '\u0915',
  j: '\u091c',
  w: '\u0935',
  x: '\u0915\u094d\u0938',
  z: '\u091c',
};

const LOANWORD_MATRA: Record<string, string> = {
  a: '',
  e: '\u0947',
  i: '\u093f',
  o: '\u094b',
  u: '\u0941',
};

function polishLatin(s: string): string {
  return s
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/([^aeiou])\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Devanagari → Latin (e.g. टेल मी → tel mi, राहुल → rahul). */
export function devanagariToLatin(input: string): string {
  const chars = [...input];
  let out = '';

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];

    if (c === HALANT) continue;

    if (c === ANUSVARA) {
      out += 'n';
      continue;
    }
    if (c === VISARGA) {
      out += 'h';
      continue;
    }

    const matra = MATRAS[c];
    if (matra) {
      out += matra;
      continue;
    }

    const vowel = INDEPENDENT_VOWELS[c];
    if (vowel) {
      out += vowel;
      continue;
    }

    const cons = CONSONANTS[c];
    if (cons) {
      let cluster = cons;
      let j = i + 1;

      if (chars[j] === HALANT) {
        j++;
        const nextCons = CONSONANTS[chars[j]];
        if (nextCons) {
          cluster += nextCons;
          i = j;
          j = i + 1;
        } else {
          i = j - 1;
        }
      }

      const nextMatra = MATRAS[chars[j]];
      if (nextMatra) {
        cluster += nextMatra;
        i = j;
      } else if (!INDEPENDENT_VOWELS[chars[j]] && chars[j] !== HALANT && chars[j] !== ANUSVARA) {
        cluster += 'a';
      }

      out += cluster;
      continue;
    }

    if (/\s/.test(c)) out += ' ';
  }

  return polishLatin(out);
}

/** Latin ASCII → Devanagari for building dynamic match rules from CRM/catalog text. */
export function latinToDevanagariHinglish(word: string): string {
  const lower = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!lower) return '';

  let out = '';
  let i = 0;

  while (i < lower.length) {
    const digraph = lower.slice(i, i + 2);
    if (digraph === 'ch' || digraph === 'sh' || digraph === 'th' || digraph === 'ph') {
      const ch = LOANWORD_CONSONANT[digraph[0]];
      const ch2 = LOANWORD_CONSONANT[digraph[1]];
      if (ch && ch2) out += ch + LOANWORD_MATRA['a'] + ch2;
      i += 2;
      continue;
    }

    const ch = lower[i];
    const cons = LOANWORD_CONSONANT[ch];
    if (cons) {
      const vowel = lower[i + 1];
      const matra = vowel && LOANWORD_MATRA[vowel] !== undefined ? LOANWORD_MATRA[vowel] : '';
      out += cons + (matra ?? '');
      i += matra && vowel ? 2 : 1;
      continue;
    }

    i++;
  }

  return out;
}

export function latinPhraseToDevanagariHinglish(phrase: string): string {
  return phrase
    .trim()
    .split(/\s+/)
    .map((w) => latinToDevanagariHinglish(w))
    .filter(Boolean)
    .join(' ');
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Flexible Devanagari regex (optional spaces between characters). */
export function devanagariPattern(devText: string): RegExp {
  const chars = [...devText].filter((c) => /[\u0900-\u097F]/.test(c));
  const body = chars.map((c) => escapeRegExp(c)).join('\\s*');
  return new RegExp(body, 'gu');
}
