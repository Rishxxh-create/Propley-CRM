import { api } from './client';

export interface ScheduledMeeting {
  id: number;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  client_city: string | null;
  project_id: number | null;
  start_time: string;
  end_time: string;
  status: string;
  meeting_uuid: string | null;
  calendar_event_id: string | null;
  room_link?: string;
}

export interface CustomerMatch {
  client_name: string;
  client_email: string;
  client_phone: string | null;
  client_city: string | null;
  project_id: number | null;
  last_seen_at: string;
}

export interface ScheduleMeetingPayload {
  client_name: string;
  client_email: string;
  client_phone?: string | null;
  client_city?: string | null;
  project_id?: number | null;
  start_time: string;
}

export function scheduleMeeting(payload: ScheduleMeetingPayload) {
  return api<ScheduledMeeting>('/api/v1/schedule/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function lookupCustomer(
  query: { email?: string; phone?: string }
): Promise<CustomerMatch | null> {
  const params = new URLSearchParams();
  if (query.email) params.set('email', query.email);
  if (query.phone) params.set('phone', query.phone);
  if (!params.toString()) return null;

  const res = await api<{ match: CustomerMatch | null }>(
    `/api/v1/schedule/customers/lookup?${params.toString()}`
  );
  return res.match;
}
