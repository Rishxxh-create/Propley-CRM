import type { AuthUser } from '@/lib/api/types/auth';

export const AUTH_USER_KEY = 'propley_auth_user';

/** Mirror user to localStorage for dashboard UI (token lives in httpOnly cookie). */
export function setAuthSession(_token: string, user: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('propley_auth_updated'));
}

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getLoggedInDisplayName(): string | null {
  const name = getAuthUser()?.name?.trim();
  return name || null;
}

export function subscribeAuthSession(onChange: () => void) {
  const handle = () => onChange();
  window.addEventListener('propley_auth_updated', handle);
  return () => window.removeEventListener('propley_auth_updated', handle);
}

export async function clearAuthSession(): Promise<void> {
  if (typeof window === 'undefined') return;
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  localStorage.removeItem(AUTH_USER_KEY);
  window.dispatchEvent(new Event('propley_auth_updated'));
}
