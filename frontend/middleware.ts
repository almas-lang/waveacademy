import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Server-side auth middleware.
 * Checks for the presence of the auth cookie before rendering protected pages.
 * This is a lightweight check — the backend still validates the token on every API call.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // Protected routes: /admin/* and /learner/*
  const isAdminRoute = pathname.startsWith('/admin');
  const isLearnerRoute = pathname.startsWith('/learner');

  if ((isAdminRoute || isLearnerRoute) && !token) {
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/learner/:path*'],
};
