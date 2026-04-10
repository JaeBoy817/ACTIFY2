import Link from "next/link";

import { ActifyLogo } from "@/components/ActifyLogo";
import { MarketingAuthCtas } from "@/components/marketing/MarketingAuthCtas";

const FOOTER_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact / Demo", href: "/contact" }
] as const;

export function MarketingFooter() {
  return (
    <footer className="pt-10">
      <div className="rounded-2xl border border-slate-700/80 bg-[#090f1cd9] px-4 py-6 text-slate-200 md:px-6">
        <section className="rounded-2xl border border-slate-700/70 bg-slate-900/65 p-4 md:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/80">Ready to get started?</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-300">Start your workspace in minutes, then manage billing inside Actify.</p>
            <MarketingAuthCtas size="sm" />
          </div>
        </section>

        <div className="mt-6 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="inline-flex items-center gap-2">
              <ActifyLogo variant="icon" size={28} />
              <p className="text-sm font-black tracking-[0.14em] text-white">ACTIFY</p>
            </div>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Modern software for activity departments in SNFs, assisted living, and long-term care.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-4 text-sm">
            {FOOTER_LINKS.map((item) => (
              <Link key={item.label} href={item.href} className="text-slate-300 transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/70 pt-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Actify. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/terms" className="hover:text-slate-200">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-slate-200">
              Privacy
            </Link>
            <Link href="/privacy-terms" className="hover:text-slate-200">
              Compliance
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
