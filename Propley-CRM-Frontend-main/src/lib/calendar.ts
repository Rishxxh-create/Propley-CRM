import { addMinutes, format } from 'date-fns';
import { parseTimeValue, to24HourTime } from '@/lib/presentation-templates';

export interface MeetingCalendarInput {
  title: string;
  date: Date;
  time24: string;
  durationMinutes?: number;
  description?: string;
  location?: string;
  sessionLink?: string;
}

/** Combine session date with 24h time string into one local Date */
export function combineDateAndTime(date: Date, time24: string): Date {
  const { hour12, minute, period } = parseTimeValue(time24 || '10:00');
  const normalized = to24HourTime(hour12, minute, period);
  const [hours, minutes] = normalized.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

function formatGoogleCalendarDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss");
}

function formatIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function buildGoogleCalendarUrl(input: MeetingCalendarInput): string {
  const start = combineDateAndTime(input.date, input.time24);
  const end = addMinutes(start, input.durationMinutes ?? 60);

  const details = [
    input.description,
    input.sessionLink ? `Join session: ${input.sessionLink}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${formatGoogleCalendarDate(start)}/${formatGoogleCalendarDate(end)}`,
    details,
  });

  if (input.location) {
    params.set('location', input.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcsContent(input: MeetingCalendarInput): string {
  const start = combineDateAndTime(input.date, input.time24);
  const end = addMinutes(start, input.durationMinutes ?? 60);
  const uid = `${Date.now()}@propley.com`;

  const description = [
    input.description,
    input.sessionLink ? `Join session: ${input.sessionLink}` : '',
  ]
    .filter(Boolean)
    .join('\\n\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Propley//Sales Portal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART:${formatIcsUtc(start)}`,
    `DTEND:${formatIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    input.location ? `LOCATION:${escapeIcsText(input.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

export function downloadIcsFile(input: MeetingCalendarInput, filename = 'propley-presentation.ics') {
  if (typeof window === 'undefined') return;

  const blob = new Blob([buildIcsContent(input)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function meetingCalendarFromSchedule(input: {
  project: string;
  clientName: string;
  date?: Date;
  time24: string;
  sessionLink?: string;
}): MeetingCalendarInput | null {
  if (!input.date || isNaN(input.date.getTime()) || !input.time24.trim()) return null;

  return {
    title: `Propley Presentation — ${input.project}`,
    date: input.date,
    time24: input.time24,
    durationMinutes: 60,
    description: `Immersive presentation for ${input.clientName}. Hosted by Propley Sales Engine.`,
    location: 'Propley Immersive Session',
    sessionLink: input.sessionLink,
  };
}
