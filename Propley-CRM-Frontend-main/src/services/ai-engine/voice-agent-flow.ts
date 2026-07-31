import type { CommandArgs, SlotField } from '@/types/voice-agent';
import { addDays, nextMonday, startOfDay } from 'date-fns';
import { parseIndianDateString, formatStoredPresentationDate } from '@/lib/date-format';
import { formatSessionTime } from '@/lib/presentation-templates';
import {
  findCustomerByName,
  findCustomerByEmail,
  getCustomerByIdFromStore,
} from '@/lib/customers-store';
import { getLeadSourceLabel, resolveLeadSourceId } from '@/lib/lead-source-options';
import { DEVELOPMENTS } from '@/lib/mock-data';

const CONFIRM_RE =
  /^(yes|yeah|yep|ok|okay|okk|confirm|confirmed|proceed|go ahead|go-ahead|do it|sure|absolutely|sounds good|that's correct|that is correct|looks good)\b/i;

const CANCEL_RE =
  /^(no|nope|cancel|cancelled|canceled|stop|stopped|abort|exit|quit|nevermind|never mind|don't|do not|no thanks|leave it|forget it|skip it|drop it|drop this|skip this|leave this|forget this|nah)\b/i;

export function isConfirmation(text: string): boolean {
  return CONFIRM_RE.test(text.trim());
}

export function isCancellation(text: string): boolean {
  const norm = text.trim().toLowerCase();
  if (CANCEL_RE.test(norm)) return true;
  if (/\b(cancel|exit|quit|abort|stop)\b/.test(norm) && norm.split(/\s+/).length <= 4) {
    return true;
  }
  return false;
}

export function getScheduleMissingFields(args: CommandArgs): SlotField[] {
  const missing: SlotField[] = [];
  if (!argAsString(args.email)) {
    missing.push({
      name: 'email',
      prompt:
        "What's the client's email address? (e.g. rahul.verma@gmail.com)",
    });
  }
  if (!argAsString(args.phone)) {
    missing.push({
      name: 'phone',
      prompt: "What's the client's phone number? (at least 10 digits)",
    });
  }
  if (!argAsString(args.date)) {
    missing.push({
      name: 'date',
      prompt: 'What date should I schedule it for? (e.g. today, tomorrow, next Monday)',
    });
  }
  if (!argAsString(args.time)) {
    missing.push({
      name: 'time',
      prompt: 'What time should I set? (e.g. 10:00 AM, 2:30 PM)',
    });
  }
  return missing;
}

/** Reject generic phrases parsed as names (e.g. "a new customer" from "create a new customer"). */
export function isPlaceholderClientName(name: string): boolean {
  const norm = name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!norm) return true;
  if (
    /^(?:a\s+)?(?:new\s+)?(?:customer|client|lead|contact)s?$/.test(norm) ||
    /^(?:add|create|register|new)\s+/.test(norm)
  ) {
    return true;
  }
  const tokens = norm.split(' ');
  return tokens.every((t) =>
    ['a', 'an', 'the', 'new', 'customer', 'client', 'lead', 'contact', 'prospect'].includes(t)
  );
}

function argAsString(value: string | number | boolean | null | undefined): string {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

export function resolveAddCustomerName(args: CommandArgs): string {
  const raw = argAsString(args.name ?? args.client);
  return isPlaceholderClientName(raw) ? '' : raw;
}

export function getAddCustomerMissingFields(args: CommandArgs): SlotField[] {
  const missing: SlotField[] = [];
  const name = resolveAddCustomerName(args);

  if (!name) {
    missing.push({
      name: 'name',
      prompt: "What is the client's full name?",
    });
  }

  if (!argAsString(args.phone)) {
    missing.push({
      name: 'phone',
      prompt: 'What is their phone number?',
    });
  }
  if (!argAsString(args.email)) {
    missing.push({
      name: 'email',
      prompt: 'What is their email address?',
    });
  }
  // city and leadSource are optional — only asked if the user explicitly volunteers them
  // (e.g. via parseAddCustomerBundle). The slot-fill loop will not block waiting for them.
  return missing;
}

/** After name is captured, merge existing CRM record if found */
export function enrichAddCustomerArgsFromCrm(args: CommandArgs): CommandArgs {
  const name = resolveAddCustomerName(args);
  if (!name) return { ...args, name: '', client: '' };

  const existing = findCustomerByName(name);
  if (!existing) {
    return { ...args, name, client: name };
  }

  return {
    ...args,
    name: existing.name,
    client: existing.name,
    existingId: existing.id,
    phone: argAsString(args.phone) || existing.phone,
    email: argAsString(args.email) || existing.email,
    city: argAsString(args.city) || existing.city,
    leadSource: argAsString(args.leadSource) || existing.leadSource || '',
  };
}

const SPOKEN_DIGIT: Record<string, string> = {
  zero: '0',
  oh: '0',
  o: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
};

/** Parse spoken phone numbers like "eight two four… double four" → digits */
export function parseSpokenPhone(raw: string): string {
  const compactDigits = raw.replace(/\D/g, '');
  if (compactDigits.length >= 8) return compactDigits;

  const tokens = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const digits: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === 'double' && digits.length > 0) {
      digits.push(digits[digits.length - 1]);
      continue;
    }
    if (token === 'triple' && digits.length > 0) {
      const last = digits[digits.length - 1];
      digits.push(last, last);
      continue;
    }
    const mapped = SPOKEN_DIGIT[token];
    if (mapped !== undefined) {
      digits.push(mapped);
      continue;
    }
    if (/^\d+$/.test(token)) {
      digits.push(...token.split(''));
    }
  }

  return digits.join('');
}

