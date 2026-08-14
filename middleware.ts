import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/login"];
const authApiPrefix = "/api/auth";

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Allow auth API routes
  if (pathname.startsWith(authApiPrefix)) {
    return NextResponse.next();
  }

  // Allow static assets & Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$/)
  ) {
    return NextResponse.next();
  }

  const isGuest = req.cookies.has("guest_mode");

  // Public routes — if logged in, redirect to home
  if (publicRoutes.includes(pathname)) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    // Also if they are already in guest mode, maybe redirect them to home? Or let them view /login to relogin
    // Usually it's better to let them stay on /login so they can actually log in, so we do nothing here.
    return NextResponse.next();
  }

  // Protected routes — if not logged in and not guest, redirect to login
  if (!isLoggedIn && !isGuest) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
