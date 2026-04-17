import Link from "next/link";

import { ActifyLogo } from "@/components/ActifyLogo";

const FOOTER_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Sign In", href: "/sign-in" }
] as const;

export function HomeFooter() {
  return (
    <footer className="mt-8 rounded-[30px] border border-slate-200 bg-white px-5 py-6 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.32)] md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <ActifyLogo variant="lockup" size={30} />
          <p className="mt-2 text-sm text-slate-600">
            AI assistant, residents, and calendar workflows built for activity departments.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className="transition hover:text-slate-900 focus-visible:outline-none focus-visible:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <p className="mt-5 border-t border-slate-200 pt-4 text-xs text-slate-500">© {new Date().getFullYear()} Actify. All rights reserved.</p>
    </footer>
  );
}
