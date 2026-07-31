import { readCustomers } from '@/lib/customers-store';
import { parseTimeValue, to24HourTime } from '@/lib/presentation-templates';
import { resolveClientName, resolveScheduleDate } from '@/services/ai-engine/voice-agent-flow';
import type { CommandArgs } from '@/types/voice-agent';
import type { ScheduleFormSyncPayload } from '@/lib/voice-form-sync';

export interface ScheduleFormState {
  project: string;
  client: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerCity: string;
  customerLeadSource: string;
  date: Date | undefined;
  time: string;
}

export function schedulePayloadFromArgs(args: CommandArgs): ScheduleFormSyncPayload {
  const { name: clientName, id: clientId } = resolveClientName(args);
  return {
    project: args.project,
    client: clientName,
    clientId,
    phone: typeof args.phone === 'string' ? args.phone : undefined,
    date: args.date,
    time: args.time,
  };
}

export function mergeScheduleFormData(
  prev: ScheduleFormState,
  payload: ScheduleFormSyncPayload
): { next: ScheduleFormState; customerType: 'existing' | 'new' } {
  const next = { ...prev };
  let customerType: 'existing' | 'new' = 'existing';

  if (payload.project?.trim()) {
    next.project = payload.project.trim();
  }
  if (payload.clientId) {
    next.client = payload.clientId;
    customerType = 'existing';
  } else if (payload.client?.trim()) {
    const match = readCustomers().find(
      (c) =>
        c.name.toLowerCase() === payload.client!.trim().toLowerCase() ||
        c.name.toLowerCase().includes(payload.client!.trim().toLowerCase())
    );
    if (match) {
      next.client = match.id;
      customerType = 'existing';
    } else {
      next.customerName = payload.client.trim();
      customerType = 'new';
    }
  }
  if (payload.phone?.trim()) {
    next.customerPhone = payload.phone.trim();
  }
  if (payload.date?.trim()) {
    next.date = resolveScheduleDate(payload.date);
  }
  if (payload.time?.trim()) {
    const parts = parseTimeValue(payload.time);
    next.time = to24HourTime(parts.hour12, parts.minute, parts.period);
  }

  return { next, customerType };
}
