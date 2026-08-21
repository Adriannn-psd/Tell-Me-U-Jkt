import { auth } from "@/auth";
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

  // Allow static assets & Next.js internals.
  //
  // Media (mp3/mp4/…) HARUS ada di daftar ini. Tanpa itu, "/voice/welcome.mp3"
  // dianggap route terlindungi dan dijawab redirect ke /login — permintaannya
  // tetap 200, tapi isinya HTML halaman login, jadi audio-nya gagal diputar
  // tanpa satu pun error yang kelihatan. Sama halnya untuk file .mp4 di public/.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(
      /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|mp3|m4a|ogg|opus|wav|mp4|webm)$/
    )
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
    // The landing animation used to be gated behind a "tmuj_intro_seen" cookie
    // so nobody watched it twice. That gate is gone on purpose: it is now meant
    // to play on every visit to "/" — including right after signing out, which
    // is why the logout button in components/Header.tsx lands here instead of
    // on /login. Repeat plays cost almost nothing: every frame is served with a
    // one-year immutable Cache-Control (see next.config.ts), so the second visit
    // reads them from disk without touching the network, and a "Lewati animasi"
    // button appears three seconds in for anyone who does not want to sit
    // through it.
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
