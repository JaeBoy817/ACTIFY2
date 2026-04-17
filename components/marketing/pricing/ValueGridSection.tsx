import { VALUE_ITEMS } from "@/components/marketing/pricing/pricing-data";

export function ValueGridSection() {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.34)] md:p-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Why It&rsquo;s Worth It</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">What You&rsquo;re Actually Paying For</h2>
      </header>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {VALUE_ITEMS.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-slate-50/75 p-4 transition duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_18px_34px_-28px_rgba(15,23,42,0.32)]"
          >
            <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
