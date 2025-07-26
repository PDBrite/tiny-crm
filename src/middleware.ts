import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { UserRoleType } from "@prisma/client";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Public paths that don't require authentication
  const publicPaths = ['/login', '/api/debug-env', '/api/test-auth'];
  
  // Admin-only paths
  const adminOnlyPaths = [
    '/users', 
    '/api/users',
    '/api/assign-districts-to-campaign'
  ];
  
  // Check if the pathname is a public path
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  // Check if the pathname is an admin-only path
  const isAdminOnlyPath = adminOnlyPaths.some(path => pathname.startsWith(path));
  
  // Allow NextAuth API routes
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // For client-side routes, let them handle authentication themselves
  if (pathname.startsWith('/districts') || pathname.startsWith('/leads') || pathname.startsWith('/dashboard')) {
    console.log(`Allowing client-side route ${pathname} to handle auth`);
    return NextResponse.next();
  }

  // Get token for other routes
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Debug output in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Middleware for ${pathname}, token:`, token ? 'exists' : 'null', 'isPublicPath:', isPublicPath);
    if (token) {
      console.log('Token details:', {
        sub: token.sub,
        email: token.email,
        role: token.user_role,
        exp: token.exp,
        iat: token.iat
      });
    }
  }

  // Redirect root to dashboard for authenticated users
  if (token && pathname === '/') {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Redirect unauthenticated users to login page if trying to access protected routes
  if (!token && !isPublicPath) {
    console.log(`Redirecting to login: no token for ${pathname}`);
    const loginUrl = new URL(`/login?callbackUrl=${encodeURIComponent(pathname)}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login page
  if (token && isPublicPath && pathname === '/login') {
    const homeUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(homeUrl);
  }
  
  // Check for admin-only paths
  if (token && isAdminOnlyPath && token.user_role !== UserRoleType.admin) {
    // Redirect non-admin users to dashboard if they try to access admin-only paths
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }
  
  // For API routes with user ID parameter, check if the user is admin or accessing their own data
  if (token && pathname.match(/\/api\/users\/([^\/]+)/)) {
    const pathParts = pathname.split('/');
    const userIdIndex = pathParts.findIndex(part => part === 'users') + 1;
    
    if (userIdIndex < pathParts.length) {
      const requestedUserId = pathParts[userIdIndex];
      
      // Allow if user is admin or accessing their own data
      if (token.user_role !== UserRoleType.admin && token.sub !== requestedUserId) {
        return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }

  console.log(`Middleware allowing access to ${pathname}`);
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