"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";

const PERF_ENDPOINT = process.env.NEXT_PUBLIC_PERF_LOG_ENDPOINT;

function maybeSendMetric(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  if (process.env.NODE_ENV === "development") {
    // Keep local visibility lightweight without external tooling.
    console.info("[ACTIFY perf]", payload);
  }

  if (!PERF_ENDPOINT) return;
  try {
    navigator.sendBeacon(PERF_ENDPOINT, JSON.stringify(payload));
  } catch {
    // Swallow telemetry errors.
  }
}

export function PerformanceReporter() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = window.navigator as Navigator & {
      connection?: {
        saveData?: boolean;
        effectiveType?: string;
      };
      deviceMemory?: number;
    };
    const lowPower =
      Boolean(nav.connection?.saveData) ||
      nav.connection?.effectiveType === "2g" ||
      nav.connection?.effectiveType === "slow-2g" ||
      (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 8) ||
      window.navigator.hardwareConcurrency <= 8;
    if (lowPower) {
      document.body.dataset.perfMode = "low-power";
      return;
    }
    delete document.body.dataset.perfMode;
  }, []);

  useReportWebVitals((metric) => {
    maybeSendMetric({
      type: "web-vital",
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      route: pathname
    });
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof performance === "undefined") return;

    const target = window.sessionStorage.getItem("actify-nav-target");
    const startRaw = window.sessionStorage.getItem("actify-nav-start");
    if (!target || !startRaw) return;
    if (!(pathname === target || pathname.startsWith(`${target}/`))) return;

    const start = Number(startRaw);
    if (!Number.isFinite(start)) return;

    const raf = window.requestAnimationFrame(() => {
      const durationMs = performance.now() - start;
      maybeSendMetric({
        type: "navigation",
        route: pathname,
        durationMs: Number(durationMs.toFixed(1))
      });
      window.sessionStorage.removeItem("actify-nav-target");
      window.sessionStorage.removeItem("actify-nav-start");
    });

    return () => window.cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
