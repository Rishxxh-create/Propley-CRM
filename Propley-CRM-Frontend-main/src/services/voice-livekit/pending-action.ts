import { presentations as readPresentations, customers as readCustomers } from './crm-source';
import { updateCustomer } from '@/lib/customers-store';
import { rescheduleMeeting, cancelSchedule } from '@/lib/api/schedule';
import { fuzzyNameScore } from '@/lib/phonetic-name-match';
import { COMMAND_REGISTRY } from '@/services/commands/command-registry';
import type { CommandArgs } from '@/types/voice-agent';
import type { StoredMeeting, DealStage } from '@/lib/mock-data';

export type PendingKind = 'reschedule' | 'cancel' | 'deal_stage' | 'schedule' | 'add_client';

export interface PendingAction {
  kind: PendingKind;
  summary: string;
  run: () => Promise<string>;
}

let pending: PendingAction | null = null;

export function getPendingAction(): PendingAction | null {
  return pending;
}

export function clearPendingAction(): void {
  pending = null;
}

export const DEAL_STAGE_VALUES: DealStage[] = [
  'inquiry',
  'vsv_scheduled',
  'vsv_done',
  'offer',
  'negotiation',
  'closed_won',
  'closed_lost',
];

function normalizeStage(raw: string): DealStage | null {
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const direct = DEAL_STAGE_VALUES.find((s) => s === key);
  if (direct) return direct;
  if (key.includes('won')) return 'closed_won';
  if (key.includes('lost')) return 'closed_lost';
  if (key.includes('negotiat')) return 'negotiation';
  if (key.includes('offer')) return 'offer';
  if (key.includes('inquiry') || key.includes('enquiry')) return 'inquiry';
  if (key.includes('scheduled')) return 'vsv_scheduled';
  if (key.includes('done') || key.includes('visited')) return 'vsv_done';
  return null;
}

export function findPresentationsForClient(clientName: string): StoredMeeting[] {
  return readPresentations()
    .filter((m) => m.status !== 'Canceled')
    .map((m) => ({ m, score: fuzzyNameScore(m.client ?? '', clientName) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ m }) => m);
}

function meetingLabel(m: StoredMeeting): string {
  return `${m.client}'s ${m.property} presentation on ${m.date} at ${m.time}`;
}

function scheduleId(m: StoredMeeting): string | null {
  return m.id ?? null;
}

export interface StageResult {
  staged?: true;
  needsConfirmation?: true;
  summary?: string;
  error?: string;
  ambiguous?: true;
  candidates?: string[];

  note?: string;
}

export function stageCancel(clientName: string, date?: string): StageResult {
  const matches = findPresentationsForClient(clientName);
  if (matches.length === 0) return { error: `No upcoming presentation found for ${clientName}.` };

  const narrowed = date
    ? matches.filter((m) => m.date?.toLowerCase().includes(date.toLowerCase()))
    : matches;
  const targets = narrowed.length > 0 ? narrowed : matches;

  if (targets.length > 1) {
    return { ambiguous: true, candidates: targets.slice(0, 4).map(meetingLabel) };
  }

  const meeting = targets[0];
  const id = scheduleId(meeting);
  if (!id) return { error: 'That presentation cannot be cancelled from here.' };

  const summary = `Cancel ${meetingLabel(meeting)}?`;
  pending = {
    kind: 'cancel',
    summary,
    run: async () => {
      await cancelSchedule(id);
      return `Cancelled ${meetingLabel(meeting)}.`;
    },
  };
  return { staged: true, needsConfirmation: true, summary };
}

export function stageReschedule(clientName: string, startTime: string): StageResult {
  const matches = findPresentationsForClient(clientName);
  if (matches.length === 0) return { error: `No upcoming presentation found for ${clientName}.` };
  if (matches.length > 1) {
    return { ambiguous: true, candidates: matches.slice(0, 4).map(meetingLabel) };
  }

  const meeting = matches[0];
  const id = scheduleId(meeting);
  if (!id) return { error: 'That presentation cannot be rescheduled from here.' };

  const when = new Date(startTime);
  if (Number.isNaN(when.getTime())) {
    return { error: 'I could not understand that date and time.' };
  }

  const summary = `Move ${meetingLabel(meeting)} to ${when.toLocaleString()}?`;
  pending = {
    kind: 'reschedule',
    summary,
    run: async () => {
      await rescheduleMeeting(id, { start_time: when.toISOString() });
      return `Moved ${meeting.client}'s presentation to ${when.toLocaleString()}.`;
    },
  };
  return { staged: true, needsConfirmation: true, summary };
}

