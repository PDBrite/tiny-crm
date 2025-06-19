import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const pathname = request.nextUrl.pathname;
  
  // Public paths that don't require authentication
  const publicPaths = ['/login'];
  
  // Check if the pathname is a public path
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Redirect root to dashboard for authenticated users
  if (token && pathname === '/') {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Redirect unauthenticated users to login page if trying to access protected routes
  if (!token && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login page
  if (token && isPublicPath) {
    const homeUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

// Configure which routes to run the middleware on
export const config = {
  // Match all routes except for:
  // - API routes (/api/, /trpc/)
  // - Static files (/_next/, /static/, /favicon.ico, etc.)
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ],
}; 