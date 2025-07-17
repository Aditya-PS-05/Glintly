import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // If user is not authenticated and trying to access protected routes
    if (!req.nextauth.token && req.nextUrl.pathname.startsWith("/projects")) {
      return NextResponse.redirect(new URL("/auth/signin", req.url))
    }

    // If user is authenticated and trying to access auth pages, redirect to home
    if (req.nextauth.token && req.nextUrl.pathname.startsWith("/auth")) {
      return NextResponse.redirect(new URL("/", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages without token
        if (req.nextUrl.pathname.startsWith("/auth")) {
          return true
        }
        
        // Allow access to home page without token
        if (req.nextUrl.pathname === "/") {
          return true
        }

        // Allow access to API routes
        if (req.nextUrl.pathname.startsWith("/api")) {
          return true
        }

        // Require token for protected routes
        if (req.nextUrl.pathname.startsWith("/projects")) {
          return !!token
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}