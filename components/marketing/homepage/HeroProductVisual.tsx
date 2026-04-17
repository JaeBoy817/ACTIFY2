import { CalendarDays, Sparkles, Users } from "lucide-react";

export function HeroProductVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] px-2 pb-2 pt-3 sm:px-6 md:px-0">
      <div
        aria-hidden
        className="pointer-events-none absolute left-10 top-8 h-44 w-44 rounded-full bg-sky-200/50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-8 right-4 h-48 w-48 rounded-full bg-teal-200/40 blur-3xl"
      />

      <article className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_34px_70px_-42px_rgba(15,23,42,0.36)] transition duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_42px_82px_-44px_rgba(15,23,42,0.42)]">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
            <Sparkles className="h-3.5 w-3.5" />
            Actify AI Assistant
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            Ready
          </span>
        </div>

        <div className="mt-5 space-y-3">
          <div className="ml-auto max-w-[72%] rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700">
            Need a low-energy afternoon idea for room visits.
          </div>
          <div className="max-w-[88%] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
            Try a &ldquo;Memory Music&rdquo; round with familiar songs, then a short conversation prompt card set. I can also draft a
            quick 1:1 note format for after visits.
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
              Reword this note
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
              Suggest backup plan
            </span>
          </div>
        </div>
      </article>

      <article className="home-float-a absolute -left-1 top-6 w-[200px] rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-[0_24px_40px_-30px_rgba(15,23,42,0.42)] sm:-left-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Residents</p>
        <div className="mt-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Mary Thompson</p>
            <p className="text-xs text-slate-500">Room 212 • Prefers 1:1</p>
          </div>
          <Users className="h-4 w-4 text-slate-500" />
        </div>
        <p className="mt-2 text-xs text-slate-600">74% participation this month</p>
      </article>

      <article className="home-float-b absolute -bottom-3 right-1 w-[228px] rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-[0_24px_40px_-30px_rgba(15,23,42,0.42)] sm:right-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Calendar</p>
          <CalendarDays className="h-4 w-4 text-slate-500" />
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400">
          {"SMTWTFS".split("").map((day) => (
            <span key={day}>{day}</span>
          ))}
          {Array.from({ length: 14 }, (_, index) => (
            <span
              key={index}
              className={
                index === 8
                  ? "rounded-md bg-sky-100 px-1 py-0.5 font-semibold text-sky-700"
                  : "rounded-md px-1 py-0.5"
              }
            >
              {index + 1}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-600">Friday needs one backup activity</p>
      </article>
    </div>
  );
}
