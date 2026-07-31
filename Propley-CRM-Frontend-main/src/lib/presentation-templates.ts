import { getCustomerByIdFromStore } from '@/lib/customers-store';
import {
  formatStoredPresentationDate,
  parseIndianDateString,
} from '@/lib/date-format';

export const MERGE_TAGS = [
  { token: '{client_name}', label: 'Client' },
  { token: '{project_name}', label: 'Project' },
  { token: '{meeting_date}', label: 'Date' },
  { token: '{meeting_time}', label: 'Time' },
  { token: '{meeting_link}', label: 'Join link' },
] as const;

export interface EmailTemplateFields {
  greeting: string;
  introduction: string;
  sessionDetails: string;
  closing: string;
  ctaLabel: string;
}

export const DEFAULT_EMAIL_TEMPLATE: EmailTemplateFields = {
  greeting: 'Dear {client_name},',
  introduction:
    'You are invited to a live property presentation for {project_name}. Join from your phone or computer for a guided tour with your advisor.',
  sessionDetails:
    'Your presentation is on {meeting_date} at {meeting_time}.',
  closing:
    'We look forward to walking you through the project and answering your questions.',
  ctaLabel: 'Join presentation',
};

export const DEFAULT_RESCHEDULE_EMAIL_TEMPLATE: EmailTemplateFields = {
  greeting: 'Dear {client_name},',
  introduction:
    'Your presentation for {project_name} has been rescheduled. Please use the updated date and time below.',
  sessionDetails:
    'New session: {meeting_date} at {meeting_time}.',
  closing:
    'We apologise for any inconvenience and look forward to welcoming you at the new time.',
  ctaLabel: 'Join updated session',
};

export type EmailTemplateVariant = 'invite' | 'reschedule';

export function emailSubjectForVariant(
  variant: EmailTemplateVariant,
  projectName: string
): string {
  if (variant === 'reschedule') {
    return `Updated presentation time — ${projectName}`;
  }
  return `Your immersive presentation — ${projectName}`;
};

export const DEFAULT_WHATSAPP_TEMPLATE = `Hello {client_name},

Your presentation for *{project_name}* is confirmed.

Date: {meeting_date}
Time: {meeting_time}

Join the session:
{meeting_link}

We look forward to welcoming you.`;

export interface PresentationContext {
  client_name: string;
  project_name: string;
  meeting_date: string;
  meeting_time: string;
  meeting_link: string;
}

export type TimePeriod = 'AM' | 'PM';

export interface Time12Parts {
  hour12: number;
  minute: number;
  period: TimePeriod;
}

const DEFAULT_TIME_PARTS: Time12Parts = { hour12: 10, minute: 0, period: 'AM' };

/** Parse stored value (24h `HH:mm` or 12h with AM/PM) into picker parts */
export function parseTimeValue(value: string): Time12Parts {
  if (!value.trim()) return { ...DEFAULT_TIME_PARTS };

  const twelveHour = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHour) {
    const parsedHour = Number(twelveHour[1]);
    const minute = Math.min(59, Math.max(0, Number(twelveHour[2]) || 0));
    const period = twelveHour[3].toUpperCase() as TimePeriod;
    
    // If the parsed hour is greater than 12 (e.g., 14:30 PM), treat it as 24-hour hour
    if (parsedHour > 12) {
      const periodFromHour: TimePeriod = parsedHour >= 12 ? 'PM' : 'AM';
      const hour12 = parsedHour % 12 || 12;
      return { hour12, minute, period: periodFromHour };
    }
    
    const hour12 = Math.min(12, Math.max(1, parsedHour || 10));
    return { hour12, minute, period };
  }

  const [hStr, mStr] = value.split(':');
  const h24 = Number(hStr);
  const minute = Math.min(59, Math.max(0, Number(mStr) || 0));
  if (Number.isNaN(h24)) return { ...DEFAULT_TIME_PARTS };

  const period: TimePeriod = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 % 12 || 12;
  return { hour12, minute, period };
}

/** Store as 24h `HH:mm` for consistent merging and previews */
export function to24HourTime(hour12: number, minute: number, period: TimePeriod): string {
  const h = Math.min(12, Math.max(1, hour12));
  const m = Math.min(59, Math.max(0, minute));
  let h24 = h % 12;
  if (period === 'PM') h24 += 12;
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** @deprecated Use parseIndianDateString from @/lib/date-format */
export function parseDateString(dateStr: string): Date | null {
  return parseIndianDateString(dateStr);
}

export function formatSessionTime(time: string) {
  if (!time.trim()) return '10:00 AM';
  const { hour12, minute, period } = parseTimeValue(time);
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function resolvePresentationContext(input: {
  customerType: 'existing' | 'new';
  clientId: string;
  customerName: string;
  project: string;
  date?: Date;
  time: string;
}): PresentationContext {
  const clientFromRegistry =
    input.customerType === 'existing'
      ? getCustomerByIdFromStore(input.clientId)?.name
      : undefined;

  return {
    client_name:
      (input.customerType === 'existing'
        ? clientFromRegistry ?? input.clientId
        : input.customerName) || 'Aditya Khanna',
    project_name: input.project || 'The Ivory Pavilion',
    meeting_date: input.date ? formatStoredPresentationDate(input.date) : '20 May 2026',
    meeting_time: formatSessionTime(input.time),
    meeting_link: 'https://propley.com/session/x9b1',
  };
}

export function applyMergeTags(text: string, context: PresentationContext) {
  return Object.entries(context).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    text
  );
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildEmailHtml(
  fields: EmailTemplateFields,
  context: PresentationContext,
  options?: { googleCalendarUrl?: string }
) {
  const greeting = escapeHtml(applyMergeTags(fields.greeting, context));
  const introduction = escapeHtml(applyMergeTags(fields.introduction, context));
  const sessionDetails = escapeHtml(applyMergeTags(fields.sessionDetails, context));
  const closing = escapeHtml(applyMergeTags(fields.closing, context));
  const cta = applyMergeTags(fields.ctaLabel, context);

  const calendarBlock = options?.googleCalendarUrl
    ? `<p style="margin-top:16px"><a href="${escapeHtml(options.googleCalendarUrl)}" style="color:#8B6B3F;font-weight:600">Add to Google Calendar</a></p>`
    : '';

  return {
    html: `<p>${greeting}</p><p>${introduction}</p><p>${sessionDetails}</p><p>${closing}</p>${calendarBlock}`,
    ctaLabel: cta,
  };
}

export function formatWhatsappPreview(text: string, context: PresentationContext) {
  return applyMergeTags(text, context)
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');
}

export function insertAtCursor(
  element: HTMLTextAreaElement | HTMLInputElement,
  token: string,
  value: string,
  onChange: (next: string) => void
) {
  const start = element.selectionStart ?? value.length;
  const end = element.selectionEnd ?? value.length;
  const next = value.slice(0, start) + token + value.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    element.focus();
    const pos = start + token.length;
    element.setSelectionRange(pos, pos);
  });
}
