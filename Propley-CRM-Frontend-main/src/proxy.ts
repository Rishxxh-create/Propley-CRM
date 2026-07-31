import { AUTH_TOKEN_COOKIE } from '@/lib/auth-cookies';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isPublicPath(pathname: string): boolean {
  if (pathname === '/auth') return true;
  if (pathname.startsWith('/moderator/')) return true;
  if (pathname.startsWith('/participant/')) return true;
  return false;
}

function isDashboardPath(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname.startsWith('/meetings')) return true;
  if (pathname.startsWith('/customers')) return true;
  if (pathname.startsWith('/admin')) return true;
  if (pathname.startsWith('/settings')) return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;

  if (pathname === '/auth') {
    if (token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!isDashboardPath(pathname) || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/auth', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/auth',
    '/meetings/:path*',
    '/customers/:path*',
    '/admin/:path*',
    '/settings/:path*',
  ],
};