export function normalizeSlotValue(fieldName: string, raw: string): string {
  const text = raw.trim();
  if (fieldName === 'name') return text;
  if (fieldName === 'leadSource') return resolveLeadSourceId(text) ?? text;
  if (fieldName === 'email') {
    const match = text.match(/[\w.+-]+@[\w.-]+\.\w+/);
    if (match) return match[0].toLowerCase();
    const domainOnly = text.match(/^(gmail|yahoo|outlook|hotmail|icloud)\.com$/i);
    if (domainOnly) return domainOnly[0].toLowerCase();
    return text;
  }
  if (fieldName === 'phone') {
    return parseSpokenPhone(text);
  }
  if (fieldName === 'city') {
    return text.replace(/\s+/g, ' ').trim();
  }
  return text;
}

export type SlotValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

/** Parse several add-client fields from one spoken line (name, phone, email). */
export function parseAddCustomerBundle(raw: string): Partial<
  Record<'name' | 'phone' | 'email' | 'city' | 'leadSource', string>
> {
  let work = raw.trim();
  const out: Partial<Record<'name' | 'phone' | 'email' | 'city' | 'leadSource', string>> = {};

  const emailMatch = work.match(/[\w.+-]+@[\w.-]+\.\w+/i);
  if (emailMatch) {
    out.email = emailMatch[0].toLowerCase();
    work = work.replace(emailMatch[0], ' ');
  }

  const phoneMatch =
    work.match(/\+\d{1,3}[\s-]?\d{6,12}\b/) ??
    work.match(/\b(?:\+?91[\s-]?)?[6-9]\d{9}\b/) ??
    work.match(/\b\d{10,12}\b/);

  if (phoneMatch) {
    const digits = parseSpokenPhone(phoneMatch[0]);
    if (digits.length >= 8) {
      const rawPhone = phoneMatch[0].trim();
      out.phone = rawPhone.startsWith('+') ? `+${digits}` : digits;
      work = work.replace(phoneMatch[0], ' ');
    }
  }

  work = work
    .replace(/[,;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (work.length >= 2 && !isPlaceholderClientName(work)) {
    out.name = work;
  }

  return out;
}

/** Merge a single utterance into slot args (multi-field when possible). */
export function applyUtteranceToSlotArgs(
  commandId: string,
  filledArgs: CommandArgs,
  text: string,
  missingFieldNames: string[]
): {
  args: CommandArgs;
  filledFields: string[];
  validationError: string | null;
} {
  let args = { ...filledArgs };
  const filledFields: string[] = [];
  let validationError: string | null = null;

  const bundle =
    commandId === 'add-customer'
      ? parseAddCustomerBundle(text)
      : commandId === 'schedule-presentation'
        ? parseSchedulePresentationBundle(text)
        : null;

  if (bundle) {
    for (const fieldName of missingFieldNames) {
      const raw = bundle[fieldName as keyof typeof bundle];
      if (!raw) continue;
      const validation = validateSlotInput(fieldName, raw);
      if (!validation.ok) {
        if (!validationError && fieldName === missingFieldNames[0]) {
          validationError = validation.message;
        }
        continue;
      }
      args = applySlotToArgs(commandId, args, fieldName, validation.value);
      filledFields.push(fieldName);
    }
  }

  if (filledFields.length === 0 && missingFieldNames[0]) {
    const fieldName = missingFieldNames[0];
    const validation = validateSlotInput(fieldName, text);
    if (!validation.ok) {
      return { args, filledFields, validationError: validation.message };
    }
    args = applySlotToArgs(commandId, args, fieldName, validation.value);
    filledFields.push(fieldName);
  }

  if (commandId === 'add-customer' && filledFields.includes('name')) {
    args = enrichAddCustomerArgsFromCrm(args);
  }

  return { args, filledFields, validationError };
}

/** Extract schedule fields from a combined phrase */
export function parseSchedulePresentationBundle(
  raw: string
): Partial<Record<'project' | 'client' | 'email' | 'date' | 'time', string>> {
  const norm = raw.toLowerCase();
  const out: Partial<Record<'project' | 'client' | 'email' | 'date' | 'time', string>> = {};

  // Email — pulled first so the regex doesn't get cannibalised by the "with X" rule.
  const emailMatch = raw.match(/[\w.+-]+@[\w.-]+\.\w+/i);
  if (emailMatch) {
    out.email = emailMatch[0].toLowerCase();
  }

  const timeMatch = norm.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3] ?? '';
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    out.time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  if (/\btoday\b/.test(norm)) out.date = 'today';
  else if (/\btomorrow\b/.test(norm)) out.date = 'tomorrow';
  else if (/\bnext\s+(?:week|monday)\b/.test(norm)) out.date = 'next-week';

  for (const dev of DEVELOPMENTS) {
    if (norm.includes(dev.name.toLowerCase())) {
      out.project = dev.name;
      break;
    }
  }

  const withClient = raw.match(
    /\bwith\s+(?:client\s+)?([a-z][a-z0-9\s]{2,}?)(?:\s+(?:at|on|for|tomorrow|today)\b|$)/i
  );
  if (withClient?.[1]) {
    out.client = withClient[1].trim();
  }

  return out;
}

export function validateSlotInput(fieldName: string, raw: string): SlotValidationResult {
  const value = normalizeSlotValue(fieldName, raw);

  if (fieldName === 'phone') {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10) {
      return {
        ok: false,
        message:
          'That number looks too short — it should be at least 10 digits. Please say the full phone number, e.g. "nine eight seven six five four three two one zero".',
      };
    }
    return { ok: true, value: digits };
  }

  if (fieldName === 'email') {
    if (!value.includes('@')) {
      if (/^(gmail|yahoo|outlook|hotmail|icloud)\.com$/i.test(value)) {
        return {
          ok: false,
          message:
            'Please say the complete email address, for example rahul@gmail.com — not just the provider name.',
        };
      }
      return {
        ok: false,
        message: 'Please say a complete email with @, for example rahul.verma@gmail.com',
      };
    }
    return { ok: true, value: value };
  }

  if (fieldName === 'city') {
    if (/^(gmail|yahoo|outlook|hotmail)\.com$/i.test(value)) {
      return {
        ok: false,
        message: 'That sounds like an email domain. Which city is the client based in?',
      };
    }
    if (value.length < 2) {
      return { ok: false, message: 'Which city are they based in? For example Mumbai or Bengaluru.' };
    }
    return { ok: true, value: value };
  }

  if (fieldName === 'name' && value.length < 2) {
    return { ok: false, message: "What is the client's full name?" };
  }

  return { ok: true, value };
}

