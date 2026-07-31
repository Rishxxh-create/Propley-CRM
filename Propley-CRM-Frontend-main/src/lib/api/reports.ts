import { api } from '@/lib/api/client';
import {
  isAdvisorReportResponse,
  isMeetingsReportResponse,
} from '@/lib/api/endpoints/validators';
import type {
  AdvisorReportResponse,
  MeetingsReportResponse,
  DashboardActivitiesResponse,
} from '@/lib/api/types/reports';

export async function fetchAdvisorsReport(
  signal?: AbortSignal
): Promise<AdvisorReportResponse> {
  const data = await api<unknown>('/api/dashboard/advisors', { signal });
  if (!isAdvisorReportResponse(data)) {
    throw new Error('Invalid format for advisors report response');
  }
  return data;
}

export async function fetchMeetingsReport(
  signal?: AbortSignal
): Promise<MeetingsReportResponse> {
  const data = await api<unknown>('/api/dashboard/meetings', { signal });
  if (!isMeetingsReportResponse(data)) {
    throw new Error('Invalid format for meetings report response');
  }
  return data;
}

export async function fetchDashboardActivities(
  limit: number = 20,
  page: number = 1,
  typeFilter?: string,
  signal?: AbortSignal
): Promise<DashboardActivitiesResponse> {
  const url = `/api/dashboard/activities?limit=${limit}&page=${page}${typeFilter ? `&type=${typeFilter}` : ''}`;
  const data = await api<unknown>(url, { signal });
  // Currently the API returns an array, but standard pagination might return an object. Assuming array.
  return data as DashboardActivitiesResponse;
}
