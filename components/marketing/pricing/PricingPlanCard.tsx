import Link from "next/link";

type PricingPlanCardProps = {
  title: string;
  priceLabel: string;
  supportingPrice?: string;
  description: string;
  features: readonly string[];
  ctaLabel: string;
  ctaHref: string;
  highlighted?: boolean;
  highlightLabel?: string;
  savingsLabel?: string;
};

export function PricingPlanCard({
  title,
  priceLabel,
  supportingPrice,
  description,
  features,
  ctaLabel,
  ctaHref,
  highlighted = false,
  highlightLabel,
  savingsLabel
}: PricingPlanCardProps) {
  return (
    <article
      className={
        "relative rounded-[28px] border p-6 shadow-[0_20px_48px_-40px_rgba(15,23,42,0.4)] transition duration-200 motion-safe:hover:-translate-y-1 " +
        (highlighted ? "border-sky-300 bg-sky-50/55" : "border-slate-200 bg-white")
      }
    >
      {highlightLabel ? (
        <span className="absolute -top-3 left-6 rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
          {highlightLabel}
        </span>
      ) : null}

      <header>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">{priceLabel}</p>
        {supportingPrice ? <p className="mt-1 text-sm text-slate-600">{supportingPrice}</p> : null}
        {savingsLabel ? <p className="mt-1 text-sm font-medium text-sky-700">{savingsLabel}</p> : null}
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </header>

      <ul className="mt-5 space-y-2 text-sm text-slate-600">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={
          "mt-6 inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 " +
          (highlighted
            ? "bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-slate-800"
            : "border border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-400")
        }
      >
        {ctaLabel}
      </Link>
    </article>
  );
}
