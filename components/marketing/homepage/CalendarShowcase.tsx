import { CalendarDays } from "lucide-react";

export function CalendarShowcase() {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.42)] md:p-6">
      <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
        <CalendarDays className="h-3.5 w-3.5" />
        Calendar Spotlight
      </p>
      <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">Calendar Creation</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Plan month, week, and day views with Sunday-first structure, recurring activities, birthdays, holidays, and
        clean event editing.
      </p>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">April 2026</p>
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
            Sunday-first
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400">
          {"SMTWTFS".split("").map((day) => (
            <span key={day}>{day}</span>
          ))}
          {Array.from({ length: 21 }, (_, index) => (
            <span
              key={index}
              className={
                index === 4
                  ? "rounded-md border border-amber-200 bg-amber-50 px-1 py-0.5 font-semibold text-amber-700"
                  : index === 11
                    ? "rounded-md border border-sky-200 bg-sky-50 px-1 py-0.5 font-semibold text-sky-700"
                    : "rounded-md px-1 py-0.5"
              }
            >
              {index + 1}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-600">Holidays and resident birthdays are visible at a glance.</p>
      </div>
    </article>
  );
}
