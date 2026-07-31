import {
  presentations as readPresentations,
  customers as readCustomers,
  presentationsSettled,
} from './crm-source';
import { useVoiceAgentStore } from '@/store/voice-agent-store';
import { getCurrentAdvisorName } from '@/lib/current-advisor';
import { getActiveStore } from '@/store';

const MAX_LISTED = 8;

const PAGE_NAMES: Array<[RegExp, string]> = [
  [/^\/$/, 'Dashboard'],
  [/^\/meetings\/calendar/, 'Presentations calendar'],
  [/^\/meetings\/new/, 'Schedule a presentation'],
  [/^\/meetings\/[^/]+\/post-analysis/, 'Post-meeting analysis'],
  [/^\/meetings\/[^/]+\/resend/, 'Resend invitation'],
  [/^\/meetings/, 'Presentations list'],
  [/^\/customers\/[^/]+/, 'Client profile'],
  [/^\/customers/, 'Clients list'],
  [/^\/pipeline/, 'Pipeline'],
  [/^\/admin\/team/, 'Team members'],
  [/^\/admin\/roles/, 'Role policies'],
  [/^\/admin\/permissions/, 'Permission matrix'],
  [/^\/settings\/templates/, 'Invite templates'],
  [/^\/reports\/(\w+)/, 'Reports'],
];

function pageName(path: string): string {
  for (const [pattern, name] of PAGE_NAMES) {
    if (pattern.test(path)) return name;
  }
  return 'Propley';
}

function openClientId(path: string): string | null {
  const match = /^\/customers\/([^/]+)/.exec(path);
  return match ? match[1] : null;
}

export interface PageContext {
  path: string;
  page: string;
  onScreen: string[];
  wizard: string | null;
  advisor: string | null;
}

export function getPageContext(): PageContext {
  if (typeof window === 'undefined') {
    return { path: '/', page: 'Propley', onScreen: [], wizard: null, advisor: null };
  }

  const path = window.location.pathname;
  const onScreen: string[] = [];

  const clientId = openClientId(path);
  if (clientId) {
    const client = readCustomers().find((c) => c.id === clientId);
    if (client) {
      onScreen.push(
        `Open client: ${client.name} (stage ${client.dealStage ?? 'unknown'}, ${client.city}, ${client.status})`
      );
    }
  }

  if (/^\/customers\/?$/.test(path)) {
    const rows = readCustomers()
      .slice(0, MAX_LISTED)
      .map(
        (c, i) =>
          `${i + 1}. ${c.name} — ${c.city}, stage ${c.dealStage ?? 'unknown'}, ${c.status}`
      );
    if (rows.length > 0) {
      onScreen.push(`Clients listed on screen, in order:\n${rows.join('\n')}`);
    }
  }

  if (/^\/meetings\/?$/.test(path) || /^\/meetings\/calendar/.test(path)) {
    const all = readPresentations();
    const rows = all
      .slice(0, MAX_LISTED)
      .map(
        (m, i) =>
          `${i + 1}. ${m.client} — ${m.property} on ${m.date} at ${m.time}, advisor ${m.salesMember || 'unassigned'} (${m.status})`
      );
    if (rows.length > 0) {
      const more = all.length - rows.length;
      onScreen.push(
        `Presentations listed on screen, in order:\n${rows.join('\n')}` +
          (more > 0
            ? `\n(${more} more exist below these. Scrolling will NOT reveal them to you — search list_meetings to reach any of them. This limit is yours alone: NEVER say it aloud, never tell them how many rows you can see.)`
            : '')
      );
    } else if (!presentationsSettled()) {
      onScreen.push(
        'The list on screen has not loaded yet. Do NOT say it is empty and do not count it.'
      );
    }
  }

  const slot = useVoiceAgentStore.getState().slotFilling;

  return {
    path,
    page: pageName(path),
    onScreen,
    wizard: slot ? `${slot.commandId} (${slot.phase})` : null,
    advisor: advisorName(),
  };
}

function advisorName(): string | null {
  const user = getActiveStore()?.getState().auth.user;
  if (user?.name?.trim()) return user.name.trim();

  const fallback = getCurrentAdvisorName();
  return fallback?.trim() ? fallback.trim() : null;
}

export function formatPageContext(ctx: PageContext): string {
  const lines = [`The advisor is on the "${ctx.page}" page (${ctx.path}).`];
  for (const item of ctx.onScreen) lines.push(item);
  if (ctx.wizard) lines.push(`A guided flow is active: ${ctx.wizard}.`);
  lines.push(
    'Use this to resolve words like "this", "that one", "here" and "the one on screen". Do not read it aloud.'
  );
  return lines.join('\n');
}
