"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { FAQ_ITEMS } from "@/components/marketing/pricing/pricing-data";
import { cn } from "@/lib/utils";

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section className="rounded-[34px] border border-slate-200 bg-white/95 p-6 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.34)] md:p-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">FAQ</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">Questions Before You Choose</h2>
      </header>

      <div className="mt-6 space-y-2.5">
        {FAQ_ITEMS.map((item, index) => {
          const expanded = index === openIndex;

          return (
            <article key={item.question} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setOpenIndex(expanded ? -1 : index)}
                aria-expanded={expanded}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-900 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              >
                <span>{item.question}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200", expanded ? "rotate-180" : "rotate-0")} aria-hidden />
              </button>

              <div className={cn("grid transition-all duration-200 ease-out", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <div className="overflow-hidden">
                  <p className="px-4 pb-4 text-sm leading-7 text-slate-600">{item.answer}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
