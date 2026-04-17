import { CalendarClock, FilePenLine, Sparkles, UsersRound } from "lucide-react";

const VALUE_POINTS = [
  {
    title: "Reword notes faster",
    body: "Turn rough drafts into cleaner progress and 1:1 notes in seconds.",
    icon: FilePenLine
  },
  {
    title: "Build the month without guesswork",
    body: "Use month/week/day planning plus recurring activities to reduce last-minute scrambling.",
    icon: CalendarClock
  },
  {
    title: "Track participation cleanly",
    body: "Attendance and participation stay practical and readable, not overwhelming.",
    icon: UsersRound
  },
  {
    title: "Use AI shortcuts that complete tasks",
    body: "Get direct outputs for planning, note support, and resident engagement help.",
    icon: Sparkles
  }
] as const;

export function ValueGridSection() {
  return (
    <section id="for-ads" className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.35)] md:p-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">For Activity Teams</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Built for Speed, Clarity, and Better Follow-Through
        </h2>
      </header>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {VALUE_POINTS.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition duration-200 motion-safe:hover:-translate-y-0.5"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
