export function NoBrainerSection() {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.34)] md:p-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">For Activities Directors</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Why It&rsquo;s a No-Brainer for Activities Directors
        </h2>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/75 p-4">
          <p className="text-sm leading-7 text-slate-600">
            Activities Directors are juggling monthly calendars, 1:1 planning, attendance tracking, note writing,
            resident preferences, birthdays, follow-ups, holiday planning, and last-minute backup activities.
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Actify is not another bloated system to manage. It helps you get through the real work faster: plan
            faster, write faster, organize faster, and recover faster when the day changes.
          </p>
        </div>

        <div className="space-y-3">
          {[
            "A few dollars a month for less daily scrambling.",
            "Less than the cost of a fast food lunch, but useful all month.",
            "If it saves even one hour a month, it is already worth it.",
            "If it helps you rewrite notes, plan calendars, and track residents faster, it pays for itself quickly."
          ].map((line) => (
            <p key={line} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700">
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
