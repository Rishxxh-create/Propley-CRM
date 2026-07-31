import { getBackendBaseUrl } from '@/lib/api/config';
import { createHttpClient } from '@/lib/api/http-client';

/** Shared server-only Axios client → `NEXT_BACKEND_URL`. */
export const backendClient = createHttpClient({
  baseURL: getBackendBaseUrl(),
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});
