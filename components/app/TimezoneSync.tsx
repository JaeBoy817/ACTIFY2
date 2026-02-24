"use client";

import { useEffect } from "react";

const COOKIE_NAME = "actify_tz";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function setTimezoneCookie(timeZone: string) {
  const encoded = encodeURIComponent(timeZone);
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${encoded}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

export function TimezoneSync() {
  useEffect(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browserTz) return;
    setTimezoneCookie(browserTz);
  }, []);

  return null;
}
