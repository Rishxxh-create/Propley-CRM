import { clearAuthCookies } from '@/lib/auth-cookies';
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ status: 'success' });
  return clearAuthCookies(response);
}
