import {
  AUTH_TOKEN_COOKIE,
  AUTH_USER_COOKIE,
  parseAuthUserCookie,
} from '@/lib/auth-cookies';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  const user = parseAuthUserCookie(cookieStore.get(AUTH_USER_COOKIE)?.value);

  if (!token || !user) {
    return NextResponse.json({ status: 'unauthenticated' }, { status: 401 });
  }

  return NextResponse.json({ status: 'success', user });
}
