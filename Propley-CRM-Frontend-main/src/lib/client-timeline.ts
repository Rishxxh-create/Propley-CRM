import { readClientNotes } from '@/lib/client-notes';
import { getPresentationsForCustomer } from '@/lib/presentations-store';
import type { Customer, MeetingStatus, StoredMeeting } from '@/lib/mock-data';
import {
  formatIndianDateTime,
  formatMeetingDateLabel,
  parseIndianDateString,
} from '@/lib/date-format';
import { parseTimeValue, to24HourTime } from '@/lib/presentation-templates';

export type TimelineEventKind = 'presentation' | 'note';

export interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  title: string;
  subtitle?: string;
  date: string;
  sortKey: number;
  href?: string;
  actionLabel?: string;
  status?: MeetingStatus;
}

/** Normalize stored time to 12-hour label (avoids "14:30 PM" style bugs). */
export function formatPresentationTimeLabel(timeStr?: string): string {
  if (!timeStr?.trim()) return '';
  const { hour12, minute, period } = parseTimeValue(timeStr);
  const h24 = to24HourTime(hour12, minute, period);
  const [h, m] = h24.split(':').map((v) => parseInt(v, 10));
  const d = new Date();
  d.setHours(Number.isNaN(h) ? 10 : h, Number.isNaN(m) ? 0 : m, 0, 0);
  const hour = d.getHours();
  const displayHour = hour % 12 || 12;
  const displayPeriod = hour >= 12 ? 'PM' : 'AM';
  return `${displayHour}:${String(d.getMinutes()).padStart(2, '0')} ${displayPeriod}`;
}

function presentationHref(m: StoredMeeting): { href?: string; actionLabel?: string } {
  if (m.status === 'Canceled') return {};
  if (m.status === 'Completed') {
    return { href: `/meetings/${m.uuid}/post-analysis`, actionLabel: 'viewAnalysis' };
  }
  if (m.status === 'Live') {
    return { href: `/moderator/${m.uuid}`, actionLabel: 'enterPortal' };
  }
  return { href: '/meetings', actionLabel: 'viewPresentation' };
}

function presentationSubtitle(m: StoredMeeting): string {
  const parts: string[] = [m.status];
  if (m.date) parts.push(formatMeetingDateLabel(m.date));
  const time = formatPresentationTimeLabel(m.time);
  if (time) parts.push(time);
  return parts.join(' · ');
}

function presentationSortKey(m: StoredMeeting): number {
  const day = parseIndianDateString(m.date);
  if (!day) return 0;
  const { hour12, minute, period } = parseTimeValue(m.time || '10:00');
  const h24 = to24HourTime(hour12, minute, period);
  const [h, min] = h24.split(':').map((v) => parseInt(v, 10));
  const d = new Date(day);
  d.setHours(Number.isNaN(h) ? 10 : h, Number.isNaN(min) ? 0 : min, 0, 0);
  return d.getTime();
}

export function getTimelineEvents(customer: Customer): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  const meetings = getPresentationsForCustomer(customer);
  for (const m of meetings) {
    const { href, actionLabel } = presentationHref(m);
    events.push({
      id: `mt-${m.uuid}`,
      kind: 'presentation',
      title: m.property,
      subtitle: presentationSubtitle(m),
      date: m.date,
      sortKey: presentationSortKey(m),
      href,
      actionLabel,
      status: m.status,
    });
  }

  const notes = readClientNotes(customer.id);
  for (const n of notes) {
    const created = new Date(n.createdAt);
    const preview =
      n.body.trim().length > 72 ? `${n.body.trim().slice(0, 72)}…` : n.body.trim();
    events.push({
      id: String(n.id),
      kind: 'note',
      title: preview || 'Advisor note',
      subtitle: `${n.author} · ${formatIndianDateTime(created)}`,
      date: n.createdAt,
      sortKey: created.getTime(),
    });
  }

  let sorted = events.sort((a, b) => b.sortKey - a.sortKey);

  if (sorted.length === 0) {
    // Generate mock timeline events if no actual data exists
    const d1 = new Date();
    d1.setDate(d1.getDate() - 2);
    
    const d2 = new Date();
    d2.setDate(d2.getDate() - 5);

    sorted = [
      {
        id: 'mock-1',
        kind: 'presentation',
        title: 'Lodha World Towers Showcase',
        subtitle: `Completed · ${formatIndianDateTime(d1)}`,
        date: d1.toISOString(),
        sortKey: d1.getTime(),
        href: '/meetings/mock/post-analysis',
        actionLabel: 'viewAnalysis',
        status: 'Completed',
      },
      {
        id: 'mock-2',
        kind: 'note',
        title: 'Initial consultation and requirements gathering.',
        subtitle: `Advisor · ${formatIndianDateTime(d2)}`,
        date: d2.toISOString(),
        sortKey: d2.getTime(),
      },
    ];
  }

  return sorted;
}
