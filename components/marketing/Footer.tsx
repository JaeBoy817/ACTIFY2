import Link from "next/link";

import { MattePanel } from "@/components/public/PublicPrimitives";

export function MarketingFooter() {
  return (
    <footer className="pt-10">
      <MattePanel className="border-zinc-900 bg-zinc-900 px-4 py-5 text-zinc-200 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="font-[var(--font-brand)] tracking-[0.12em] text-zinc-100">ACTIFY</p>
          <nav className="flex flex-wrap items-center gap-4">
            <Link href="/#what-actify-does" prefetch className="hover:text-zinc-50">
              Product
            </Link>
            <Link href="/about" prefetch className="hover:text-zinc-50">
              About
            </Link>
            <Link href="/terms" prefetch className="hover:text-zinc-50">
              Terms
            </Link>
            <Link href="/privacy" prefetch className="hover:text-zinc-50">
              Privacy
            </Link>
            <Link href="/sign-in" prefetch className="hover:text-zinc-50">
              Sign In
            </Link>
          </nav>
        </div>
      </MattePanel>
    </footer>
  );
}
