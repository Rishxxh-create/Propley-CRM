import type { Customer, StoredMeeting } from '@/lib/mock-data';
import { getAdvisorName } from '@/lib/mock-data';
import {
  findCustomersByNameQuery,
  getCustomerByIdFromStore,
  readCustomers,
} from '@/lib/customers-store';
import { readClientNotes } from '@/lib/client-notes';
import { getTimelineEvents } from '@/lib/client-timeline';
import { getPresentationsForCustomer } from '@/lib/presentations-store';
import { stripVoiceFillers } from '@/lib/voice-text';
import { normalizeUtteranceForIntent } from '@/lib/voice-transliterate';
import type { IntentEngine } from '@/types/voice-agent';

export type ClientLookupResult =
  | { type: 'not_found'; query: string }
  | { type: 'single'; customer: Customer }
  | { type: 'disambiguate'; query: string; customers: Customer[] };

const DEAL_STAGE_LABEL: Record<string, string> = {
  inquiry: 'Inquiry',
  tour: 'Tour',
  offer: 'Offer',
  closed: 'Closed',
};

function cleanClientInfoName(fragment: string): string | null {
  const name = fragment
    .trim()
    .replace(/\b(?:please|thanks|thank you)\s*$/i, '')
    .trim();
  if (name.length < 2) return null;
  if (/\b(?:presentations?|meetings?|dashboard|calendar|customers? list)\b/i.test(name)) {
    return null;
  }
  return name;
}

/** Extract client name from informational questions (not "open client"). */
export function extractClientInfoQueryName(raw: string): string | null {
  const phrase = normalizeUtteranceForIntent(raw);
  const patterns = [
    /\btell me (?:something|anything) about\s+(.+?)\s*$/i,
    /\b(?:give me|tell me) (?:something|anything) about\s+(.+?)\s*$/i,
    /\b(?:mujhe|muje)\s+(.+?)\s+ke\s+(?:baare|bare)\s+mein\s+(?:batao|bata|bataye|bataiye)\s*$/i,
    /\b(.+?)\s+ke\s+(?:baare|bare)\s+mein\s+(?:batao|bata|bataye|bataiye)\s*$/i,
    /\b(?:batao|bata|bataye|bataiye)\s+(?:mujhe\s+)?(?:about\s+)?(.+?)\s*$/i,
    /\b(?:give me |tell me )?(?:more )?information about\s+(.+?)\s*$/i,
    /\b(?:give me |tell me )?(?:more )?info(?:rmation)? (?:about|on|for)\s+(.+?)\s*$/i,
    /\b(?:give me |tell me )?(?:more )?info(?:rmation)? on\s+(.+?)\s*$/i,
    /\bgive me more\s+(.+?)\s*$/i,
    /\b(?:give me|tell me) more\s+(?:info(?:rmation)?\s+)?(?:about\s+)?(.+?)\s*$/i,
    /\btell me\s+info\s+(.+?)\s*$/i,
    /\binfo(?:rmation)?\s+(?:about|on|for)\s+(.+?)\s*$/i,
    /\bmore\s+(?:info(?:rmation)?|details?)\s+(?:about|on|for)\s+(.+?)\s*$/i,
    /\btell me about\s+(?:client|customer)\s+(.+?)\s*$/i,
    /\btell me about\s+(.+?)\s*$/i,
    /\bwhat do we know about\s+(.+?)\s*$/i,
    /\bwho is\s+(?:client|customer)\s+(.+?)\s*$/i,
    /\bwho is\s+(.+?)\s*$/i,
    /\b(?:full )?details (?:for|on|about)\s+(?:client|customer)\s+(.+?)\s*$/i,
    /\b(?:full )?details (?:for|on|about)\s+(.+?)\s*$/i,
    /\b(?:client|customer) (?:named|called)\s+(.+?)\s*$/i,
    /\b(?:look up|lookup)\s+(?:client|customer)\s+(.+?)\s*$/i,
  ];

  for (const re of patterns) {
    const m = phrase.match(re);
    if (m?.[1]) {
      const name = cleanClientInfoName(m[1]);
      if (name) return name;
    }
  }
  return null;
}

