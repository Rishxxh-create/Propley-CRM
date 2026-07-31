import { similarity } from "../../src/lib/phonetic-name-match";

const isIndic = (word: string) => /[ऀ-ॿ]/.test(word);

const CLASS: Record<string, string> = {
  r: "L", l: "L", j: "L",
  b: "B", v: "B", w: "B", p: "B", f: "B",
  d: "D", t: "D",
  k: "K", g: "K", q: "K", c: "K",
  s: "S", z: "S", x: "S",
  m: "M", n: "M",
  h: "H",
};

const DEVANAGARI: Record<string, string> = {
  क: "K", ख: "K", ग: "K", घ: "K", क़: "K", ख़: "K", ग़: "K",
  च: "L", छ: "L", ज: "L", झ: "L", ज़: "L", य: "L", र: "L", ल: "L", ळ: "L", ऱ: "L",
  ट: "D", ठ: "D", ड: "D", ढ: "D", त: "D", थ: "D", द: "D", ध: "D", ड़: "D", ढ़: "D",
  प: "B", फ: "B", ब: "B", भ: "B", व: "B", फ़: "B",
  स: "S", श: "S", ष: "S",
  म: "M", न: "M", ण: "M", ङ: "M", ञ: "M",
  ह: "H",
};

function keyOfWord(word: string): string {
  if (isIndic(word)) {
    let indic = "";
    for (const char of word) {
      const code = DEVANAGARI[char];
      if (!code) continue;

      if (char === "य" && indic.length > 0) continue;
      indic += code;
    }
    return indic;
  }

  const text = word
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  let key = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === "y") {
      if (i === 0) key += "L";
      continue;
    }

    if (char === "h" && i > 0 && CLASS[text[i - 1]] !== undefined && text[i - 1] !== "h") {
      continue;
    }

    const code = CLASS[char];
    if (code) key += code;
  }
  return key;
}

export function sttKey(input: string): string {
  const key = input
    .split(/\s+/)
    .filter(Boolean)
    .map(keyOfWord)
    .join("");
  return key.replace(/(.)\1+/g, "$1");
}

const SNAP_THRESHOLD = 0.86;
const MIN_KEY_LENGTH = 3;
const MIN_TOKEN_LENGTH = 4;

const minLengthFor = (word: string) => (isIndic(word) ? 3 : MIN_TOKEN_LENGTH);

const NEVER_A_NAME = new Set([

  "मुझे", "मेरे", "मेरा", "मेरी", "आप", "आपका", "आपकी", "आपके", "तुम", "हम", "यह", "वह",
  "इस", "उस", "इसमें", "उसमें", "क्या", "कौन", "कब", "कहाँ", "कैसे", "कितने", "कितनी",
  "और", "तो", "भी", "नहीं", "हाँ", "ठीक", "अच्छा", "ज़रा", "एक", "बार", "अब", "फिर",
  "बताओ", "बताइए", "बतायें", "दिखाओ", "दिखाइए", "खोलो", "खोलिए", "करो", "कीजिए", "जाओ",
  "जाइए", "चलो", "देखो", "सुनो", "लीजिए", "क्लाइंट", "मीटिंग", "प्रेजेंटेशन", "पाइपलाइन",
  "कैलेंडर", "डैशबोर्ड", "लोकेशन", "नंबर", "स्टेज", "मतलब", "वाला", "वाली", "किसके",
  "माझ्या", "किती", "तुमच्या", "आहेत", "काय", "कोण",

  "ମୋର", "ମୋତେ", "ଆପଣ", "ଆପଣଙ୍କ", "ଏହା", "ସେ", "କଣ", "କେତେ", "କିଏ", "କେବେ", "କେମିତି",
  "ଏବଂ", "ନା", "ହଁ", "ଠିକ୍", "ଅଛି", "ଅଛନ୍ତି", "ଗୋଟେ", "ଗୋଟିଏ", "ନୂଆ", "କରିବା", "ଦେଖାଅ",
  "ଖୋଲ", "ଯାଅ", "କୁହ", "ମିଟିଙ୍ଗ", "କ୍ଲାଇଣ୍ଟ", "ପାଇଁ",

  "about", "after", "again", "answer", "anyone", "already", "another",
  "because", "before", "being", "below", "between",
  "cancel", "check", "client", "clients", "close", "could",
  "customer", "customers", "dashboard", "detail", "details", "doing",
  "email", "every", "first", "going", "have", "here", "his", "her",
  "calendar", "guess", "into", "later", "list", "listed", "live", "look",
  "meeting", "meetings", "month", "more", "much", "name", "next", "number",
  "offer", "open", "page", "phone", "pipeline", "please", "presentation",
  "presentations", "reports", "right", "running", "schedule", "scroll",
  "settings", "show", "something", "stage", "status", "team", "tell",
  "that", "their", "them", "there", "these", "they", "thing", "this",
  "those", "today", "told", "week", "were", "what", "when", "where",
  "which", "while", "with", "would", "your",
]);

