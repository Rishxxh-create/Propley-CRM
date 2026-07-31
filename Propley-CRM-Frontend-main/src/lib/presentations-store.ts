import { type MeetingStatus, type StoredMeeting } from '@/lib/mock-data';
import { parseIndianDateString } from '@/lib/date-format';
import {
  mergeMissingSeedPresentations,
  migratePresentationsList,
  seedPresentationsIfEmpty,
} from '@/lib/presentations-migrate';
import { isAfter, isBefore, isSameDay, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export const MEETINGS_STORAGE_KEY = 'propley_meetings';
export const MEETINGS_UPDATED_EVENT = 'propley_meetings_updated';

let cachedMeetings: StoredMeeting[] | null = null;
const clientMeetingsSnapshots = new Map<string, StoredMeeting[]>();

export interface PresentationFilters {
  status?: MeetingStatus | 'all' | undefined;
  advisorId?: string;
  advisorName?: string;
  project?: string;
  datePreset?: 'all' | 'today' | 'week' | 'month' | 'custom';
  dateFrom?: Date;
  dateTo?: Date;
}

export function readPresentations(): StoredMeeting[] {
  if (typeof window === 'undefined') return seedPresentationsIfEmpty();
  if (cachedMeetings !== null) return cachedMeetings;
  try {
    const saved = localStorage.getItem(MEETINGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as StoredMeeting[];
      const migrated = mergeMissingSeedPresentations(parsed);
      cachedMeetings = migrated;
      if (JSON.stringify(migrated) !== saved) {
        localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(migrated));
      }
      return cachedMeetings;
    }
  } catch {
    // ignore
  }
  cachedMeetings = seedPresentationsIfEmpty();
  return cachedMeetings;
}

export function writePresentations(meetings: StoredMeeting[]) {
  if (typeof window === 'undefined') return;
  cachedMeetings = meetings;
  localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(meetings));
  window.dispatchEvent(new Event(MEETINGS_UPDATED_EVENT));
}

export function subscribePresentations(onStoreChange: () => void) {
  const handle = () => {
    cachedMeetings = null;
    clientMeetingsSnapshots.clear();
    onStoreChange();
  };
  const handleStorage = (e: StorageEvent) => {
    if (e.key === MEETINGS_STORAGE_KEY) handle();
  };
  window.addEventListener(MEETINGS_UPDATED_EVENT, handle);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(MEETINGS_UPDATED_EVENT, handle);
    window.removeEventListener('storage', handleStorage);
  };
}

export function addPresentation(meeting: StoredMeeting) {
  writePresentations([meeting, ...readPresentations()]);
}

export function updatePresentation(uuid: string, patch: Partial<StoredMeeting>) {
  const next = readPresentations().map((m) =>
    m.uuid === uuid ? { ...m, ...patch } : m
  );
  writePresentations(next);
}

export function bulkUpdatePresentations(uuids: string[], patch: Partial<StoredMeeting>) {
  const set = new Set(uuids);
  const next = readPresentations().map((m) => (set.has(m.uuid) ? { ...m, ...patch } : m));
  writePresentations(next);
}

/** Stable array reference for useSyncExternalStore until meetings data changes. */
export function getPresentationsByClientId(clientId: string): StoredMeeting[] {
  const cached = clientMeetingsSnapshots.get(clientId);
  if (cached) return cached;
  const filtered = readPresentations().filter((m) => m.clientId === clientId);
  clientMeetingsSnapshots.set(clientId, filtered);
  return filtered;
}

/** Match by clientId, then by client display name (legacy rows without clientId). */
export function getPresentationsForCustomer(customer: {
  id: string;
  name: string;
}): StoredMeeting[] {
  const byId = getPresentationsByClientId(customer.id);
  if (byId.length > 0) return byId;
  const norm = customer.name.trim().toLowerCase();
  return readPresentations().filter(
    (m) => m.client.trim().toLowerCase() === norm
  );
}

export function getParticipateLink(uuid: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return base ? `${base}/participant/${uuid}` : `/participant/${uuid}`;
}

function meetingDate(m: StoredMeeting): Date | undefined {
  if (!m.date) return undefined;
  return parseIndianDateString(m.date) ?? undefined;
}

function inDateRange(d: Date, from: Date, to: Date) {
  return !isBefore(d, startOfDay(from)) && !isAfter(d, endOfDay(to));
}

export function filterPresentations(
  meetings: StoredMeeting[],
  filters: PresentationFilters
): StoredMeeting[] {
  return meetings.filter((m) => {
    if (filters.status && filters.status !== 'all' && m.status !== filters.status) {
      return false;
    }
    if (filters.advisorId && m.salesMemberId !== filters.advisorId) {
      return false;
    }
    if (filters.advisorName && m.salesMember !== filters.advisorName) {
      return false;
    }
    if (filters.project && m.property !== filters.project) {
      return false;
    }
    const preset = filters.datePreset ?? 'all';
    if (preset === 'all') return true;
    const d = meetingDate(m);
    if (!d) return false;
    const now = new Date();
    if (preset === 'today') return isSameDay(d, now);
    if (preset === 'week') {
      return inDateRange(d, startOfWeek(now), endOfWeek(now));
    }
    if (preset === 'month') {
      return inDateRange(d, startOfMonth(now), endOfMonth(now));
    }
    if (preset === 'custom' && filters.dateFrom && filters.dateTo) {
      return inDateRange(d, filters.dateFrom, filters.dateTo);
    }
    return true;
  });
}

export function presentationsToCsv(rows: StoredMeeting[]): string {
  const header = ['uuid', 'status', 'advisor', 'project', 'client', 'date', 'time'];
  const lines = rows.map((m) =>
    [m.uuid, m.status, m.salesMember, m.property, m.client, m.date, m.time]
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  );
  return [header.join(','), ...lines].join('\n');
}

export function downloadPresentationsCsv(rows: StoredMeeting[], filename = 'presentations.csv') {
  const blob = new Blob([presentationsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
