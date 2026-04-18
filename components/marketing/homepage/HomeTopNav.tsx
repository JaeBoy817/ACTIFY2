"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { ActifyLogo } from "@/components/branding/ActifyLogo";

const PRIMARY_LINKS = [
  { label: "Home", href: "/#home" },
  { label: "Features", href: "/#features" },
  { label: "For ADs", href: "/#for-ads" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" }
] as const;

export function HomeTopNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-4 z-50 pt-2 md:top-5">
      <div className="rounded-2xl border border-white/75 bg-white/85 px-3 py-2 shadow-[0_16px_42px_-34px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/#home"
            className="inline-flex items-center gap-2 rounded-xl px-1 py-1.5 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            aria-label="Actify Home"
          >
            <ActifyLogo variant="lockup" size={30} />
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50/85 p-1 lg:flex">
            {PRIMARY_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 transition duration-200 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/sign-in"
              className="inline-flex h-9 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition duration-200 hover:border-slate-400"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-9 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition duration-200 hover:bg-slate-800"
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition duration-200 hover:border-slate-400 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {open ? (
          <div className="mt-3 space-y-3 rounded-2xl border border-slate-200 bg-white p-3 lg:hidden">
            <nav className="grid gap-1">
              {PRIMARY_LINKS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition duration-200 hover:bg-slate-50 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="grid gap-2 pt-1">
              <Link
                href="/sign-up"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white"
              >
                Get Started
              </Link>
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700"
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
