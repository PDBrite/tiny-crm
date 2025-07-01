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
  const publicPaths = ['/login', '/api/debug-env', '/api/test-auth'];
  
  // Check if the pathname is a public path
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  // Allow NextAuth API routes
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Debug output in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Middleware for ${pathname}, token:`, token ? 'exists' : 'null', 'isPublicPath:', isPublicPath);
  }

  // Redirect root to dashboard for authenticated users
  if (token && pathname === '/') {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Redirect unauthenticated users to login page if trying to access protected routes
  if (!token && !isPublicPath) {
    const loginUrl = new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login page
  if (token && isPublicPath && pathname === '/login') {
    const homeUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

// Configure which routes to run the middleware on
export const config = {
  // Match all routes except for:
  // - Static files (_next/, static/, favicon.ico, etc.)
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ],
}; 