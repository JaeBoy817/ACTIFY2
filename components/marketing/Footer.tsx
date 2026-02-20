import Link from "next/link";

import { GlassCard } from "@/components/marketing/Glass";

export function MarketingFooter() {
  return (
    <footer className="pt-10">
      <GlassCard tone="default" className="px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-foreground/75">
          <p className="font-[var(--font-brand)] tracking-[0.12em] text-foreground">ACTIFY</p>
          <nav className="flex flex-wrap items-center gap-4">
            <Link href="/#modules-snapshot" prefetch className="hover:text-foreground">
              Product
            </Link>
            <Link href="/about" prefetch className="hover:text-foreground">
              About
            </Link>
            <Link href="/terms" prefetch className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" prefetch className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/sign-in" prefetch className="hover:text-foreground">
              Sign In
            </Link>
          </nav>
        </div>
      </GlassCard>
    </footer>
  );
}
