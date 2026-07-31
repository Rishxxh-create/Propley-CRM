import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import type { StoredMeeting } from '@/lib/mock-data';
import {
  formatIndianDate,
  IN_DATE_LONG,
  IN_DAY_MONTH,
  IN_DAY_MONTH_YEAR,
  IN_MONTH_YEAR,
  parseIndianDateString,
} from '@/lib/date-format';
import { parseTimeValue, to24HourTime } from '@/lib/presentation-templates';

export type CalendarViewMode = 'month' | 'week' | 'day';

export const CALENDAR_HOURS = Array.from({ length: 13 }, (_, i) => i + 8);

export function meetingStartAt(meeting: StoredMeeting): Date | null {
  // If the meeting is currently Live, always render it on "Today" so it isn't lost in the past.
  const day = meeting.status === 'Live' ? new Date() : parseIndianDateString(meeting.date);
  if (!day) return null;
  const { hour12, minute, period } = parseTimeValue(meeting.time || '10:00');
  const time24 = to24HourTime(hour12, minute, period);
  const [h, m] = time24.split(':').map((v) => parseInt(v, 10));
  const d = startOfDay(day);
  d.setHours(Number.isNaN(h) ? 10 : h, Number.isNaN(m) ? 0 : m, 0, 0);
  return d;
}

export function meetingsForDay(meetings: StoredMeeting[], day: Date): StoredMeeting[] {
  return meetings.filter((m) => {
    const start = meetingStartAt(m);
    return start && isSameDay(start, day);
  });
}

export function meetingsInRange(
  meetings: StoredMeeting[],
  start: Date,
  end: Date
): StoredMeeting[] {
  return meetings.filter((m) => {
    const startAt = meetingStartAt(m);
    return startAt && startAt >= start && startAt <= end;
  });
}

export function getVisibleRange(
  cursor: Date,
  view: CalendarViewMode
): { start: Date; end: Date; days: Date[] } {
  if (view === 'day') {
    const start = startOfDay(cursor);
    return { start, end: addDays(start, 1), days: [start] };
  }
  if (view === 'week') {
    const start = startOfWeek(cursor, { weekStartsOn: 0 });
    const end = endOfWeek(cursor, { weekStartsOn: 0 });
    return {
      start,
      end,
      days: eachDayOfInterval({ start, end }),
    };
  }
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
  return {
    start,
    end,
    days: eachDayOfInterval({ start, end }),
  };
}

export function navigateCursor(
  cursor: Date,
  view: CalendarViewMode,
  direction: -1 | 1
): Date {
  if (view === 'day') return addDays(cursor, direction);
  if (view === 'week') return addWeeks(cursor, direction);
  return addMonths(cursor, direction);
}

export function formatCalendarTitle(cursor: Date, view: CalendarViewMode): string {
  if (view === 'day') return formatIndianDate(cursor, IN_DATE_LONG);
  if (view === 'week') {
    const start = startOfWeek(cursor, { weekStartsOn: 0 });
    const end = endOfWeek(cursor, { weekStartsOn: 0 });
    return `${formatIndianDate(start, IN_DAY_MONTH)} – ${formatIndianDate(end, IN_DAY_MONTH_YEAR)}`;
  }
  return formatIndianDate(cursor, IN_MONTH_YEAR);
}

export function isCurrentMonth(day: Date, cursor: Date) {
  return isSameMonth(day, cursor);
}

export { subMonths, subWeeks, isSameDay };
