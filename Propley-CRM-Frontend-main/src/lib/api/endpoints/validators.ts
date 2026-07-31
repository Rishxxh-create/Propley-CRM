import type {
  EventStatsResponse,
  FunnelStatsResponse,
  LeadSourceStatsResponse,
  CityStatsResponse,
  LiveStreamEvent,
  LiveStreamResponse,
  MeetingActivityEvent,
  MeetingActivityResponse,
} from '@/lib/api/types/events';
import type {
  AdvisorReportResponse,
  MeetingsReportResponse,
  DashboardActivitiesResponse,
} from '@/lib/api/types/reports';
import type { ApiMeeting, ApiMeetingsAllResponse } from '@/lib/api/types/meetings';

export function isEventStatsResponse(data: unknown): data is EventStatsResponse {
  if (typeof data !== 'object' || data === null) return false;
  const row = data as Record<string, unknown>;
  return (
    typeof row.total_clients === 'number' &&
    typeof row.active_clients === 'number' &&
    typeof row.total_meetings === 'number' &&
    typeof row.active_meetings === 'number' &&
    typeof row.completed_meetings === 'number' &&
    typeof row.total_engagement === 'number' &&
    typeof row.total_attendees === 'number'
  );
}

export function isFunnelStatsResponse(data: unknown): data is FunnelStatsResponse {
  if (typeof data !== 'object' || data === null) return false;
  const row = data as Record<string, unknown>;
  return (
    typeof row.inquiry === 'number' &&
    typeof row.vsv_scheduled === 'number' &&
    typeof row.vsv_done === 'number' &&
    typeof row.offer === 'number' &&
    typeof row.negotiation === 'number' &&
    typeof row.closed_won === 'number' &&
    typeof row.closed_lost === 'number'
  );
}

export function isLeadSourceStatsResponse(data: unknown): data is LeadSourceStatsResponse {
  return Array.isArray(data) && data.every(
    (row) => typeof row === 'object' && row !== null && typeof (row as Record<string, unknown>).source === 'string' && typeof (row as Record<string, unknown>).count === 'number'
  );
}

export function isCityStatsResponse(data: unknown): data is CityStatsResponse {
  return Array.isArray(data) && data.every(
    (row) => typeof row === 'object' && row !== null && typeof (row as Record<string, unknown>).city === 'string' && typeof (row as Record<string, unknown>).count === 'number'
  );
}

function isActivityEventRow(row: unknown): row is MeetingActivityEvent {
  if (typeof row !== 'object' || row === null) return false;
  const e = row as Record<string, unknown>;
  return (
    typeof e.id === 'number' &&
    typeof e.event_id === 'string' &&
    typeof e.name === 'string' &&
    typeof e.time === 'string'
  );
}

export function isMeetingActivityResponse(data: unknown): data is MeetingActivityResponse {
  return Array.isArray(data) && data.every(isActivityEventRow);
}

function isLiveStreamEventRow(row: unknown): row is LiveStreamEvent {
  if (typeof row !== 'object' || row === null) return false;
  const e = row as Record<string, unknown>;
  return (
    typeof e.id === 'number' &&
    typeof e.event_id === 'string' &&
    typeof e.name === 'string' &&
    typeof e.time === 'string' &&
    typeof e.meeting_for === 'string'
  );
}

export function isLiveStreamResponse(data: unknown): data is LiveStreamResponse {
  return Array.isArray(data) && data.every(isLiveStreamEventRow);
}

export function isApiMeeting(row: unknown): row is ApiMeeting {
  if (typeof row !== 'object' || row === null) return false;
  const m = row as Record<string, unknown>;
  return (
    typeof m.id === 'number' &&
    typeof m.uuid === 'string' &&
    typeof m.start_time === 'string' &&
    typeof m.moderator_name === 'string'
  );
}

export function isMeetingsAllResponse(data: unknown): data is ApiMeetingsAllResponse {
  return Array.isArray(data) && data.every(isApiMeeting);
}

// Reports Validators
export function isAdvisorReportResponse(data: unknown): data is AdvisorReportResponse {
  if (!Array.isArray(data)) return false;
  return data.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'advisor' in item &&
      typeof item.advisor === 'string' &&
      'meetings' in item &&
      typeof item.meetings === 'number' &&
      'engagement' in item &&
      typeof item.engagement === 'number' &&
      'clients_reached' in item &&
      typeof item.clients_reached === 'number'
  );
}

export function isMeetingsReportResponse(data: unknown): data is MeetingsReportResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'total' in data &&
    typeof data.total === 'number' &&
    'active' in data &&
    typeof data.active === 'number' &&
    'completed' in data &&
    typeof data.completed === 'number' &&
    'engagement_distribution' in data &&
    Array.isArray(data.engagement_distribution) &&
    'interaction_distribution' in data &&
    Array.isArray(data.interaction_distribution)
  );
}

export function isDashboardActivitiesResponse(data: unknown): data is DashboardActivitiesResponse {
  if (!Array.isArray(data)) return false;
  return data.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'type' in item &&
      typeof item.type === 'string' &&
      'title' in item &&
      typeof item.title === 'string' &&
      'description' in item &&
      typeof item.description === 'string' &&
      'created_at' in item &&
      typeof item.created_at === 'string'
  );
}
