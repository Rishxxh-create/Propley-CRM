import axios from "axios";
import { ApiError } from "@/lib/api/http-client";
import type {
  LoginRequest,
  LoginSuccessResponse,
  SessionSuccessResponse,
} from "@/lib/api/types/auth";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

/** Browser domain: login via Next.js route (`POST /api/auth/login`). */
export async function login(
  credentials: LoginRequest,
): Promise<LoginSuccessResponse> {
  try {
    const { data } = await axios.post<LoginSuccessResponse>(
      "/api/auth/login",
      credentials,
    );

    if (data.status !== "success" || !data.token || !data.user) {
      throw new ApiError("Invalid login response", 502);
    }

    // Save token for direct backend calls
    if (typeof window !== 'undefined') {
      localStorage.setItem('propley_auth_token', data.token);
      localStorage.setItem('propley_token', data.token); // Legacy compatibility
    }

    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ApiError(error.response.data.message || "Login failed", error.response.status);
    }
    throw error;
  }
}

let sessionCheckRequest: Promise<SessionSuccessResponse> | null = null;

/** Validates session via Next.js route (reads httpOnly auth cookies). */
export function checkSession(): Promise<SessionSuccessResponse> {
  if (sessionCheckRequest) return sessionCheckRequest;

  sessionCheckRequest = (async () => {
    try {
      const { data } = await axios.get<SessionSuccessResponse>("/api/auth/session");

      if (data.status !== "success" || !data.user) {
        throw new ApiError("Not authenticated", 401);
      }

      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new ApiError(error.response.data.message || "Not authenticated", error.response.status);
      }
      throw error;
    } finally {
      sessionCheckRequest = null;
    }
  })();

  return sessionCheckRequest;
}

/** Logout via Next.js route to clear cookies and localStorage. */
export async function logout(): Promise<void> {
  try {
    await axios.post("/api/auth/logout");
  } catch (error) {
    console.error('Logout request failed:', error);
  } finally {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('propley_auth_token');
      localStorage.removeItem('propley_token');
    }
  }
}

export async function registerRequest(payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  const res = await fetch(`${BACKEND_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as { status: string; data: AuthUser };
}
