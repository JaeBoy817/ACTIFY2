import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isClerkBackendConfigured } from "@/lib/clerk-config";

const isProtectedRoute = createRouteMatcher([
  "/app(.*)",
  "/dashboard(.*)",
  "/calendar(.*)",
  "/calendar-creation(.*)",
  "/documentation(.*)",
  "/residents(.*)",
  "/analytics(.*)",
  "/care-plan(.*)",
  "/care-plans(.*)",
  "/attendance(.*)",
  "/settings(.*)",
  "/notes(.*)",
  "/templates(.*)",
  "/volunteers(.*)"
]);

const protectedMiddleware = clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  const isProtected = isProtectedRoute(req);

  if (!isProtected) {
    if (process.env.NODE_ENV === "development" && pathname.startsWith("/sign-")) {
      console.info(`[middleware][auth] public route: ${pathname}`);
    }
    return NextResponse.next();
  }

  const { userId } = await auth();
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    const intendedPath = `${pathname}${req.nextUrl.search}`;
    signInUrl.searchParams.set("redirect_url", intendedPath);

    if (process.env.NODE_ENV === "development") {
      console.info(`[middleware][auth] redirecting unauthenticated request ${pathname} -> ${signInUrl.pathname}`);
    }

    return NextResponse.redirect(signInUrl);
  }

  if (process.env.NODE_ENV === "development") {
    console.info(`[middleware][auth] allowing authenticated request: ${pathname}`);
  }

  if (pathname.startsWith("/app/settings")) {
    const settingsUrl = new URL("/settings", req.url);
    settingsUrl.search = req.nextUrl.search;
    if (pathname.startsWith("/app/settings/profile") && !settingsUrl.searchParams.has("section")) {
      settingsUrl.searchParams.set("section", "profile");
    }
    if (pathname.startsWith("/app/settings/roles") && !settingsUrl.searchParams.has("section")) {
      settingsUrl.searchParams.set("section", "team");
    }
    return NextResponse.redirect(settingsUrl);
  }

  const allowedAppWorkspaceRoutes = ["/app/attendance"];

  // Keep legacy /app/* modules collapsed to the assistant, but allow active
  // workspace pages that have dedicated implementations to render normally.
  if (pathname.startsWith("/app/") && !allowedAppWorkspaceRoutes.some((route) => pathname.startsWith(route))) {
    const assistantUrl = new URL("/app", req.url);
    assistantUrl.search = req.nextUrl.search;
    return NextResponse.redirect(assistantUrl);
  }

  // Subscription gating remains server-side in app layouts/pages (DB-backed source of truth).
  return NextResponse.next();
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const pathname = req.nextUrl.pathname;

  // Avoid edge crashes in environments where Clerk keys are not configured yet.
  if (!isClerkBackendConfigured) {
    if (pathname.startsWith("/app") || pathname.startsWith("/dashboard") || pathname.startsWith("/settings")) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("auth", "unconfigured");
      return NextResponse.redirect(signInUrl);
    }

    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        {
          error: "Authentication is not configured. Add Clerk environment variables."
        },
        { status: 503 }
      );
    }

    return NextResponse.next();
  }
  return protectedMiddleware(req, event);
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"]
};
