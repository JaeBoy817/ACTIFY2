import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isClerkBackendConfigured } from "@/lib/clerk-config";

const isProtectedRoute = createRouteMatcher(["/app(.*)"]);

const protectedMiddleware = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const pathname = req.nextUrl.pathname;

  // Avoid edge crashes in environments where Clerk keys are not configured yet.
  if (!isClerkBackendConfigured) {
    if (pathname.startsWith("/app")) {
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
