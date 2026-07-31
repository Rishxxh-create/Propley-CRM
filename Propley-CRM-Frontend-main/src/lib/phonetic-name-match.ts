const DIGRAPHS: Array<[RegExp, string]> = [
  [/ch/g, "J"],
  [/sh/g, "S"],
  [/zh/g, "J"],
  [/ph/g, "P"],
  [/th/g, "T"],
  [/dh/g, "D"],
  [/bh/g, "B"],
  [/kh/g, "K"],
  [/gh/g, "G"],
  [/ck/g, "K"],
  [/ng/g, "N"],
];

const CONSONANTS: Record<string, string> = {
  b: "B",
  p: "P",
  f: "P",
  v: "V",
  w: "V",
  t: "T",
  d: "D",
  k: "K",
  q: "K",
  c: "K",
  g: "G",
  j: "J",
  z: "J",
  s: "S",
  x: "S",
  m: "M",
  n: "N",
  l: "L",
  r: "R",
  y: "Y",
  h: "H",
};

function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "");
}

export function phoneticKey(input: string): string {
  let text = normalize(input).replace(/\s+/g, "");
  if (!text) return "";

  for (const [pattern, code] of DIGRAPHS) {
    text = text.replace(pattern, code);
  }

  let key = "";
  for (const char of text) {
    if (char >= "A" && char <= "Z") {
      key += char;
      continue;
    }
    const code = CONSONANTS[char];
    if (code) key += code;
  }

  return key.replace(/(.)\1+/g, "$1");
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

export function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - levenshtein(a, b) / longest;
}

export function fuzzyNameScore(name: string, query: string): number {
  const n = normalize(name).trim();
  const q = normalize(query).trim();
  if (!n || q.length < 2) return 0;

  if (n === q) return 100;
  if (n.startsWith(q)) return 88;
  if (n.includes(q)) return 76;

  const nameTokens = n.split(/\s+/).filter(Boolean);
  const queryTokens = q.split(/\s+/).filter((t) => t.length > 1);

  if (queryTokens.length > 0 && queryTokens.every((t) => n.includes(t))) return 70;

  const candidates = [n, ...nameTokens];
  let best = 0;

  for (const candidate of candidates) {
    for (const token of queryTokens.length > 0 ? queryTokens : [q]) {
      if (phoneticKey(candidate) && phoneticKey(candidate) === phoneticKey(token)) {
        best = Math.max(best, 64);
      }
      const ratio = similarity(candidate, token);
      if (ratio >= 0.72) {
        best = Math.max(best, Math.round(40 + (ratio - 0.72) * 100));
      }
    }
  }

  if (phoneticKey(n) && phoneticKey(n) === phoneticKey(q)) best = Math.max(best, 68);

  return best;
}
