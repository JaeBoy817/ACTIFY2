"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { ActifyLogo } from "@/components/ActifyLogo";

const NAV_LINKS = [
  { label: "Home", href: "/#home" },
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "For Facilities", href: "/#for-facilities" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact / Demo", href: "/contact" }
] as const;

export function MarketingNavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-3 z-50">
      <div
        className={
          "rounded-2xl border px-3 py-2 transition md:px-5 " +
          (scrolled
            ? "border-slate-600/80 bg-[#090f1cf0] shadow-[0_20px_70px_-35px_rgba(16,121,255,0.6)] backdrop-blur"
            : "border-slate-700/70 bg-[#090f1cd9] backdrop-blur")
        }
      >
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/#home"
            prefetch
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            aria-label="Actify Home"
          >
            <ActifyLogo variant="icon" size={34} />
            <span className="text-sm font-black tracking-[0.14em] text-white">ACTIFY</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/sign-in"
              className="inline-flex h-10 items-center rounded-full border border-slate-600 bg-slate-900/90 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-100 transition hover:border-slate-400"
            >
              Sign In
            </Link>
            <Link
              href="/request-access"
              className="inline-flex h-10 items-center rounded-full border border-cyan-300/45 bg-gradient-to-r from-cyan-500/75 to-blue-600/75 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:brightness-110"
            >
              Request Demo
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-slate-900/85 text-slate-100 transition hover:border-slate-400 lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {open ? (
          <div className="mt-3 space-y-2 rounded-xl border border-slate-700 bg-slate-900/95 p-3 lg:hidden">
            <nav className="grid gap-1">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="grid gap-2 pt-1">
              <Link
                href="/request-access"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-cyan-300/45 bg-gradient-to-r from-cyan-500/75 to-blue-600/75 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white"
              >
                Request Demo
              </Link>
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-slate-600 bg-slate-900 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-100"
              >
                Sign In
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
