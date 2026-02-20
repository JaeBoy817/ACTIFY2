import Link from "next/link";

import { ActifyLogo } from "@/components/ActifyLogo";
import { GlassButton, GlassCard } from "@/components/marketing/Glass";

export function MarketingNavBar() {
  return (
    <header className="sticky top-4 z-40">
      <GlassCard tone="strong" className="px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            prefetch
            className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            aria-label="ACTIFY Home"
          >
            <ActifyLogo variant="icon" size={36} />
            <span className="font-[var(--font-brand)] text-sm tracking-[0.14em] text-foreground">ACTIFY</span>
          </Link>

          <nav className="hidden items-center gap-4 text-sm text-foreground/80 md:flex">
            <Link href="/#modules-snapshot" prefetch className="rounded-md px-2 py-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
              Product
            </Link>
            <Link href="/about" prefetch className="rounded-md px-2 py-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
              About
            </Link>
            <Link href="/terms" prefetch className="rounded-md px-2 py-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
              Terms
            </Link>
            <Link href="/privacy" prefetch className="rounded-md px-2 py-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
              Privacy
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <GlassButton asChild variant="secondary">
              <Link href="/sign-in" prefetch>
                Sign In
              </Link>
            </GlassButton>
            <GlassButton asChild>
              <Link href="/sign-up" prefetch>
                Get Started
              </Link>
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    </header>
  );
}