export function stageDealStage(clientName: string, stage: string): StageResult {
  const target = normalizeStage(stage);
  if (!target) return { error: `${stage} is not a deal stage I recognise.` };

  const matches = readCustomers()
    .map((c) => ({ c, score: fuzzyNameScore(c.name, clientName) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ c }) => c);

  if (matches.length === 0) return { error: `No client found matching ${clientName}.` };
  if (matches.length > 1) {
    return { ambiguous: true, candidates: matches.slice(0, 4).map((c) => c.name) };
  }

  const client = matches[0];
  const summary = `Move ${client.name} to ${target.replace(/_/g, ' ')}?`;
  pending = {
    kind: 'deal_stage',
    summary,
    run: async () => {
      await updateCustomer(client.id, { dealStage: target });
      return `${client.name} is now at ${target.replace(/_/g, ' ')}.`;
    },
  };
  return { staged: true, needsConfirmation: true, summary };
}

const VAGUE = /^(now|asap|soon|later|sometime|whenever|anytime|tbd|unknown|n\/a)$/i;

export function stageSchedule(args: {
  client: string;
  project: string;
  date: string;
  time: string;
  phone?: string;
  email?: string;
}): StageResult {
  const client = args.client?.trim();
  const project = args.project?.trim();
  const date = args.date?.trim();
  const time = args.time?.trim();

  const missing = [
    !client && 'the client',
    !project && 'the project',
    (!date || VAGUE.test(date)) && 'the date',
    (!time || VAGUE.test(time)) && 'the time',
  ].filter(Boolean);
  if (missing.length > 0) {
    return {
      error: `Still need ${missing.join(', ')}. ASK the advisor — do not fill it in yourself, and never pass "now" or "today" unless they said so.`,
    };
  }

  const known = readCustomers()
    .map((c) => ({ c, score: fuzzyNameScore(c.name, client) }))
    .filter(({ score }) => score >= 70)
    .sort((a, b) => b.score - a.score)[0]?.c;

  if (!known) {
    const near = readCustomers()
      .map((c) => ({ c, score: fuzzyNameScore(c.name, client) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ c }) => c.name);

    const candidates = (near.length > 0 ? near : readCustomers().map((c) => c.name)).slice(0, 5);

    return {
      error: `No client called ${client}. You misheard the name.`,
      candidates,
      note: 'Read these names out and ask which one they meant. Do NOT ask them to spell it.',
    };
  }

  const filled: CommandArgs = {
    client: known.name,
    ...(known.id ? { clientId: known.id } : {}),
    project,
    date,
    time,
    phone: args.phone?.trim() || known?.phone || '',
    email: args.email?.trim() || known?.email || '',
  };

  const summary = `Schedule ${known.name} for ${project} on ${date} at ${time}?`;
  pending = {
    kind: 'schedule',
    summary,
    run: async () => {
      await COMMAND_REGISTRY['schedule-presentation'].execute(filled);
      return `Booked ${known.name} for ${project} on ${date} at ${time}.`;
    },
  };
  return { staged: true, needsConfirmation: true, summary };
}

export function stageAddClient(args: {
  name: string;
  phone?: string;
  email?: string;
  city?: string;
}): StageResult {
  const name = args.name?.trim();
  if (!name) return { error: 'Still need the client\'s name. Ask for it — do not guess.' };

  const existing = readCustomers()
    .map((c) => ({ c, score: fuzzyNameScore(c.name, name) }))
    .filter(({ score }) => score >= 80)
    .sort((a, b) => b.score - a.score)[0]?.c;

  const filled: CommandArgs = {
    name,

    ...(args.phone?.trim() ? { phone: args.phone.trim() } : {}),
    ...(args.email?.trim() ? { email: args.email.trim() } : {}),
    ...(args.city?.trim() ? { city: args.city.trim() } : {}),
    ...(existing?.id ? { existingId: existing.id } : {}),
  };

  const summary = existing
    ? `Update ${existing.name}'s profile?`
    : `Add ${name} to your clients?`;

  const thin = !args.phone?.trim() && !args.email?.trim();

  pending = {
    kind: 'add_client',
    summary,
    run: async () => {
      await COMMAND_REGISTRY['add-customer'].execute(filled);
      if (existing) return `Updated ${existing.name}.`;

      return thin
        ? `${name} is in your portfolio. No contact details on them yet — worth adding when you have them.`
        : `${name} is in your portfolio.`;
    },
  };
  return { staged: true, needsConfirmation: true, summary };
}

export async function resolvePendingAction(confirm: boolean): Promise<unknown> {
  const action = pending;
  pending = null;

  if (!action) return { error: 'There is nothing waiting for confirmation.' };
  if (!confirm) return { ok: true, cancelled: true, message: 'Okay, I have not changed anything.' };

  try {
    const message = await action.run();
    return { ok: true, message };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'That change did not go through.' };
  }
}
