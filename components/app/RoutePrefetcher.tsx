"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const prefetchTargets = [
  "/app",
  "/app/residents",
  "/app/calendar",
  "/app/reports",
  "/app/settings",
  "/app/dashboard/budget-stock"
] as const;

export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      for (const target of prefetchTargets) {
        try {
          router.prefetch(target);
        } catch {
          // Ignore prefetch issues; this is a best-effort performance helper.
        }
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [router]);

  return null;
}
