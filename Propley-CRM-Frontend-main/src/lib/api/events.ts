import {
  assertArray,
  createKeyedGet,
  createSingletonGet,
} from '@/lib/api/core/deduped-get';
import { apiClient } from '@/lib/api/api-client';
import { ApiError } from '@/lib/api/http-client';
import {
  isEventStatsResponse,
  isFunnelStatsResponse,
  isLeadSourceStatsResponse,
  isCityStatsResponse,
  isLiveStreamResponse,
} from '@/lib/api/endpoints/validators';
import type {
  EventStatsResponse,
  FunnelStatsResponse,
  LeadSourceStatsResponse,
  CityStatsResponse,
  LiveStreamResponse,
  MeetingActivityEvent,
  MeetingActivityResponse,
  MeetingActivityPaginatedResponse,
} from '@/lib/api/types/events';

function parseEventStatsResponse(data: unknown): EventStatsResponse {
  if (!isEventStatsResponse(data)) {
    throw new ApiError('Invalid event stats response', 502);
  }
  return data;
}

function parseFunnelStatsResponse(data: unknown): FunnelStatsResponse {
  if (!isFunnelStatsResponse(data)) {
    throw new ApiError('Invalid funnel stats response', 502);
  }
  return data;
}

function parseLeadSourceStatsResponse(data: unknown): LeadSourceStatsResponse {
  if (!isLeadSourceStatsResponse(data)) {
    throw new ApiError('Invalid lead source stats response', 502);
  }
  return data;
}

function parseCityStatsResponse(data: unknown): CityStatsResponse {
  if (!isCityStatsResponse(data)) {
    throw new ApiError('Invalid city stats response', 502);
  }
  return data;
}

function normalizeActivityRow(row: unknown): MeetingActivityEvent | null {
  if (typeof row !== 'object' || row === null) return null;
  const e = row as Record<string, unknown>;
  if (typeof e.id !== 'number' || typeof e.time !== 'string') return null;

  const eventId = typeof e.event_id === 'string' ? e.event_id : null;
  const name = typeof e.name === 'string' ? e.name : null;
  if (!eventId && !name) return null;

  return {
    id: e.id,
    meeting_id: typeof e.meeting_id === 'number' ? e.meeting_id : 0,
    event_id: eventId ?? '',
    name: name ?? 'Session activity',
    time: e.time,
    duration: typeof e.duration === 'number' ? e.duration : 0,
    user_name: typeof e.user_name === 'string' ? e.user_name : null,
    user_mobile:
      typeof e.user_mobile === 'string' && e.user_mobile.trim()
        ? e.user_mobile
        : null,
    user_title: typeof e.user_title === 'string' ? e.user_title : null,
    meta: typeof e.meta === 'object' && e.meta !== null ? (e.meta as Record<string, unknown>) : undefined,
  };
}

function parseMeetingActivityResponse(data: unknown): MeetingActivityResponse {
  const rows =
    data && typeof data === 'object' && 'data' in data
      ? (data as { data: unknown }).data
      : data;
  return assertArray<unknown>(rows, 'Invalid meeting activity response')
    .map(normalizeActivityRow)
    .filter((row): row is MeetingActivityEvent => row !== null);
}

function parseLiveStreamResponse(data: unknown): LiveStreamResponse {
  if (!isLiveStreamResponse(data)) {
    throw new ApiError('Invalid live stream response', 502);
  }
  return data;
}

/** Browser domain: event stats via direct API (`GET /api/dashboard/summary`). */
export const fetchEventStats = createSingletonGet({
  client: apiClient,
  path: '/api/dashboard/summary',
  parse: parseEventStatsResponse,
});

/** Browser domain: funnel stats via direct API (`GET /api/dashboard/funnel`). */
export const fetchFunnelStats = createSingletonGet({
  client: apiClient,
  path: '/api/dashboard/funnel',
  parse: parseFunnelStatsResponse,
});

/** Browser domain: lead source stats via direct API (`GET /api/dashboard/lead-sources`). */
export const fetchLeadSourceStats = createSingletonGet({
  client: apiClient,
  path: '/api/dashboard/lead-sources',
  parse: parseLeadSourceStatsResponse,
});

/** Browser domain: city stats via direct API (`GET /api/dashboard/cities`). */
export const fetchCityStats = createSingletonGet({
  client: apiClient,
  path: '/api/dashboard/cities',
  parse: parseCityStatsResponse,
});

/** Browser domain: meeting activity via direct API (`GET /api/v1/events/:uuid/activity`). */
export const fetchMeetingActivity = createKeyedGet({
  client: apiClient,
  path: (meetingUuid) => `/api/v1/events/${encodeURIComponent(meetingUuid)}/activity`,
  parse: parseMeetingActivityResponse,
});

/** Browser domain: live activity feed via direct API (`GET /api/v1/events/live-stream`). */
export const fetchLiveStream = createSingletonGet({
  client: apiClient,
  path: '/api/v1/events/live-stream',
  parse: parseLiveStreamResponse,
});

/** Browser domain: paginated meeting activity. */
export const fetchMeetingActivityPaginated = async (
  meetingUuid: string,
  page: number = 1,
  limit: number = 15,
  options?: { signal?: AbortSignal }
): Promise<MeetingActivityPaginatedResponse> => {
  const res = await apiClient.get(
    `/api/v1/events/${encodeURIComponent(meetingUuid)}/activity?page=${page}&limit=${limit}`,
    options
  );

  const data = res.data?.data || [];
  const pagination = res.data?.pagination || { page: 1, pageSize: limit, total: 0, totalPages: 1 };

  return {
    data: assertArray<unknown>(data, 'Invalid paginated activity response')
      .map(normalizeActivityRow)
      .filter((row): row is MeetingActivityEvent => row !== null),
    pagination,
  };
};
