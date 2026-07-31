import { getActiveStore } from '@/store';
import { readPresentations } from '@/lib/presentations-store';
import { readCustomers } from '@/lib/customers-store';
import type { StoredMeeting, Customer } from '@/lib/mock-data';
import type { EventStatsResponse } from '@/lib/api/types/events';

export function presentations(): StoredMeeting[] {
  const fromApi = getActiveStore()?.getState().meetings.list ?? [];
  if (fromApi.length > 0) return fromApi;
  return readPresentations();
}

export function customers(): Customer[] {
  return readCustomers();
}

export function presentationsSettled(): boolean {
  const status = getActiveStore()?.getState().meetings.listStatus;
  if (status === 'loaded' || status === 'error') return true;
  return readPresentations().length > 0;
}

export async function settledPresentations(timeoutMs = 1200): Promise<StoredMeeting[] | null> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (presentationsSettled()) return presentations();
    if (Date.now() >= deadline) return null;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
}

export function eventStats(): EventStatsResponse | null {
  return getActiveStore()?.getState().events.stats ?? null;
}