/** Resolve client name from phrasing or by matching names embedded in the utterance. */
export function extractClientTargetFromUtterance(raw: string): string | null {
  const fromPhrase = extractClientInfoQueryName(raw);
  if (fromPhrase && fromPhrase.toLowerCase() !== 'something' && fromPhrase.toLowerCase() !== 'anything') {
    return fromPhrase;
  }

  const phrase = normalizeUtteranceForIntent(raw).toLowerCase();
  if (
    !/\b(?:tell me|give me|who is|batao|bata|bataye|baare|bare|info|about|something about|anything about)\b/.test(
      phrase
    )
  ) {
    return null;
  }

  const customers = typeof window !== 'undefined' ? readCustomers() : [];
  for (const c of customers) {
    const full = c.name.trim().toLowerCase();
    if (full.length > 2 && phrase.includes(full)) {
      return c.name;
    }
  }
  for (const c of customers) {
    const first = c.name.split(/\s+/)[0]?.toLowerCase();
    if (first && first.length > 2 && phrase.includes(first)) {
      return first.charAt(0).toUpperCase() + first.slice(1);
    }
  }

  return fromPhrase && fromPhrase.toLowerCase() !== 'something' ? fromPhrase : null;
}

/** True when the utterance asks for CRM facts, not navigation-only. */
export function isClientInfoUtterance(raw: string): boolean {
  if (extractClientTargetFromUtterance(raw)) return true;
  const phrase = normalizeUtteranceForIntent(raw).toLowerCase();
  return (
    /\b(?:give me more|tell me info|tell me something|more info|more details|info on|information on|what do we know)\b/.test(
      phrase
    ) ||
    /\b(?:tell me|give me)\s+(?:the\s+)?info\b/.test(phrase) ||
    /\bwho is\b/.test(phrase) ||
    /\bke\s+(?:baare|bare)\s+mein\b/.test(phrase) ||
    /\b(?:batao|bataye)\b/.test(phrase)
  );
}

