import Link from "next/link";

import { ActifyLogo } from "@/components/ActifyLogo";
import { MattePanel, PrimaryCta, SecondaryCta } from "@/components/public/PublicPrimitives";

export function MarketingNavBar() {
  return (
    <header className="sticky top-4 z-40">
      <MattePanel className="border-zinc-900 bg-zinc-900 px-4 py-3 text-zinc-100 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            prefetch
            className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/35"
            aria-label="ACTIFY Home"
          >
            <ActifyLogo variant="icon" size={36} />
            <span className="font-[var(--font-brand)] text-sm tracking-[0.14em]">ACTIFY</span>
          </Link>

          <nav className="hidden items-center gap-4 text-sm text-zinc-300 md:flex">
            <Link href="/#what-actify-does" prefetch className="rounded-md px-2 py-1 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/35">
              Product
            </Link>
            <Link href="/about" prefetch className="rounded-md px-2 py-1 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/35">
              About
            </Link>
            <Link href="/terms" prefetch className="rounded-md px-2 py-1 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/35">
              Terms
            </Link>
            <Link href="/privacy" prefetch className="rounded-md px-2 py-1 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/35">
              Privacy
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <SecondaryCta href="/sign-in" className="h-10 border-zinc-700 bg-zinc-800 px-4 text-xs uppercase tracking-[0.12em]">
              Sign In
            </SecondaryCta>
            <PrimaryCta href="/sign-up" className="h-10 px-4 text-xs uppercase tracking-[0.12em]">
              Get Started
            </PrimaryCta>
          </div>
        </div>
      </MattePanel>
    </header>
  );
}
