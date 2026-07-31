import type { AuthUser } from '@/lib/api/types/auth';
import type { NextResponse } from 'next/server';

export const AUTH_TOKEN_COOKIE = 'propley_auth_token';
export const AUTH_USER_COOKIE = 'propley_auth_user';

const MAX_AGE_SEC = 60 * 60 * 7; // 7 days

export function applyAuthCookies(
  response: NextResponse,
  token: string,
  user: AuthUser,
): NextResponse {
  const secure = process.env.NODE_ENV === 'production';

  response.cookies.set(AUTH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SEC,
  });

  response.cookies.set(AUTH_USER_COOKIE, JSON.stringify(user), {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SEC,
  });

  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set(AUTH_TOKEN_COOKIE, '', { path: '/', maxAge: 0 });
  response.cookies.set(AUTH_USER_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}

export function parseAuthUserCookie(raw: string | undefined): AuthUser | null {
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as AuthUser;
    if (
      typeof user.id !== 'number' ||
      typeof user.email !== 'string' ||
      typeof user.name !== 'string'
    ) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}
