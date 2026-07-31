const DEFAULT_BACKEND_URL = 'http://localhost:5001';

/** Server-only backend origin (Route Handlers, server components). */
export function getBackendBaseUrl(): string {
  return (process.env.NEXT_BACKEND_URL ?? DEFAULT_BACKEND_URL).replace(/\/$/, '');
}