export function resolveClientLookup(query: string): ClientLookupResult {
  const trimmed = query.trim();
  const matches = findCustomersByNameQuery(trimmed);

  if (matches.length === 0) {
    return { type: 'not_found', query: trimmed };
  }
  if (matches.length === 1) {
    return { type: 'single', customer: matches[0] };
  }

  const exact = matches.filter((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase());
  if (exact.length === 1) {
    return { type: 'single', customer: exact[0] };
  }

  return { type: 'disambiguate', query: trimmed, customers: matches };
}

export function formatDisambiguationPrompt(query: string, customers: Customer[]): string {
  const lines = customers.map((c, i) => {
    const advisor = getAdvisorName(c.assignedAdvisorId);
    return `${i + 1}. **${c.name}** — ${c.city} · ${c.email} · Advisor: ${advisor}`;
  });
  return (
    `I found ${customers.length} clients in your data matching "${query}":\n\n` +
    `${lines.join('\n')}\n\n` +
    `Which one do you mean? Tap a client below, or say the full name (for example "${customers[0].name}").`
  );
}

export interface ClientBriefCrmPayload {
  customer: Customer;
  advisorName: string;
  dealStageLabel: string;
  presentations: StoredMeeting[];
  notes: ReturnType<typeof readClientNotes>;
  timeline: ReturnType<typeof getTimelineEvents>;
}

export interface ClientBriefPayload {
  userQuestion: string;
  crm: ClientBriefCrmPayload;
}

export function buildClientBriefPayload(
  customer: Customer,
  userQuestion: string,
  presentationsOverride?: StoredMeeting[]
): ClientBriefPayload {
  const presentations =
    presentationsOverride ?? getPresentationsForCustomer(customer);
  const notes = readClientNotes(customer.id);
  const timeline = getTimelineEvents(customer);

  return {
    userQuestion: userQuestion.trim() || `Tell me about ${customer.name}`,
    crm: {
      customer,
      advisorName: getAdvisorName(customer.assignedAdvisorId),
      dealStageLabel:
        DEAL_STAGE_LABEL[customer.dealStage ?? 'inquiry'] ?? customer.dealStage ?? '—',
      presentations,
      notes,
      timeline,
    },
  };
}

export function formatClientDetailsMessage(
  customer: Customer,
  presentationsOverride?: StoredMeeting[]
): string {
  const advisor = getAdvisorName(customer.assignedAdvisorId);
  const stage = DEAL_STAGE_LABEL[customer.dealStage ?? 'inquiry'] ?? customer.dealStage ?? '—';
  const presentations = presentationsOverride ?? getPresentationsForCustomer(customer);
  const notes = readClientNotes(customer.id);

  const presentationLines =
    presentations.length === 0
      ? '— No presentations on file yet.'
      : presentations
          .slice(0, 5)
          .map((m) => `• ${m.property} — ${m.status} — ${m.date} ${m.time}`)
          .join('\n');

  const more =
    presentations.length > 5
      ? `\n… and ${presentations.length - 5} more in the registry.`
      : '';

  return (
    `**${customer.name}**\n` +
    `Email: ${customer.email}\n` +
    `Phone: ${customer.phone}\n` +
    `City: ${customer.city}\n` +
    `Status: ${customer.status}\n` +
    `Pipeline: ${stage}\n` +
    `Lead source: ${customer.leadSource ?? '—'}\n` +
    `Assigned advisor: ${advisor}\n` +
    `Last presentation: ${customer.lastMeeting}\n\n` +
    `**Presentations**\n${presentationLines}${more}\n\n` +
    (notes.length > 0
      ? `**Advisor notes**\n${notes
          .slice(0, 3)
          .map((n) => `• ${n.body.slice(0, 120)}${n.body.length > 120 ? '…' : ''} — ${n.author}`)
          .join('\n')}\n\n`
      : '') +
    `Opening their profile in the CRM.`
  );
}

export interface GetClientDetailsOptions {
  userQuestion?: string;
  geminiApiKey?: string | null;
  intentEngine?: IntentEngine;
}

/** Rich client brief via Gemini when enabled; falls back to structured template. */
export async function getClientDetailsMessage(
  customer: Customer,
  options: GetClientDetailsOptions = {}
): Promise<{ message: string; source: 'gemini' | 'fallback' }> {
  const presentations = getPresentationsForCustomer(customer);
  const userQuestion = options.userQuestion?.trim() || `Tell me about ${customer.name}`;
  const useGemini = options.intentEngine !== 'rules';

  if (!useGemini) {
    return {
      message: formatClientDetailsMessage(customer, presentations),
      source: 'fallback',
    };
  }

  try {
    const res = await fetch('/api/voice/client-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userQuestion,
        customer,
        presentations,
        geminiApiKey: options.geminiApiKey ?? undefined,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { brief?: string; source?: string };
      if (data.brief?.trim()) {
        return {
          message: data.brief.trim(),
          source: data.source === 'gemini' ? 'gemini' : 'fallback',
        };
      }
    }
  } catch (err) {
    console.warn('[client-voice-lookup] Gemini brief failed, using template', err);
  }

  return {
    message: formatClientDetailsMessage(customer, presentations),
    source: 'fallback',
  };
}

const ORDINALS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  '1': 1,
  '2': 2,
  '3': 3,
  one: 1,
  two: 2,
  three: 3,
};

/** Resolve which candidate the user picked after disambiguation. */
export function resolveClientPickFromUtterance(
  utterance: string,
  candidates: Customer[]
): Customer | undefined {
  if (candidates.length === 0) return undefined;
  const raw = stripVoiceFillers(utterance).trim();
  const norm = raw.toLowerCase();

  if (!norm) return undefined;

  const exact = candidates.find((c) => c.name.trim().toLowerCase() === norm);
  if (exact) return exact;

  const partialMatches = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(norm) ||
      norm.includes(c.name.toLowerCase()) ||
      norm.split(/\s+/).every((tok) => tok.length > 1 && c.name.toLowerCase().includes(tok))
  );
  if (partialMatches.length === 1) return partialMatches[0];

  const ordinalWord = norm.match(/\b(first|second|third|one|two|three|\d)\b/);
  if (ordinalWord) {
    const idx = ORDINALS[ordinalWord[1]] ?? parseInt(ordinalWord[1], 10);
    if (idx >= 1 && idx <= candidates.length) {
      return candidates[idx - 1];
    }
  }

  const lastName = norm.split(/\s+/).pop();
  if (lastName && lastName.length > 2) {
    const byLast = candidates.filter((c) => c.name.toLowerCase().endsWith(lastName));
    if (byLast.length === 1) return byLast[0];
  }

  return undefined;
}

export function getCustomersByIds(ids: string[]): Customer[] {
  return ids
    .map((id) => getCustomerByIdFromStore(id))
    .filter((c): c is Customer => Boolean(c));
}
