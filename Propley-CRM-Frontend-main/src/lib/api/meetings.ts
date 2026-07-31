/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSingletonGet, createKeyedGet } from '@/lib/api/core/deduped-get';
import { createKeyedMutation } from '@/lib/api/core/deduped-mutation';
import { isMeetingsAllResponse } from '@/lib/api/endpoints/validators';
import { mapApiMeetingToStored } from '@/lib/api/map-api-meeting';
import { apiClient } from '@/lib/api/api-client';
import { ApiError } from '@/lib/api/http-client';
import type { StoredMeeting } from '@/lib/mock-data';
import type { ApiNote, StoredNote } from '@/lib/api/types/notes';
import type { ApiMeetingMetadata } from '@/lib/api/types/meetings';

import { fetchSchedules, getSchedule } from './schedule';
import type { ApiSchedule } from './types/schedule';

function parseMeetingsAllResponse(data: unknown): StoredMeeting[] {
  if (!isMeetingsAllResponse(data)) {
    throw new ApiError('Invalid meetings response', 502);
  }
  return data.map(mapApiMeetingToStored);
}

const fetchMeetingsAllRows = createSingletonGet({
  client: apiClient,
  path: '/api/v1/meetings/all',
  parse: parseMeetingsAllResponse,
});

export function mapApiSchedulesToStored(data: unknown): StoredMeeting[] {
  if (!Array.isArray(data)) {
    throw new ApiError('Invalid schedules response', 502);
  }
  return data.map((item: ApiSchedule) => {
    const dateObj = new Date(item.start_time);
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    let mappedStatus: import('@/lib/mock-data').MeetingStatus = 'Scheduled';
    if (item.status === 'canceled') mappedStatus = 'Canceled';
    if (item.status === 'completed') mappedStatus = 'Completed';
    if (item.status === 'live') mappedStatus = 'Live';

    return {
      id: item.id.toString(),
      uuid: item.meeting_uuid,
      salesMember: item.created_by_name || 'Unknown',
      salesMemberId: item.created_by.toString(),
      client: item.client_name,
      clientId: `cu-${item.client_email}`,
      property: 'Scheduled Meeting',
      category: 'General',
      date: dateStr,
      time: timeStr,
      status: mappedStatus,
    };
  });
}

/** Browser domain: fetch both meetings and schedules and merge them. */
export const fetchMeetingsAll = async (options?: { signal?: AbortSignal }): Promise<StoredMeeting[]> => {
  const [meetings, schedulesData] = await Promise.all([
    fetchMeetingsAllRows(options).catch(() => [] as StoredMeeting[]),
    fetchSchedules(options).catch(() => []),
  ]);

  const schedules = mapApiSchedulesToStored(schedulesData);

  const seen = new Set<string>();
  const merged: StoredMeeting[] = [];

  for (const m of meetings) {
    if (m.uuid && !seen.has(m.uuid)) {
      seen.add(m.uuid);
      merged.push(m);
    }
  }
  for (const s of schedules) {
    if (s.uuid && !seen.has(s.uuid)) {
      seen.add(s.uuid);
      merged.push(s);
    }
  }

  return merged;
};



/** Browser domain: fetch single meeting via direct API (`GET /api/v1/schedule/:id`). */
export const fetchMeetingByUuid = async (uuid: string, options?: { signal?: AbortSignal }): Promise<StoredMeeting> => {
  // Try to use getSchedule if uuid is a valid ID
  const schedule = await getSchedule(uuid, options);

  const dateObj = new Date(schedule.start_time);
  const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  let mappedStatus: import('@/lib/mock-data').MeetingStatus = 'Scheduled';
  if (schedule.status === 'canceled') mappedStatus = 'Canceled';
  if (schedule.status === 'completed') mappedStatus = 'Completed';
  if (schedule.status === 'live') mappedStatus = 'Live';

  return {
    id: schedule.id.toString(),
    uuid: schedule.meeting_uuid,
    salesMember: schedule.created_by_name || 'Unknown',
    salesMemberId: schedule.created_by.toString(),
    client: schedule.client_name,
    clientId: `cu-${schedule.client_email}`,
    property: 'Scheduled Meeting',
    category: 'General',
    date: dateStr,
    time: timeStr,
    status: mappedStatus,
  };
};

function parseMeetingNotesResponse(data: unknown): StoredNote[] {
  const notesData = (data as { notes?: ApiNote[] })?.notes || [];
  return notesData.map((note: ApiNote) => ({
    id: String(note.id || note._id),
    note: note.text || note.note || '',
    createdAt: note.time || note.createdAt || new Date().toISOString(),
  }));
}

export const fetchMeetingNotes = createKeyedGet({
  client: apiClient,
  path: (meetingUuid) => `/api/v1/meetings/${meetingUuid}`,
  parse: parseMeetingNotesResponse,
});

