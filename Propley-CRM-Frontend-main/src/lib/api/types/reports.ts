export interface AdvisorReportEntry {
  advisor: string;
  meetings: number;
  engagement: number;
  clients_reached: number;
}

export type AdvisorReportResponse = AdvisorReportEntry[];

export interface MeetingEngagementDist {
  meeting_id: number;
  meeting_for: string;
  engagement: number;
}

export interface MeetingInteractionDist {
  meeting_id: number;
  interactions: number;
}

export interface DashboardActivity {
  type: string;
  title: string;
  description: string;
  created_at: string;
}

export type DashboardActivitiesResponse = DashboardActivity[];

export interface MeetingsReportResponse {
  total: number;
  active: number;
  completed: number;
  engagement_distribution: MeetingEngagementDist[];
  interaction_distribution: MeetingInteractionDist[];
}
