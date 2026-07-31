export type ApiMeetingAnalytics = {
  last_activity?: string;
  synthesized_at?: string;
  unique_clients?: number;
  content_engagement?: number;
  total_interactions?: number;
};

export type ApiMeeting = {
  id: number;
  uuid: string;
  moderator_id?: number;
  start_time: string;
  duration?: number;
  meeting_for?: string;
  state?: Record<string, unknown>;
  analytics?: ApiMeetingAnalytics;
  is_active?: boolean;
  completed_at?: string | null;
  enablex_room_id?: string | null;
  recording_url?: string | null;
  transcript?: string | null;
  notes?: unknown[];
  moderator_name: string;
  client_count?: string;
  client_name?: string;
};

export type ApiMeetingsAllResponse = ApiMeeting[];

export type ApiMeetingMetadata = {
  id: number;
  uuid: string;
  start_time: string;
  duration?: number;
  enablex_room_id?: string | null;
  notes?: unknown[];
  transcript?: string | null;
  moderator_name: string | null;
  salesMember?: string;
  analytics?: ApiMeetingAnalytics;
  state?: Record<string, unknown>;
  meeting_for?: string;
  is_active?: boolean;
  completed_at?: string | null;
  recording_url?: string | null;
  client_count?: string;
  client_name?: string;
};
