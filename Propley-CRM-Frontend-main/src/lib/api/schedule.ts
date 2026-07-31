import { apiClient } from '@/lib/api/api-client';
import { createKeyedGet } from '@/lib/api/core/deduped-get';
import type { ApiSchedule, CreateSchedulePayload, ReschedulePayload } from '@/lib/api/types/schedule';

export const fetchSchedules = async (options?: { signal?: AbortSignal }): Promise<ApiSchedule[]> => {
  const res = await apiClient.get<ApiSchedule[]>('/api/v1/schedule', options);
  return res.data;
};

export const createSchedule = async (payload: CreateSchedulePayload, options?: { signal?: AbortSignal }): Promise<ApiSchedule> => {
  const res = await apiClient.post<ApiSchedule>('/api/v1/schedule', payload, options);
  return res.data;
};

export const getSchedule = createKeyedGet({
  client: apiClient,
  path: (id) => `/api/v1/schedule/${id}`,
  parse: (data) => data as ApiSchedule,
});

export const rescheduleMeeting = async (id: number | string, payload: ReschedulePayload, options?: { signal?: AbortSignal }): Promise<ApiSchedule> => {
  const res = await apiClient.put<ApiSchedule>(`/api/v1/schedule/${id}/reschedule`, payload, options);
  return res.data;
};

export const cancelSchedule = async (id: number | string, options?: { signal?: AbortSignal }): Promise<void> => {
  await apiClient.delete(`/api/v1/schedule/${id}/cancel`, options);
};
