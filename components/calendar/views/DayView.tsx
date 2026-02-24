"use client";

import type { DragEvent } from "react";

import { WeekView } from "@/components/calendar/views/WeekView";
import type { CalendarEventLite } from "@/components/calendar/types";

type DayViewProps = {
  day: Date;
  events: CalendarEventLite[];
  timeZone: string;
  hoveredDropDay: string | null;
  onHoverDropDay: (dayKey: string | null) => void;
  onDropToDay: (dayKey: string, minutes: number, event: DragEvent<HTMLElement>) => void;
  onOpenEvent: (eventId: string) => void;
  onOpenDay: (dayKey: string) => void;
  onCreateAt: (dayKey: string, minutes: number) => void;
};

export function DayView(props: DayViewProps) {
  const { day, ...rest } = props;
  return <WeekView mode="day" days={[day]} {...rest} />;
}
