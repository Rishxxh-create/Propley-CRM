import { apiClient } from '@/lib/api/api-client';
import { ApiError } from '@/lib/api/http-client';
import type { Customer, CustomerStatus, DealStage } from '@/lib/mock-data';
import type { ApiClient, ApiClientsResponse } from '@/lib/api/types/clients';

const PATH = '/api/v1/clients';

const VALID_STATUSES: CustomerStatus[] = ['Active', 'Pending', 'Completed'];
const VALID_DEAL_STAGES: DealStage[] = ['inquiry', 'vsv_scheduled', 'vsv_done', 'offer', 'negotiation', 'closed_won', 'closed_lost'];

function mapClient(row: ApiClient): Customer {
  const status = VALID_STATUSES.includes(row.status as CustomerStatus)
    ? (row.status as CustomerStatus)
    : 'Active';
    
  let dealStage: DealStage = 'inquiry';
  if (VALID_DEAL_STAGES.includes(row.deal_stage as DealStage)) {
    dealStage = row.deal_stage as DealStage;
  }

  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone ?? '',
    city: row.city ?? '—',
    lastMeeting: row.last_meeting ?? 'Not yet scheduled',
    status,
    assignedAdvisorId: row.assigned_advisor_id ?? '',
    dealStage,
    leadSource: row.lead_source ?? undefined,
    dealValue: row.deal_value ?? undefined,
    followUpDate: row.follow_up_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Customer fields → backend client payload (snake_case). Skips undefined keys. */
function toPayload(patch: Partial<Customer>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.email !== undefined) body.email = patch.email;
  if (patch.phone !== undefined) body.phone = patch.phone;
  if (patch.city !== undefined) body.city = patch.city;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.dealStage !== undefined) {
    body.deal_stage = patch.dealStage;
  }
  if (patch.leadSource !== undefined) body.lead_source = patch.leadSource;
  if (patch.assignedAdvisorId !== undefined) body.assigned_advisor_id = patch.assignedAdvisorId;
  if (patch.lastMeeting !== undefined) body.last_meeting = patch.lastMeeting;
  if (patch.dealValue !== undefined) body.deal_value = patch.dealValue;
  if (patch.followUpDate !== undefined) body.follow_up_date = patch.followUpDate;
  return body;
}

export async function fetchClients(signal?: AbortSignal): Promise<Customer[]> {
  const { data } = await apiClient.get<ApiClientsResponse>(PATH, { signal });
  if (!data || !Array.isArray(data.clients)) {
    throw new ApiError('Invalid clients response', 502);
  }
  return data.clients.map(mapClient);
}

export async function fetchClientById(id: string, signal?: AbortSignal): Promise<import('./types/clients').ApiClientWithActivities> {
  const { data } = await apiClient.get<import('./types/clients').ApiClientWithActivities>(`${PATH}/${id}`, { signal });
  return data;
}

export async function createClient(patch: Partial<Customer>): Promise<Customer> {
  const { data } = await apiClient.post<ApiClient>(PATH, toPayload(patch));
  return mapClient(data);
}

export async function updateClient(id: string, patch: Partial<Customer>): Promise<Customer> {
  const { data } = await apiClient.put<ApiClient>(`${PATH}/${id}`, toPayload(patch));
  return mapClient(data);
}

export async function deleteClient(id: string): Promise<void> {
  await apiClient.delete(`${PATH}/${id}`);
}
