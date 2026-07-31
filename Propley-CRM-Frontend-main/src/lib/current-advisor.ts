import { TEAM_MEMBERS } from '@/lib/mock-data';

export const CURRENT_ADVISOR_KEY = 'propley_current_advisor';

export function getCurrentAdvisorId(): string {
  if (typeof window === 'undefined') return 'tm-001';
  return localStorage.getItem(CURRENT_ADVISOR_KEY) ?? 'tm-001';
}

export function setCurrentAdvisorId(id: string) {
  localStorage.setItem(CURRENT_ADVISOR_KEY, id);
  window.dispatchEvent(new Event('propley_current_advisor_updated'));
}

export function getCurrentAdvisorName(): string {
  const id = getCurrentAdvisorId();
  return TEAM_MEMBERS.find((m) => m.id === id)?.name ?? 'Priya Sharma';
}

export function subscribeCurrentAdvisor(onChange: () => void) {
  const handle = () => onChange();
  window.addEventListener('propley_current_advisor_updated', handle);
  return () => window.removeEventListener('propley_current_advisor_updated', handle);
}
