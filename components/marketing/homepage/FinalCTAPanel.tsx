import Link from "next/link";

export function FinalCTAPanel() {
  return (
    <section className="rounded-[34px] border border-slate-200 bg-white px-6 py-10 shadow-[0_28px_72px_-44px_rgba(15,23,42,0.35)] md:px-10">
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Get Started</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Start Planning Smarter With Actify</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">
          Use Actify to simplify activity planning, resident engagement, note writing, and calendar management in one
          clean assistant-first workspace.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/sign-up"
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Get Started
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Book a Demo
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">Built for Activities Directors in skilled nursing facilities.</p>
      </div>
    </section>
  );
}
