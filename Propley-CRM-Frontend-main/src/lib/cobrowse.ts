/** Cross-surface sync when the voice engine mutates CRM / presentation data */
export const COBROWSE_EVENT = 'propley_cobrowse';

export type CobrowseAction =
  | 'presentation-created'
  | 'presentation-updated'
  | 'customer-created'
  | 'customer-updated'
  | 'schedule-draft-sync'
  | 'navigate'
  | 'filter-applied'
  | 'moderator-state'
  | 'client-section';

export interface CobrowseDetail {
  action: CobrowseAction;
  payload?: Record<string, unknown>;
}

export function emitCobrowse(action: CobrowseAction, payload?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<CobrowseDetail>(COBROWSE_EVENT, {
      detail: { action, payload },
    })
  );
}

export function subscribeCobrowse(handler: (detail: CobrowseDetail) => void) {
  if (typeof window === 'undefined') return () => undefined;
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<CobrowseDetail>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(COBROWSE_EVENT, listener);
  return () => window.removeEventListener(COBROWSE_EVENT, listener);
}
