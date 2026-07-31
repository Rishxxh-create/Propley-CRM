import { getToolSpec } from '@/services/ai-engine/agent-tools';
import { runReadTool } from '@/services/ai-engine/agent-read-tools';
import { COMMAND_REGISTRY, resolveCanonicalRoute } from '@/services/commands/command-registry';
import { describeDestination } from '@/services/voice-livekit/page-brief';
import { settledPresentations } from '@/services/voice-livekit/crm-source';
import {
  stageCancel,
  stageReschedule,
  stageDealStage,
  stageSchedule,
  stageAddClient,
  resolvePendingAction,
} from '@/services/voice-livekit/pending-action';
import { readCustomers } from '@/lib/customers-store';
import { createClientNote } from '@/lib/api/client-notes';
import { fuzzyNameScore } from '@/lib/phonetic-name-match';
import { getCurrentAdvisorName } from '@/lib/current-advisor';
import type { CommandArgs } from '@/types/voice-agent';

async function runAddClientNote(clientName: string, note: string): Promise<unknown> {
  if (!note.trim()) return { error: 'There was no note text to save.' };

  const matches = readCustomers()
    .map((c) => ({ c, score: fuzzyNameScore(c.name, clientName) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  if (matches.length === 0) return { error: `No client found matching ${clientName}.` };
  if (matches.length > 1) {
    return { ambiguous: true, candidates: matches.slice(0, 4).map(({ c }) => c.name) };
  }

  const client = matches[0].c;
  try {
    await createClientNote(client.id, note.trim(), getCurrentAdvisorName());
    return { ok: true, message: `Saved a note on ${client.name}.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'The note did not save.' };
  }
}

export function toCommandArgs(args: Record<string, unknown>): CommandArgs {
  const out: CommandArgs = {};
  for (const [key, value] of Object.entries(args)) {
    if (value === null || value === undefined) continue;
    out[key] = typeof value === 'boolean' || typeof value === 'number' ? value : String(value);
  }
  return out;
}

function findScrollContainer(): HTMLElement | Window {
  const main = document.querySelector('main');
  if (main && main.scrollHeight > main.clientHeight + 8) return main as HTMLElement;

  const candidates = Array.from(document.querySelectorAll<HTMLElement>('div, section'));
  const scrollable = candidates.find((el) => {
    if (el.scrollHeight <= el.clientHeight + 8) return false;
    const overflow = getComputedStyle(el).overflowY;
    return overflow === 'auto' || overflow === 'scroll';
  });

  return scrollable ?? window;
}

async function runNavigate(args: Record<string, unknown>): Promise<unknown> {
  const command = COMMAND_REGISTRY['navigate'];
  if (!command) return { error: 'navigate command unavailable' };

  const raw = String(args.path ?? args.route ?? args.url ?? '').trim();
  if (!raw) return { error: 'no destination given' };

  const path = resolveCanonicalRoute(raw);
  await command.execute(toCommandArgs(args));

  const brief = await describeDestination(path);
  return { ok: true, landedOn: brief.page, path, showing: brief.facts };
}

async function runFilterMeetings(args: Record<string, unknown>): Promise<unknown> {
  const command = COMMAND_REGISTRY['filter-meetings'];
  if (!command) return { error: 'filter command unavailable' };

  await command.execute(toCommandArgs(args));

  const rows = await settledPresentations();
  if (!rows) return { ok: true, pending: true, note: 'Say nothing about the list at all.' };

  const status = String(args.status ?? '').trim();
  const advisor = String(args.advisor ?? '').trim();
  const project = String(args.project ?? '').trim();

  const matched = rows.filter((m) => {
    if (status && status.toLowerCase() !== 'all' && (m.status ?? '').toLowerCase() !== status.toLowerCase())
      return false;
    if (advisor && !(m.salesMember ?? '').toLowerCase().includes(advisor.toLowerCase())) return false;
    if (project && !(m.property ?? '').toLowerCase().includes(project.toLowerCase())) return false;
    return true;
  });

  return {
    ok: true,
    matched: matched.length,
    showing: matched.slice(0, 6).map((m) => ({
      client: m.client,
      advisor: m.salesMember,
      project: m.property,
      date: m.date,
      time: m.time,
      status: m.status,
    })),
  };
}

function runScroll(args: Record<string, unknown>): unknown {
  if (typeof window === 'undefined') return { error: 'no window' };

  const direction = String(args.direction ?? 'down');
  const amount = String(args.amount ?? 'page');
  const target = findScrollContainer();

  const viewport =
    target instanceof Window ? window.innerHeight : (target as HTMLElement).clientHeight;
  const step = amount === 'little' ? Math.round(viewport * 0.35) : Math.round(viewport * 0.85);

  const scrollTo = (top: number) =>
    target instanceof Window
      ? window.scrollTo({ top, behavior: 'smooth' })
      : (target as HTMLElement).scrollTo({ top, behavior: 'smooth' });

  const scrollBy = (top: number) =>
    target instanceof Window
      ? window.scrollBy({ top, behavior: 'smooth' })
      : (target as HTMLElement).scrollBy({ top, behavior: 'smooth' });

  switch (direction) {
    case 'top':
      scrollTo(0);
      break;
    case 'bottom':
      scrollTo(
        target instanceof Window
          ? document.body.scrollHeight
          : (target as HTMLElement).scrollHeight
      );
      break;
    case 'up':
      scrollBy(-step);
      break;
    default:
      scrollBy(step);
      break;
  }

  return {
    ok: true,
    scrolled: direction,
    note: 'their view moved. The records you can see are unchanged — scrolling never reveals more to you. To find a record, search list_meetings.',
  };
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const spec = getToolSpec(name);
  if (!spec) return { error: `unknown tool ${name}` };

  if (spec.kind === 'read') {
    return runReadTool(name, args);
  }

  if (spec.kind === 'action') {
    if (spec.commandId === 'navigate') return runNavigate(args);
    if (spec.commandId === 'scroll') return runScroll(args);
    if (spec.commandId === 'filter-meetings') return runFilterMeetings(args);

    if (spec.commandId === 'cancel-presentation') {
      return stageCancel(String(args.client ?? ''), args.date ? String(args.date) : undefined);
    }
    if (spec.commandId === 'reschedule-presentation') {
      return stageReschedule(String(args.client ?? ''), String(args.start_time ?? ''));
    }
    if (spec.commandId === 'set-deal-stage') {
      return stageDealStage(String(args.client ?? ''), String(args.stage ?? ''));
    }
    if (spec.commandId === 'schedule-presentation') {
      return stageSchedule({
        client: String(args.client ?? ''),
        project: String(args.project ?? ''),
        date: String(args.date ?? ''),
        time: String(args.time ?? ''),
      });
    }
    if (spec.commandId === 'add-customer') {
      return stageAddClient({
        name: String(args.name ?? args.client ?? ''),
        phone: args.phone ? String(args.phone) : undefined,
        email: args.email ? String(args.email) : undefined,
        city: args.city ? String(args.city) : undefined,
      });
    }
    if (spec.commandId === 'confirm-action') {
      return resolvePendingAction(args.confirm === true);
    }
    if (spec.commandId === 'add-client-note') {
      return runAddClientNote(String(args.client ?? ''), String(args.note ?? ''));
    }

    if (!spec.commandId) return { error: `tool ${name} has no commandId` };
    const command = COMMAND_REGISTRY[spec.commandId];
    if (!command) return { error: `unknown command ${spec.commandId}` };
    await command.execute(toCommandArgs(args));
    return { ok: true, executed: spec.commandId };
  }

  if (spec.kind === 'handoff' && spec.handoff === 'client-brief') {
    const command = COMMAND_REGISTRY['client-info'];
    if (!command) return { error: 'client-info command unavailable' };
    await command.execute(toCommandArgs(args));
    return { ok: true, executed: 'client-info' };
  }

  return { error: `unsupported tool kind for ${name}` };
}
