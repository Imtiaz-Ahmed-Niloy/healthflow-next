import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { homePathForRole, type AppRole } from "@/lib/auth/permissions";

/**
 * Server-side route protection. Before this existed there was none at all —
 * every panel was reachable by typing the URL, and the only thing standing
 * between a patient and the super admin panel was the navigation not linking
 * to it.
 *
 * This is a second line of defence, not the only one. Data is protected by
 * RLS regardless of what gets rendered.
 */

const ROUTE_ROLES: { prefix: string; roles: AppRole[] }[] = [
  { prefix: "/super", roles: ["super_admin"] },
  {
    prefix: "/admin",
    roles: [
      "super_admin",
      "hospital_admin",
      "hr_admin",
      "finance_admin",
      "lab_admin",
      "pharmacy_admin",
    ],
  },
  { prefix: "/portal", roles: ["super_admin", "doctor"] },
  { prefix: "/patient", roles: ["super_admin", "patient"] },
];

/** Signed-in users have no business back on the sign-in screen. */
const AUTH_PAGES = ["/signin", "/signup", "/forgot-password", "/reset-password"];

export const middleware = async (request: NextRequest) => {
  const { response, userId, role } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const guarded = ROUTE_ROLES.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );

  if (guarded) {
    if (!userId) {
      const signIn = request.nextUrl.clone();
      signIn.pathname = "/signin";
      // Send them back where they were trying to go once they are in.
      signIn.searchParams.set("next", pathname);
      return NextResponse.redirect(signIn);
    }

    if (!role || !guarded.roles.includes(role)) {
      // Bounce to their own panel rather than showing a dead end. A patient
      // typing /super gets their dashboard, not a 403 they cannot act on.
      const home = request.nextUrl.clone();
      home.pathname = homePathForRole(role);
      home.search = "";
      return NextResponse.redirect(home);
    }
  }

  if (userId && AUTH_PAGES.includes(pathname)) {
    const home = request.nextUrl.clone();
    home.pathname = homePathForRole(role);
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
};

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. The session still has
     * to be refreshed on public pages, so this cannot be narrowed to just the
     * guarded prefixes — skipping them would let the refresh token expire
     * while someone reads the marketing site.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
