/**
 * Normalize Hindi / Hinglish / Devanagari voice or typed input to English
 * for rules + Gemini intent parsing (CRM commands stay English).
 */

import { stripVoiceFillers } from '@/lib/voice-text';
import {
  attachTransliterationLexiconListeners,
  getTransliterationLexicon,
  HAS_DEVANAGARI,
  invalidateTransliterationLexicon,
  normalizeWithLexicon,
} from '@/lib/voice-transliteration-lexicon';

attachTransliterationLexiconListeners();

/**
 * Convert user utterance to English-oriented text for intent matching.
 * Rules are rebuilt from CRM + command catalog (see voice-transliteration-lexicon.ts).
 */
export function normalizeUtteranceForIntent(raw: string): string {
  const lexicon = getTransliterationLexicon();
  const text = normalizeWithLexicon(raw, lexicon);
  if (!text) return '';
  return stripVoiceFillers(text).replace(/\s+/g, ' ').trim();
}

export function hasNonEnglishScript(text: string): boolean {
  return HAS_DEVANAGARI.test(text);
}

export { invalidateTransliterationLexicon as invalidateVoiceTransliterationCache };