const TOKEN = /[\p{L}\p{M}\p{N}]+(?:'s)?/gu;

const bare = (token: string) => token.replace(/'s$/i, "");
const possessive = (token: string) => /'s$/i.test(token);

interface Term {
  text: string;
  words: string[];
}

function expand(vocabulary: string[]): Term[] {
  const terms = new Map<string, Term>();

  for (const entry of vocabulary) {
    const words = entry.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    if (words.length > 1) terms.set(entry, { text: entry, words });
    for (const word of words) {
      if (word.length >= MIN_TOKEN_LENGTH && !terms.has(word)) {
        terms.set(word, { text: word, words: [word] });
      }
    }
  }

  return [...terms.values()];
}

export function snapToVocabulary(transcript: string, vocabulary: string[]): string {
  if (!transcript.trim() || vocabulary.length === 0) return transcript;

  const terms = expand(vocabulary);
  if (terms.length === 0) return transcript;

  const tokens = [...transcript.matchAll(TOKEN)];
  if (tokens.length === 0) return transcript;

  const edits: Array<{ start: number; end: number; text: string }> = [];

  let i = 0;
  while (i < tokens.length) {
    const best = bestMatchAt(tokens, i, terms);
    if (!best) {
      i++;
      continue;
    }

    const first = tokens[i];
    const last = tokens[i + best.span - 1];
    edits.push({
      start: first.index!,
      end: last.index! + last[0].length,
      text: best.term.text + (possessive(last[0]) ? "'s" : ""),
    });
    i += best.span;
  }

  if (edits.length === 0) return transcript;

  let out = "";
  let cursor = 0;
  for (const edit of edits) {
    out += transcript.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  return out + transcript.slice(cursor);
}

function bestMatchAt(
  tokens: RegExpMatchArray[],
  index: number,
  terms: Term[],
): { term: Term; span: number; score: number } | null {
  let best: { term: Term; span: number; score: number } | null = null;

  let exact = 0;

  for (const term of terms) {
    const span = term.words.length;
    if (index + span > tokens.length) continue;

    const heard = tokens.slice(index, index + span).map((t) => bare(t[0]));

    if (heard.join(" ").toLowerCase() === term.text.toLowerCase()) {
      exact = Math.max(exact, span);
      continue;
    }

    if (heard.some((w) => w.length < minLengthFor(w))) continue;
    if (heard.some((w) => NEVER_A_NAME.has(w.toLowerCase()))) continue;

    const spokenKey = sttKey(heard.join(" "));
    const termKey = sttKey(term.text);
    if (spokenKey.length < MIN_KEY_LENGTH || termKey.length < MIN_KEY_LENGTH) continue;

    const score = similarity(termKey, spokenKey);
    if (score < SNAP_THRESHOLD) continue;

    if (!best || span > best.span || (span === best.span && score > best.score)) {
      best = { term, span, score };
    }
  }

  if (!best || best.span <= exact) return null;
  return best;
}
