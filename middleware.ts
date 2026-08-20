import { auth } from "@/auth";
import { INTRO_COOKIE, INTRO_VERSION } from "@/lib/intro";
import { NextRequest, NextResponse } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/", "/login"];
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

  // API routes each call auth() themselves and answer with JSON, so let them
  // decide. This is where access to real data is enforced, which keeps the
  // guest_mode cookie below from ever standing in for a session, and avoids
  // redirecting fetch() calls to an HTML login page.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // A UX flag only, set client-side in components/LoginPanel.tsx — anyone can
  // forge it, so it gates nothing but page navigation. Guests browse the page
  // shells (dummy content) and components/GuestAuthPopup.tsx prompts them to
  // sign in when they attempt a real action.
  //
  // Compare the value rather than using cookies.has(): sign-out clears this by
  // setting an empty value, which has() would still read as an active guest.
  const isGuest = req.cookies.get("guest_mode")?.value === "true";

  if (publicRoutes.includes(pathname)) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/home", req.nextUrl));
    }
    // Send guests past the landing page, but let them open /login so they can
    // still upgrade to a real account instead of being bounced back to /home.
    if (isGuest && pathname === "/") {
      return NextResponse.redirect(new URL("/home", req.nextUrl));
    }
    // The landing page is a one-time 38 MB scroll animation. Once someone has
    // watched it, skip straight to the login form — reading the flag here rather
    // than client-side means no flash of the landing page before the redirect.
    // The cookie name carries a version, so bumping it replays the animation for
    // everyone without having to clear anything in their browser.
    if (
      pathname === "/" &&
      req.cookies.get(INTRO_COOKIE)?.value === INTRO_VERSION
    ) {
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }
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
