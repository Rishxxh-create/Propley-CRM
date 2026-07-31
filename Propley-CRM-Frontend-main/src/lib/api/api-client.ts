import { createHttpClient } from '@/lib/api/http-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

/**
 * Direct API Client that communicates with the backend, bypassing Next.js API routes.
 * It automatically injects the `propley_auth_token` from localStorage if available.
 */
export const apiClient = createHttpClient({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach the auth token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    // Only access localStorage in the browser environment
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('propley_auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);
