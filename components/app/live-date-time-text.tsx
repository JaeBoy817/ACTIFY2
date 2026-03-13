"use client";

import { useMemo } from "react";

import { useLiveNow } from "@/hooks/useLiveNow";
import { resolveActifyTimeZone } from "@/lib/datetime";
import { formatInTimeZone } from "@/lib/timezone";

type LiveDateTimeTextMode = "long-date" | "short-date" | "date-time" | "time";

type LiveDateTimeTextProps = {
  timeZone?: string | null;
  mode?: LiveDateTimeTextMode;
  className?: string;
};

function getFormatterOptions(mode: LiveDateTimeTextMode): Intl.DateTimeFormatOptions {
  switch (mode) {
    case "date-time":
      return {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      };
    case "short-date":
      return {
        weekday: "short",
        month: "short",
        day: "numeric"
      };
    case "time":
      return {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit"
      };
    case "long-date":
    default:
      return {
        weekday: "long",
        month: "long",
        day: "numeric"
      };
  }
}

export function LiveDateTimeText({ timeZone, mode = "long-date", className }: LiveDateTimeTextProps) {
  const zone = resolveActifyTimeZone({ facilityTimeZone: timeZone });
  const now = useLiveNow(mode === "date-time" || mode === "time" ? 1000 : 60_000);

  const label = useMemo(() => {
    return formatInTimeZone(now, zone, getFormatterOptions(mode));
  }, [mode, now, zone]);

  return <span className={className}>{label}</span>;
}