export function applySlotToArgs(
  commandId: string,
  args: CommandArgs,
  fieldName: string,
  value: string
): CommandArgs {
  const normalized = normalizeSlotValue(fieldName, value);
  const next: CommandArgs = { ...args, [fieldName]: normalized };

  if (fieldName === 'name') {
    next.name = normalized;
    next.client = normalized;
    if (commandId === 'add-customer') {
      return enrichAddCustomerArgsFromCrm(next);
    }
  }

  if (fieldName === 'client' && commandId === 'schedule-presentation') {
    next.client = normalized;
  }

  // Email is the canonical identifier for schedule-presentation.
  // When email lands, look the customer up in the CRM and autofill the rest.
  if (fieldName === 'email' && commandId === 'schedule-presentation') {
    next.email = normalized;
    const match = findCustomerByEmail(normalized);
    if (match) {
      next.existingId = match.id;
      next.client = match.name;
      next.name = match.name;
      if (match.phone && !argAsString(next.phone)) next.phone = match.phone;
      if (match.city && !argAsString(next.city)) next.city = match.city;
    }
  }

  return next;
}

export function resolveScheduleDate(input?: string): Date {
  const norm = (input ?? '').toLowerCase().trim();
  const today = startOfDay(new Date());
  if (!norm || norm === 'today') return today;
  if (norm === 'tomorrow') return addDays(today, 1);
  if (norm.includes('next') && norm.includes('monday')) return nextMonday(today);
  const parsed = parseIndianDateString(norm);
  if (parsed) return startOfDay(parsed);
  return addDays(today, 1);
}

