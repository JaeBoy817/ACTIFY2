import { cookies, headers } from "next/headers";

import { resolveTimeZone } from "@/lib/timezone";

export const ACTIFY_TIMEZONE_COOKIE = "actify_tz";

function sanitizeTimeZone(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 100) return null;
  return trimmed;
}

function readTimeZoneFromRequest() {
  try {
    const cookieStore = cookies();
    const cookieValue = cookieStore.get(ACTIFY_TIMEZONE_COOKIE)?.value;
    const decoded = sanitizeTimeZone(cookieValue ? decodeURIComponent(cookieValue) : null);
    if (decoded) return decoded;
  } catch {
    // Request context not available.
  }

  try {
    const requestHeaders = headers();
    const headerValue = sanitizeTimeZone(requestHeaders.get("x-actify-timezone"));
    if (headerValue) return headerValue;

    // Vercel geo fallback for first render before browser cookie is set.
    const vercelGeo = sanitizeTimeZone(requestHeaders.get("x-vercel-ip-timezone"));
    if (vercelGeo) return vercelGeo;
  } catch {
    // Request context not available.
  }

  return null;
}

export function getRequestTimeZone(fallback?: string | null) {
  const requestTimeZone = readTimeZoneFromRequest();
  if (requestTimeZone) {
    return resolveTimeZone(requestTimeZone);
  }
  return resolveTimeZone(fallback);
}
