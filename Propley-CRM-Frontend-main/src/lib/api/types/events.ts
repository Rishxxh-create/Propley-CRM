export type EventStatsResponse = {
  total_clients: number;
  active_clients: number;
  total_meetings: number;
  active_meetings: number;
  completed_meetings: number;
  total_engagement: number;
  total_attendees: number;
};

export type FunnelStatsResponse = {
  inquiry: number;
  vsv_scheduled: number;
  vsv_done: number;
  offer: number;
  negotiation: number;
  closed_won: number;
  closed_lost: number;
};

export type LeadSourceStat = {
  source: string;
  count: number;
};
export type LeadSourceStatsResponse = LeadSourceStat[];

export type CityStat = {
  city: string;
  count: number;
};
export type CityStatsResponse = CityStat[];

export type MeetingActivityEvent = {
  id: number;
  meeting_id: number;
  event_id: string;
  name: string;
  time: string;
  duration: number;
  user_name: string | null;
  user_mobile: string | null;
  user_title: string | null;
  meta?: Record<string, unknown>;
};

export type MeetingActivityPaginatedResponse = {
  data: MeetingActivityEvent[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type MeetingActivityResponse = MeetingActivityEvent[];

export type LiveStreamEvent = {
  id: number;
  meeting_id: number;
  event_id: string;
  name: string;
  time: string;
  duration: number;
  user_name: string | null;
  user_mobile: string | null;
  user_title: string | null;
  meeting_for: string;
};

export type LiveStreamResponse = LiveStreamEvent[];
