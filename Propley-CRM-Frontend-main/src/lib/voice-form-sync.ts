/** Live form sync while the voice engine collects slot fields (co-browsing) */
export const VOICE_FORM_SYNC_EVENT = 'propley_voice_form_sync';

export type VoiceFormSyncType = 'schedule-presentation' | 'add-customer';

export interface ScheduleFormSyncPayload {
  project?: string;
  client?: string;
  clientId?: string;
  phone?: string;
  date?: string;
  time?: string;
}

export interface CustomerFormSyncPayload {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  leadSource?: string;
  existingId?: string;
}

export interface VoiceFormSyncDetail {
  type: VoiceFormSyncType;
  payload: ScheduleFormSyncPayload | CustomerFormSyncPayload;
  phase: 'collecting' | 'preview';
}

export function emitVoiceFormSync(detail: VoiceFormSyncDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<VoiceFormSyncDetail>(VOICE_FORM_SYNC_EVENT, { detail }));
}

export function subscribeVoiceFormSync(handler: (detail: VoiceFormSyncDetail) => void) {
  if (typeof window === 'undefined') return () => undefined;
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<VoiceFormSyncDetail>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(VOICE_FORM_SYNC_EVENT, listener);
  return () => window.removeEventListener(VOICE_FORM_SYNC_EVENT, listener);
}