export function resolveClientName(args: CommandArgs): { name: string; id?: string } {
  // Email is the primary identifier — try it first.
  const email = argAsString(args.email);
  if (email) {
    const byEmail = findCustomerByEmail(email);
    if (byEmail) return { name: byEmail.name, id: byEmail.id };
  }
  if (args.existingId) {
    const byId = getCustomerByIdFromStore(String(args.existingId));
    if (byId) return { name: byId.name, id: byId.id };
  }
  // Final fallback: any name we have on the args (prospect with no email match yet).
  const query = argAsString(args.client ?? args.name);
  if (!query) return { name: email ? 'New Prospect' : 'Prospect Client' };
  return { name: query };
}

export const DEFAULT_PROJECT = 'Mandake';

export function resolveProjectName(input?: string | number | boolean | null): string {
  const norm = argAsString(input ?? undefined);
  if (!norm) return DEFAULT_PROJECT;
  const match = DEVELOPMENTS.find(
    (d) =>
      d.name.toLowerCase().includes(norm.toLowerCase()) ||
      norm.toLowerCase().includes(d.name.toLowerCase())
  );
  return match?.name ?? norm;
}

export function buildSchedulePreview(args: CommandArgs): string {
  const project = resolveProjectName(args.project);
  const { name: client } = resolveClientName(args);
  const date = formatStoredPresentationDate(resolveScheduleDate(argAsString(args.date)));
  const time = formatSessionTime(argAsString(args.time) || '10:00');
  const phone = argAsString(args.phone);
  return [
    'Preview — schedule presentation',
    `Development: ${project}`,
    `Client: ${client}`,
    phone ? `Phone: ${phone}` : null,
    `Date: ${date}`,
    `Time: ${time}`,
    '',
    'Say "confirmed" or "ok" to save, or "cancel" / "exit" to discard.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildAddCustomerPreview(args: CommandArgs): string {
  const name = resolveAddCustomerName(args) || 'New client';
  const existing =
    (args.existingId && getCustomerByIdFromStore(String(args.existingId))) ||
    findCustomerByName(name);
  const lead = getLeadSourceLabel(argAsString(args.leadSource)) || '—';
  const mode = existing ? 'Update existing client' : 'Add new client to CRM';

  return [
    `Preview — ${mode}`,
    existing ? `Matched record: ${existing.name} (${existing.id})` : null,
    `Name: ${name}`,
    `Phone: ${args.phone ?? '—'}`,
    `Email: ${args.email ?? '—'}`,
    `City: ${args.city ?? '—'}`,
    `Lead source: ${lead}`,
    '',
    'Say "confirmed" or "ok" to save, or "cancel" / "exit" to discard.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildPreviewForCommand(commandId: string, args: CommandArgs): string {
  if (commandId === 'add-customer') return buildAddCustomerPreview(args);
  return buildSchedulePreview(args);
}
