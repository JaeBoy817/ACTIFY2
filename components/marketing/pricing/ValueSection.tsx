import { VALUE_CARDS } from "@/components/marketing/pricing/pricing-data";

export function ValueSection() {
  return (
    <section className="rounded-[34px] border border-slate-200 bg-white/95 p-6 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.34)] md:p-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Why It&apos;s Worth It</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Why Actify Is Worth It</h2>
      </header>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {VALUE_CARDS.map((card) => (
          <article
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-slate-50/75 p-4 transition duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_20px_36px_-30px_rgba(15,23,42,0.28)]"
          >
            <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
