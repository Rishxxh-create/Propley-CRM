import { format, isAfter, isValid, parseISO } from 'date-fns';
import type { ApiMeeting } from '@/lib/api/types/meetings';
import { formatIndianDate, IN_LOCALE } from '@/lib/date-format';
import type { MeetingStatus, StoredMeeting } from '@/lib/mock-data';

/** `is_active` ended → Completed; active + future start → Scheduled; else Live. */
function apiMeetingStatus(row: ApiMeeting): MeetingStatus {
  if (!row.is_active) return 'Completed';
  const start = parseISO(row.start_time);
  if (isValid(start) && isAfter(start, new Date())) return 'Scheduled';
  return 'Live';
}

/** Maps backend `GET /api/v1/meetings/all` rows to presentations registry shape. */
export function mapApiMeetingToStored(row: ApiMeeting): StoredMeeting {
  const start = parseISO(row.start_time);
  const date = isValid(start) ? formatIndianDate(start) : row.start_time;
  const time = isValid(start)
    ? format(start, 'h:mm a', { locale: IN_LOCALE })
    : '';

  const count = row.client_count ? Number.parseInt(row.client_count, 10) : NaN;
  const parsedCount = Number.isFinite(count) && count > 0 ? count : undefined;
  const rawClientName = row.client_name?.trim() || undefined;

  const client =
    rawClientName
      ? rawClientName
      : parsedCount
        ? `${parsedCount} participant${parsedCount === 1 ? '' : 's'}`
        : '—';

  return {
    id: String(row.id),
    uuid: row.uuid,
    salesMember: row.moderator_name?.trim() || '—',
    salesMemberId:
      row.moderator_id != null ? String(row.moderator_id) : undefined,
    property: row.meeting_for?.trim() || '—',
    category: 'Presentation',
    client,
    date,
    time,
    status: apiMeetingStatus(row),
    transcript: row.transcript,
    clientCount: parsedCount,
    clientName: rawClientName,
  };
}
