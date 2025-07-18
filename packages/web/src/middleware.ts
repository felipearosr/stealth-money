import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isClerkConfigured = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && 
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder');

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/transfer/new(.*)',
  '/profile(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // If Clerk is not configured, allow all routes
  if (!isClerkConfigured) {
    return NextResponse.next();
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};