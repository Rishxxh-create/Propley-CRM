/**
 * Builds transliteration rules at runtime from CRM customers + voice command catalog.
 */

import { type Customer } from '@/lib/mock-data';
import {
  CUSTOMERS_UPDATED_EVENT,
  readCustomers,
} from '@/lib/customers-store';
import { VOICE_COMMAND_CATALOG } from '@/services/ai-engine/command-catalog';
import {
  devanagariPattern,
  devanagariToLatin,
  escapeRegExp,
  latinPhraseToDevanagariHinglish,
  latinToDevanagariHinglish,
} from '@/lib/transliterate-devanagari';

export const HAS_DEVANAGARI = /[\u0900-\u097F]/;

/** Romanized Hindi triggers not always present as catalog aliases */
const EXTRA_ENGLISH_INTENT_PHRASES = [
  'tell me',
  'give me',
  'about',
  'something',
  'ke baare mein',
  'ke bare mein',
  'batao',
  'bataye',
  'open client',
  'find client',
  'our client',
  'presentations',
  'meetings',
];

export interface TransliterationLexicon {
  /** Devanagari substring → English (longest first) */
  devanagariReplacements: [RegExp, string][];
  /** Common STT romanization → canonical English phrase */
  romanReplacements: [RegExp, string][];
}

let cachedLexicon: TransliterationLexicon | null = null;
let listenersAttached = false;

function collectEnglishPhrases(customers: Customer[]): string[] {
  const phrases = new Set<string>(EXTRA_ENGLISH_INTENT_PHRASES);

  for (const entry of VOICE_COMMAND_CATALOG) {
    for (const alias of entry.aliases) {
      if (/^[\x20-\x7E]+$/.test(alias)) {
        phrases.add(alias.toLowerCase().trim());
      }
    }
    const name = entry.name.toLowerCase();
    if (name.length > 2) phrases.add(name);
  }

  for (const customer of customers) {
    phrases.add(customer.name.toLowerCase().trim());
    for (const part of customer.name.split(/\s+/)) {
      if (part.length > 1) phrases.add(part.toLowerCase());
    }
  }

  return [...phrases].sort((a, b) => b.length - a.length);
}

function generateRomanSttVariants(phrase: string): string[] {
  const variants = new Set<string>();
  const base = phrase.toLowerCase().trim();
  if (!base) return [];

  const rules: [RegExp, string][] = [
    [/\btell\b/g, 'tel'],
    [/\btell\b/g, 'tele'],
    [/\bsomething\b/g, 'samething'],
    [/\babout\b/g, 'abaut'],
    [/\bshow\b/g, 'sho'],
    [/\bopen\b/g, 'opn'],
    [/\bclient\b/g, 'klient'],
    [/\bcustomer\b/g, 'kastamar'],
    [/\bmeetings\b/g, 'mitings'],
    [/\bpresentations\b/g, 'prezentations'],
    [/\binformation\b/g, 'info'],
    [/\bcompleted\b/g, 'compleated'],
  ];

  variants.add(base);
  for (const [re, repl] of rules) {
    if (re.test(base)) variants.add(base.replace(re, repl));
  }

  variants.delete(base);
  return [...variants];
}

function buildDevanagariReplacementRules(
  customers: Customer[],
  englishPhrases: string[]
): [RegExp, string][] {
  const rules: { pattern: RegExp; english: string; len: number }[] = [];
  const seen = new Set<string>();

  const register = (devText: string, english: string) => {
    const key = `${devText}→${english}`;
    if (!devText || !english || seen.has(key)) return;
    if (!HAS_DEVANAGARI.test(devText)) return;
    seen.add(key);
    rules.push({
      pattern: devanagariPattern(devText),
      english: english.includes(' ') ? ` ${english.trim()} ` : english.trim(),
      len: [...devText].length,
    });
  };

  for (const phrase of englishPhrases) {
    register(latinPhraseToDevanagariHinglish(phrase), phrase);
    if (phrase.includes(' ')) {
      for (const word of phrase.split(/\s+/)) {
        if (word.length > 2) register(latinToDevanagariHinglish(word), word);
      }
    }
  }

  for (const customer of customers) {
    const full = customer.name.trim();
    register(latinPhraseToDevanagariHinglish(full), full);
    for (const part of full.split(/\s+/)) {
      if (part.length > 1) {
        register(latinToDevanagariHinglish(part), part);
      }
    }
  }

  rules.sort((a, b) => b.len - a.len);
  return rules.map((r) => [r.pattern, r.english] as [RegExp, string]);
}

function buildRomanReplacementRules(englishPhrases: string[]): [RegExp, string][] {
  const rules: { pattern: RegExp; english: string; len: number }[] = [];
  const seen = new Set<string>();

  for (const phrase of englishPhrases) {
    for (const variant of generateRomanSttVariants(phrase)) {
      const key = `${variant}→${phrase}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rules.push({
        pattern: new RegExp(`\\b${escapeRegExp(variant)}\\b`, 'gi'),
        english: phrase,
        len: variant.length,
      });
    }
  }

  rules.sort((a, b) => b.len - a.len);
  return rules.map((r) => [r.pattern, r.english] as [RegExp, string]);
}

export function buildTransliterationLexicon(): TransliterationLexicon {
  const customers = readCustomers();
  const englishPhrases = collectEnglishPhrases(customers);

  return {
    devanagariReplacements: buildDevanagariReplacementRules(customers, englishPhrases),
    romanReplacements: buildRomanReplacementRules(englishPhrases),
  };
}

export function getTransliterationLexicon(): TransliterationLexicon {
  if (!cachedLexicon) cachedLexicon = buildTransliterationLexicon();
  return cachedLexicon;
}

export function invalidateTransliterationLexicon(): void {
  cachedLexicon = null;
}

/** Call once in the browser so CRM edits refresh name/phrase rules. */
export function attachTransliterationLexiconListeners(): void {
  if (typeof window === 'undefined' || listenersAttached) return;
  listenersAttached = true;
  window.addEventListener(CUSTOMERS_UPDATED_EVENT, invalidateTransliterationLexicon);
}

function applyReplacements(text: string, rules: [RegExp, string][]): string {
  let out = text;
  for (const [re, repl] of rules) {
    out = out.replace(re, repl);
  }
  return out;
}

export function normalizeWithLexicon(raw: string, lexicon: TransliterationLexicon): string {
  let text = raw.trim();
  if (!text) return '';

  if (HAS_DEVANAGARI.test(text)) {
    text = applyReplacements(text, lexicon.devanagariReplacements);
    text = devanagariToLatin(text);
    text = text.replace(/[\u0900-\u097F]+/gu, ' ');
  }

  text = applyReplacements(text, lexicon.romanReplacements);
  return text.replace(/\s+/g, ' ').trim();
}
