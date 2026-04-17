const STEPS = [
  {
    title: "Add residents and preferences",
    body: "Capture interests, dislikes, support needs, and participation style in clean resident snapshots."
  },
  {
    title: "Build activities on the calendar",
    body: "Plan month, week, and day schedules quickly with recurring activity support and easy editing."
  },
  {
    title: "Track attendance and participation",
    body: "Log attendance from real activities and view monthly participation insights without heavy reporting tools."
  },
  {
    title: "Use Actify to write and plan faster",
    body: "Ask the assistant for note rewrites, backup activities, resident-specific ideas, and quick planning help."
  }
] as const;

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.35)] md:p-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">How It Works</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">How Actify Fits Into Your Day</h2>
      </header>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {STEPS.map((step, index) => (
          <article
            key={step.title}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_18px_34px_-28px_rgba(15,23,42,0.35)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Step {index + 1}</p>
            <h3 className="mt-2 text-base font-semibold text-slate-900">{step.title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
