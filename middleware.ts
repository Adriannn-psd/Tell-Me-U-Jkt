import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/", "/login"];
const authApiPrefix = "/api/auth";

// Pages a guest may browse. These show public or dummy content only.
//
// `guest_mode` is set client-side in components/LoginPanel.tsx, so anyone can
// forge it from devtools. Treat it purely as a UX flag for "hasn't signed in
// yet" — never as a credential. Real data stays behind the per-route auth()
// checks in app/api/**, which this middleware deliberately does not stand in for.
const guestBrowsableRoutes = [
  "/home",
  "/karya",
  "/dokumentasi",
  "/radar",
  "/about",
];

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

  // API routes each call auth() themselves and answer with JSON, so let them
  // decide. This keeps the forgeable guest_mode cookie from ever satisfying an
  // API auth check, and avoids redirecting fetch() calls to an HTML login page.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Compare the value rather than using cookies.has(): sign-out clears this by
  // setting an empty value, which has() would still read as an active guest.
  const isGuest = req.cookies.get("guest_mode")?.value === "true";

  // Public routes — if logged in, redirect to home
  if (publicRoutes.includes(pathname)) {
    if (isLoggedIn || isGuest) {
      return NextResponse.redirect(new URL("/home", req.nextUrl));
    }
    // Usually it's better to let them stay on / so they can actually log in, so we do nothing here.
    return NextResponse.next();
  }

  if (isLoggedIn) {
    return NextResponse.next();
  }

  // Guests reach only the browsable subset; personal pages need a real session.
  const guestMayBrowse = guestBrowsableRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  if (isGuest && guestMayBrowse) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", req.nextUrl));
});

export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
