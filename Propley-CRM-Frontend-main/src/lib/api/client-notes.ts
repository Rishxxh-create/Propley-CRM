import { apiClient } from '@/lib/api/api-client';

export interface ApiClientNote {
  id: number;
  client_id: number;
  body: string;
  author: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface ApiClientNotesResponse {
  notes: ApiClientNote[];
}

export async function fetchClientNotes(clientId: string, signal?: AbortSignal): Promise<ApiClientNote[]> {
  const { data } = await apiClient.get<ApiClientNotesResponse>(`/api/v1/clients/${clientId}/notes`, { signal });
  return data.notes || [];
}

export async function createClientNote(clientId: string, body: string, author: string): Promise<ApiClientNote> {
  const { data } = await apiClient.post<ApiClientNote>(`/api/v1/clients/${clientId}/notes`, {
    body,
    author,
  });
  return data;
}

export async function updateClientNote(clientId: string, noteId: number, body: string): Promise<ApiClientNote> {
  const { data } = await apiClient.put<ApiClientNote>(`/api/v1/clients/${clientId}/notes/${noteId}`, {
    body,
  });
  return data;
}

export async function deleteClientNote(clientId: string, noteId: number): Promise<void> {
  await apiClient.delete(`/api/v1/clients/${clientId}/notes/${noteId}`);
}
