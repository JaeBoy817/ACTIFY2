import { cn } from "@/lib/utils";
import type { BillingCycle } from "@/components/marketing/pricing/pricing-data";

type PricingToggleProps = {
  cycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
};

export function PricingToggle({ cycle, onChange }: PricingToggleProps) {
  return (
    <div className="mx-auto inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-[0_14px_30px_-28px_rgba(15,23,42,0.35)]">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={cn(
          "rounded-full px-5 py-2 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
          cycle === "monthly" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
        )}
        aria-pressed={cycle === "monthly"}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("yearly")}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
          cycle === "yearly" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
        )}
        aria-pressed={cycle === "yearly"}
      >
        Yearly
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
            cycle === "yearly" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
          )}
        >
          Save 16.5%
        </span>
      </button>
    </div>
  );
}
