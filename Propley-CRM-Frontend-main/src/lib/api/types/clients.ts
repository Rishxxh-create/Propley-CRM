export interface ApiClient {
  id: number | string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  status: string | null;
  deal_stage: string | null;
  lead_source: string | null;
  assigned_advisor_id: string | null;
  last_meeting: string | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
  deal_value?: number | null;
  follow_up_date?: string | null;
}

export interface ApiClientActivity {
  id: number;
  client_id: number;
  type: string;
  title: string;
  description: string;
  meta?: Record<string, any>;
  created_by: number;
  created_at: string;
}

export interface ApiClientWithActivities extends ApiClient {
  activities?: ApiClientActivity[];
}

export interface ApiClientsResponse {
  clients: ApiClient[];
  match?: ApiClient | null;
}
