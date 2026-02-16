"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { resolveTimeZone } from "@/lib/timezone";

type LiveDateTimeBadgeMode = "long-date" | "short-date" | "date-time";

type LiveDateTimeBadgeProps = {
  timeZone?: string | null;
  mode?: LiveDateTimeBadgeMode;
  variant?: BadgeProps["variant"];
  className?: string;
};

function getFormatterOptions(mode: LiveDateTimeBadgeMode): Intl.DateTimeFormatOptions {
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
    case "long-date":
    default:
      return {
        weekday: "long",
        month: "long",
        day: "numeric"
      };
  }
}

export function LiveDateTimeBadge({
  timeZone,
  mode = "long-date",
  variant = "outline",
  className
}: LiveDateTimeBadgeProps) {
  const zone = resolveTimeZone(timeZone);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalMs = mode === "date-time" ? 1000 : 60_000;
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [mode]);

  const label = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      ...getFormatterOptions(mode)
    });
    return formatter.format(now);
  }, [mode, now, zone]);

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
