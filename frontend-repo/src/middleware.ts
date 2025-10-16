import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Get the session cookie from Appwrite
  const sessionCookie = request.cookies.get("session_id"); // almahdia is my project ID

  // Debug: Log session cookie details
  console.log("Session cookie found:", !!sessionCookie);
  console.log(
    "Session cookie value:",
    sessionCookie?.value?.substring(0, 20) + "..."
  );

  // Define protected routes and auth routes
  const protectedRoutes = [
    "/new",
    "/record",
    /^\/dashboard\/?.*$/, // matches any subpath of /dashboard
    "/dashboard",
  ];
  const authRoutes = ["/login", "/signup", "/forgot-pwd", "/reset-pwd"];

  const isProtectedRoute = protectedRoutes.some((route) => {
    if (typeof route === "string") {
      return pathname.startsWith(route);
    } else {
      return route.test(pathname);
    }
  });

  const isAuthRoute = authRoutes.some((route) => pathname === route);

  console.log("Pathname:", pathname);
  console.log("Is protected route:", isProtectedRoute);
  console.log("Is auth route:", isAuthRoute);

  // If accessing protected route without session, redirect to login
  if (isProtectedRoute && !sessionCookie) {
    console.log("Redirecting to login: No session cookie");
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing auth routes while logged in, redirect to dashboard
  if (isAuthRoute && sessionCookie) {
    console.log("Redirecting to dashboard: User already logged in");
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Verify session with JWT
  if (isProtectedRoute && sessionCookie) {
    console.log("Verifying session with JWT...");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/verifyJWT`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: sessionCookie.value }),
        }
      );

      console.log("API response status:", response.status);
      const responseJson = await response.json();
      console.log(responseJson);
      if (!response.ok && responseJson.success === false) {
        console.log("Session verification failed - invalid session");
        // Session is invalid, redirect to login
        const loginUrl = new URL("/login", request.url);
        const redirectResponse = NextResponse.redirect(loginUrl);
        redirectResponse.cookies.delete("session_id");
        return redirectResponse;
      } else {
        console.log("Session verification successful");
      }
    } catch (error) {
      console.error("Session verification failed with error:", error);
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  console.log("Allowing request to continue");
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/signup", "/new", "/plans", "/forgot-pwd", "/reset-pwd"],
};
