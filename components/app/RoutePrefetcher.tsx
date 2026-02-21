"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const prefetchTargets = [
  "/app",
  "/app/residents",
  "/app/calendar",
  "/app/attendance",
  "/app/notes",
  "/app/templates",
  "/app/care-plans",
  "/app/analytics",
  "/app/volunteers",
  "/app/reports",
  "/app/dashboard/budget-stock",
  "/app/dashboard/activity-feed",
  "/app/dashboard/settings"
] as const;

export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    const nav = window.navigator as Navigator & {
      connection?: {
        saveData?: boolean;
        effectiveType?: string;
      };
      deviceMemory?: number;
    };
    const shouldSkipPrefetch =
      Boolean(nav.connection?.saveData) ||
      nav.connection?.effectiveType === "2g" ||
      nav.connection?.effectiveType === "slow-2g" ||
      (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 8) ||
      window.navigator.hardwareConcurrency <= 8;
    if (shouldSkipPrefetch) {
      return;
    }

    const runPrefetch = () => {
      prefetchTargets.forEach((target, index) => {
        window.setTimeout(() => {
          try {
            router.prefetch(target);
          } catch {
            // Ignore prefetch issues; this is a best-effort performance helper.
          }
        }, index * 120);
      });
    };

    let idleId: number | null = null;
    const timer = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(() => runPrefetch(), { timeout: 1500 });
        return;
      }
      runPrefetch();
    }, 400);

    return () => {
      window.clearTimeout(timer);
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [router]);

  return null;
}
