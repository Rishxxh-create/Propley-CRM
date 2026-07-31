import { applyAuthCookies } from '@/lib/auth-cookies';
import { ApiError, loginWithBackend } from '@/lib/api/auth-server';
import type { LoginRequest } from '@/lib/api/types/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  let body: LoginRequest;
  try {
    body = (await request.json()) as LoginRequest;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json(
      { message: 'email and password are required' },
      { status: 400 }
    );
  }

  try {
    const result = await loginWithBackend({ email, password });
    const response = NextResponse.json(result);
    return applyAuthCookies(response, result.token, result.user);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { message: err.message, ...err.body },
        { status: err.status }
      );
    }
    return NextResponse.json({ message: 'Login service unavailable' }, { status: 502 });
  }
}
