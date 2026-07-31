export interface ApiSchedule {
  id: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'rescheduled' | 'canceled' | string;
  calendar_event_id: string;
  meeting_uuid: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  room_link?: string;
}

export interface CreateSchedulePayload {
  client_name: string;
  client_email: string;
  client_phone: string;
  project_id?: number | null;
  start_time: string;
}

export interface ReschedulePayload {
  start_time: string;
}
