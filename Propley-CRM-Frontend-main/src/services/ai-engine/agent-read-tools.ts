import { findCustomersByNameQuery } from "@/lib/customers-store";
import {
  presentations,
  customers,
  eventStats,
  presentationsSettled,
} from "@/services/voice-livekit/crm-source";
import { fuzzyNameScore } from "@/lib/phonetic-name-match";
import type { StoredMeeting } from "@/lib/mock-data";
import type { EventStatsResponse } from "@/lib/api/types/events";

function readEventStats(): EventStatsResponse | null {
  return eventStats();
}

const readPresentations = presentations;
const readCustomers = customers;

export function getClientTool(args: { name?: string }): unknown {
  const query = (args.name ?? "").trim();
  if (!query) return { found: false, error: "no name provided" };
  const matches = findCustomersByNameQuery(query);
  if (matches.length === 0) return { found: false, query };
  if (matches.length > 1) {
    return {
      found: true,
      ambiguous: true,
      candidates: matches.slice(0, 6).map((c) => ({ name: c.name, city: c.city, dealStage: c.dealStage ?? null })),
    };
  }
  const c = matches[0];
  return {
    found: true,
    client: {
      name: c.name,
      status: c.status,
      dealStage: c.dealStage ?? null,
      city: c.city,
      phone: c.phone,
      email: c.email,
      lastMeeting: c.lastMeeting,
      leadSource: c.leadSource ?? null,
    },
  };
}

function meetingRow(m: StoredMeeting) {
  return {
    client: m.client,

    advisor: m.salesMember,
    project: m.property,
    date: m.date,
    time: m.time,
    status: m.status,
  };
}

export function listMeetingsTool(args: { status?: string; client?: string }): unknown {
  const all = readPresentations();

  if (!presentationsSettled()) {
    return { loaded: false, note: "the presentations have not loaded yet — do not state a count" };
  }

  const status = (args.status ?? "").trim();
  const query = (args.client ?? "").trim();

  let filtered = all;
  if (status && status.toLowerCase() !== "all") {
    filtered = filtered.filter((m) => (m.status ?? "").toLowerCase() === status.toLowerCase());
  }

  if (query) {
    const scored = filtered
      .map((m) => ({ m, score: Math.max(fuzzyNameScore(m.client ?? "", query), fuzzyNameScore(m.property ?? "", query)) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return { total: all.length, matched: 0, query, found: false };
    }
    return {
      total: all.length,
      matched: scored.length,
      query,
      found: true,
      results: scored.slice(0, 6).map(({ m }) => meetingRow(m)),
    };
  }

  const byStatus: Record<string, number> = {};
  for (const m of all) {
    const s = m.status ?? "Unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  const stats = readEventStats();

  return {
    total: stats?.total_meetings ?? all.length,
    matched: filtered.length,
    statusFilter: status || "all",
    byStatus,
    ...(stats ? { active: stats.active_meetings, completed: stats.completed_meetings } : {}),
    sample: filtered.slice(0, 8).map(meetingRow),
    ...(filtered.length > 8
      ? { note: `${filtered.length - 8} more not shown — search by name with the client argument` }
      : {}),
  };
}

export function listClientsTool(args: { stage?: string }): unknown {
  const all = readCustomers();
  const stage = (args.stage ?? "").trim().toLowerCase();

  const rows = stage && stage !== "all" ? all.filter((c) => (c.dealStage ?? "").toLowerCase() === stage) : all;

  return {
    total: all.length,
    matched: rows.length,
    ...(stage && stage !== "all" ? { stageFilter: stage } : {}),
    clients: rows.slice(0, 12).map((c) => ({
      name: c.name,
      stage: c.dealStage ?? null,
      city: c.city,
      status: c.status,
    })),
    ...(rows.length > 12 ? { note: `${rows.length - 12} more not shown` } : {}),
  };
}

export function dashboardSummaryTool(): unknown {
  const meetings = readPresentations();
  const customers = readCustomers();
  const byStatus: Record<string, number> = {};
  for (const m of meetings) {
    const s = m.status ?? "Unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }
  const byStage: Record<string, number> = {};
  for (const c of customers) {
    const s = c.dealStage ?? "unknown";
    byStage[s] = (byStage[s] ?? 0) + 1;
  }

  const stats = readEventStats();

  return {
    totalMeetings: stats?.total_meetings ?? meetings.length,
    activeMeetings: stats?.active_meetings ?? byStatus["Live"] ?? 0,
    completedMeetings: stats?.completed_meetings ?? byStatus["Completed"] ?? 0,
    scheduled: byStatus["Scheduled"] ?? 0,
    canceled: byStatus["Canceled"] ?? 0,
    totalClients: stats?.total_clients ?? customers.length,
    activeClients: stats?.active_clients ?? undefined,
    totalEngagement: stats?.total_engagement ?? undefined,
    totalAttendees: stats?.total_attendees ?? undefined,
    clientsByStage: byStage,
  };
}

export function runReadTool(name: string, args: Record<string, unknown>): unknown {
  switch (name) {
    case "get_client":
      return getClientTool(args as { name?: string });
    case "list_meetings":
      return listMeetingsTool(args as { status?: string; client?: string });
    case "list_clients":
      return listClientsTool(args as { stage?: string });
    case "dashboard_summary":
      return dashboardSummaryTool();
    default:
      return { error: `unknown read tool: ${name}` };
  }
}