const postMeetingNote = async (
  meetingUuid: string,
  payload: { note: string },
  options?: { signal?: AbortSignal },
): Promise<StoredNote> => {
  const res = await apiClient.post(`/api/v1/meetings/${meetingUuid}/notes`, payload, options);
  const notesArray = res.data?.notes || [];
  const note = notesArray[notesArray.length - 1] || {};
  return {
    id: String(note.id || note._id || Date.now()),
    note: note.text || note.note || payload.note,
    createdAt: note.time || note.createdAt || new Date().toISOString(),
  };
};

export const createMeetingNote = createKeyedMutation({
  key: (meetingUuid, payload) => `note:${meetingUuid}:${payload.note.trim()}`,
  execute: postMeetingNote,
});

export const updateMeetingNote = createKeyedMutation({
  key: (meetingUuid, noteId, payload) =>
    `note-patch:${meetingUuid}:${noteId}:${payload.note.trim()}`,
  execute: async (
    meetingUuid: string,
    noteId: string,
    payload: { note: string },
    options?: { signal?: AbortSignal },
  ): Promise<StoredNote> => {
    const res = await apiClient.patch(`/api/v1/meetings/${meetingUuid}/notes/${noteId}`, payload, options);
    const note = res.data;
    return {
      id: String(note.id || note._id || noteId),
      note: note.text || note.note || payload.note,
      createdAt: note.time || note.createdAt || new Date().toISOString(),
    };
  },
});

export const deleteMeetingNote = createKeyedMutation({
  key: (meetingUuid, noteId) => `note-delete:${meetingUuid}:${noteId}`,
  execute: async (meetingUuid: string, noteId: string, options?: { signal?: AbortSignal }): Promise<void> => {
    await apiClient.delete(`/api/v1/meetings/${meetingUuid}/notes/${noteId}`, options);
  },
});

export const patchMeetingTranscript = createKeyedMutation({
  key: (meetingUuid, payload) => `transcript:${meetingUuid}:${payload.transcript.trim()}`,
  execute: async (
    meetingUuid: string,
    payload: { transcript: string },
    options?: { signal?: AbortSignal },
  ): Promise<void> => {
    await apiClient.patch(`/api/v1/meetings/${meetingUuid}/transcript`, payload, options);
  },
});

export const verifyModeratorSession = createKeyedGet({
  client: apiClient,
  path: (uuid: string) => `/api/v1/meetings/${uuid}/moderator`,
  parse: (data: any) => data,
});

export const resetMeetingSession = createKeyedMutation({
  key: (uuid: string) => `reset:${uuid}`,
  execute: async (uuid: string, options?: { signal?: AbortSignal }): Promise<{ status: string }> => {
    const res = await apiClient.post(`/api/v1/meetings/${uuid}/reset`, {}, options);
    return res.data;
  },
});

export const fetchEnablexToken = createKeyedMutation({
  key: (payload: { uuid: string; name: string; role: string; socketId: string }) =>
    `enablex:${payload.uuid}:${payload.role}:${payload.socketId}`,
  execute: async (
    payload: { uuid: string; name: string; role: string; socketId: string },
    options?: { signal?: AbortSignal },
  ): Promise<{ token: string; roomId: string }> => {
    const res = await apiClient.post(`/api/v1/enablex/token`, payload, options);
    return res.data;
  },
});

/** Advisor display name from public meeting metadata (`GET /meetings/:uuid`). */
export function resolveMeetingAdvisorName(
  meeting: Record<string, unknown> | null | undefined,
): string {
  if (!meeting) return 'Lead Advisor';
  const m = meeting as {
    salesMember?: string;
    moderator_name?: string;
    created_by_name?: string;
  };
  return (
    m.salesMember?.trim() ||
    m.moderator_name?.trim() ||
    m.created_by_name?.trim() ||
    'Lead Advisor'
  );
}

export const fetchMeetingMetadata = createKeyedGet({
  client: apiClient,
  path: (uuid: string) => `/api/v1/meetings/${uuid}`,
  parse: (data: any) => {
    if (data && typeof data === 'object') {
      return {
        ...data,
        salesMember: resolveMeetingAdvisorName(data as Record<string, unknown>),
      } as ApiMeetingMetadata;
    }
    return (data ?? null) as ApiMeetingMetadata | null;
  },
});

const postInstantMeeting = async (
  payload: { meeting_for?: string; duration?: number } = {},
  options?: { signal?: AbortSignal },
): Promise<{ uuid: string; id: number; moderator_id: number }> => {
  const res = await apiClient.post(`/api/v1/meetings`, payload, options);
  return res.data;
};

export const createInstantMeeting = createKeyedMutation({
  key: (payload = {}) =>
    `instant:${payload.meeting_for ?? ''}:${payload.duration ?? ''}`,
  execute: postInstantMeeting,
});

