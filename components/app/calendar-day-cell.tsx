"use client";

import { useState } from "react";
import Link from "next/link";

import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";

interface DayItem {
  id: string;
  label: string;
}

interface CalendarDayCellProps {
  dayName: string;
  dayNumber: string;
  activityCount: number;
  items: DayItem[];
  detailHref?: string;
  className?: string;
}

type Ripple = { id: number; x: number; y: number };

export function CalendarDayCell({ dayName, dayNumber, activityCount, items, detailHref, className }: CalendarDayCellProps) {
  const reducedMotion = useReducedMotion();
  const [ripples, setRipples] = useState<Ripple[]>([]);

  function spawnRipple(event: React.MouseEvent<HTMLDivElement>) {
    if (reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now() + Math.floor(Math.random() * 1000);

    setRipples((prev) => [...prev, { id, x, y }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 620);
  }

  return (
    <div onClick={spawnRipple} className={cn("calendar-day-cell rounded-md border bg-background p-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{dayName}</p>
          <p className="font-medium">{dayNumber}</p>
        </div>
        {detailHref ? (
          <Link
            href={detailHref}
            className="rounded-md border border-white/70 bg-white/75 px-2 py-1 text-[11px] font-medium text-foreground/75 transition hover:bg-white"
          >
            View day
          </Link>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{activityCount} activities</p>
      <div className="mt-2 space-y-1">
        {items.map((item) => (
          <p key={item.id} className="truncate rounded bg-muted/40 px-2 py-1 text-xs">
            {item.label}
          </p>
        ))}
      </div>
      {!reducedMotion &&
        ripples.map((ripple) => (
          <span
            key={ripple.id}
            aria-hidden
            className="calendar-ripple"
            style={{ left: ripple.x, top: ripple.y }}
          />
        ))}
    </div>
  );
}
