import { FAQ_ITEMS } from "@/components/marketing/pricing/pricing-data";

export function PricingFAQAccordion() {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.34)] md:p-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">FAQ</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Questions Before You Choose</h2>
      </header>

      <div className="mt-6 space-y-2">
        {FAQ_ITEMS.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-slate-200 bg-slate-50/65 px-4 py-3 open:bg-white"
          >
            <summary className="cursor-pointer list-none pr-8 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">
              {item.question}
            </summary>
            <p className="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
