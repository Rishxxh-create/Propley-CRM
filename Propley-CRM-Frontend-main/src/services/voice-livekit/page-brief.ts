import { customers, eventStats, settledPresentations } from './crm-source';
import { TEAM_MEMBERS } from '@/lib/mock-data';
import type { StoredMeeting } from '@/lib/mock-data';

const MAX_HIGHLIGHT = 3;

const NOT_LOADED = {
  pending: true,
  note: 'Name the page in a few words and stop. Say NOTHING about its contents — not that it is empty, not that it is full, and not that anything is on its way. Never mention waiting.',
};

export interface PageBrief {
  page: string;
  facts: Record<string, unknown>;
}

function countBy<T>(rows: T[], key: (row: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function highlight(rows: StoredMeeting[]) {
  const live = rows.filter((m) => m.status === 'Live');
  const rest = rows.filter((m) => m.status !== 'Live');
  return [...live, ...rest].slice(0, MAX_HIGHLIGHT).map((m) => ({
    client: m.client,
    project: m.property,
    advisor: m.salesMember || null,
    date: m.date,
    time: m.time,
    status: m.status,
  }));
}

function meetingFacts(rows: StoredMeeting[] | null) {
  if (!rows) return NOT_LOADED;
  const stats = eventStats();
  return {
    presentations: stats?.total_meetings ?? rows.length,
    byStatus: countBy(rows, (m) => m.status ?? 'Unknown'),
    showing: highlight(rows),
  };
}

function clientFacts() {
  const rows = customers();
  const stats = eventStats();
  return {
    clients: stats?.total_clients ?? rows.length,
    byStage: countBy(rows, (c) => c.dealStage ?? 'unknown'),
    showing: rows.slice(0, MAX_HIGHLIGHT).map((c) => ({
      name: c.name,
      city: c.city,
      stage: c.dealStage ?? null,
    })),
  };
}

export async function describeDestination(path: string): Promise<PageBrief> {
  const clientId = /^\/customers\/([^/]+)/.exec(path)?.[1];
  if (clientId) {
    const client = customers().find((c) => c.id === clientId);
    return {
      page: 'Client profile',
      facts: client
        ? {
            name: client.name,
            stage: client.dealStage ?? null,
            city: client.city,
            status: client.status,
            lastMeeting: client.lastMeeting ?? null,
          }
        : NOT_LOADED,
    };
  }

  if (/^\/$/.test(path)) {
    const rows = await settledPresentations();
    if (!rows) return { page: 'Dashboard', facts: NOT_LOADED };
    const stats = eventStats();
    const byStatus = countBy(rows, (m) => m.status ?? '');
    return {
      page: 'Dashboard',
      facts: {
        presentations: stats?.total_meetings ?? rows.length,
        live: stats?.active_meetings ?? byStatus['Live'] ?? 0,
        completed: stats?.completed_meetings ?? byStatus['Completed'] ?? 0,
        clients: stats?.total_clients ?? customers().length,
        today: highlight(rows),
      },
    };
  }

  if (/^\/meetings\/calendar/.test(path)) {
    return { page: 'Presentations calendar', facts: meetingFacts(await settledPresentations()) };
  }

  if (/^\/meetings\/new/.test(path)) {
    return {
      page: 'Schedule a presentation',
      facts: { note: 'an empty schedule form, ready for a client, a project, a date and a time' },
    };
  }

  if (/^\/meetings/.test(path)) {
    return { page: 'Presentations list', facts: meetingFacts(await settledPresentations()) };
  }

  if (/^\/customers/.test(path)) {
    return { page: 'Clients list', facts: clientFacts() };
  }

  if (/^\/pipeline/.test(path)) {
    const rows = customers();
    return {
      page: 'Pipeline',
      facts: { clients: rows.length, byStage: countBy(rows, (c) => c.dealStage ?? 'unknown') },
    };
  }

  if (/^\/admin\/team/.test(path)) {
    return {
      page: 'Team members',
      facts: {
        team: TEAM_MEMBERS.length,
        byRole: countBy(TEAM_MEMBERS, (m) => m.role ?? 'unknown'),
      },
    };
  }

  if (/^\/admin\/roles/.test(path)) {
    return { page: 'Role policies', facts: { note: 'what each role is allowed to do' } };
  }

  if (/^\/admin\/permissions/.test(path)) {
    return { page: 'Permission matrix', facts: { note: 'every permission across every role' } };
  }

  if (/^\/settings\/templates/.test(path)) {
    return { page: 'Invite templates', facts: { note: 'the email and WhatsApp invites, per project' } };
  }

  if (/^\/reports/.test(path)) {
    return { page: 'Reports', facts: meetingFacts(await settledPresentations()) };
  }

  return { page: 'Propley', facts: {} };
}
