import { MEETINGS, TEAM_MEMBERS, type StoredMeeting } from '@/lib/mock-data';
import { parseIndianDateString, formatStoredPresentationDate } from '@/lib/date-format';

const LEGACY_ADVISORS: Record<string, { id: string; name: string }> = {
  'Elena Vasquez': { id: 'tm-001', name: 'Priya Sharma' },
  'Alexander Wright': { id: 'tm-002', name: 'Arjun Mehta' },
  'Sarah Jenkins': { id: 'tm-003', name: 'Ananya Reddy' },
};

const LEGACY_CLIENTS: Record<string, { id: string; name: string }> = {
  'Sarah Jenkins': { id: 'cu-001', name: 'Aditya Khanna' },
  'Michael Chen': { id: 'cu-003', name: 'Rahul Verma' },
  'David Miller': { id: 'cu-005', name: 'Sanjay Patel' },
  'Emma Wilson': { id: 'cu-004', name: 'Meera Iyer' },
};

/** Normalize legacy Western seed / localStorage rows to India market data */
export function migratePresentationRow(m: StoredMeeting): StoredMeeting {
  const row = { ...m };

  const adv = LEGACY_ADVISORS[row.salesMember];
  if (adv) {
    row.salesMember = adv.name;
    row.salesMemberId = adv.id;
  } else if (!row.salesMemberId) {
    const member = TEAM_MEMBERS.find((t) => t.name === row.salesMember);
    if (member) row.salesMemberId = member.id;
  }

  const client = LEGACY_CLIENTS[row.client];
  if (client) {
    row.client = client.name;
    row.clientId = client.id;
  }

  const parsed = parseIndianDateString(row.date);
  if (parsed) {
    row.date = formatStoredPresentationDate(parsed);
  }

  return row;
}

export function migratePresentationsList(rows: StoredMeeting[]): StoredMeeting[] {
  return rows.map(migratePresentationRow);
}

/** Append seed presentations missing from localStorage (e.g. new demo clients). */
export function mergeMissingSeedPresentations(rows: StoredMeeting[]): StoredMeeting[] {
  const migrated = migratePresentationsList(rows);
  const known = new Set(migrated.map((m) => m.uuid).filter(Boolean));
  const seed = migratePresentationsList(MEETINGS as StoredMeeting[]);
  const missing = seed.filter((m) => m.uuid && !known.has(m.uuid));
  return missing.length > 0 ? [...migrated, ...missing] : migrated;
}

let seededPresentationsCache: StoredMeeting[] | null = null;

export function seedPresentationsIfEmpty(): StoredMeeting[] {
  if (seededPresentationsCache === null) {
    seededPresentationsCache = migratePresentationsList(MEETINGS as StoredMeeting[]);
  }
  return seededPresentationsCache;
}
