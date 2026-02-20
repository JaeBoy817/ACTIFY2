import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { ActifyLogo } from "@/components/ActifyLogo";
import { GlassButton } from "@/components/glass/GlassButton";
import { GlassNavbar } from "@/components/glass/GlassNavbar";
import { LiquidOrbs } from "@/components/glass/LiquidOrbs";
import { MarketingMotionProvider } from "@/components/marketing/MarketingMotionProvider";
import { RouteTransitionOverlay } from "@/components/marketing/animations/RouteTransitionOverlay";
import { isClerkConfigured } from "@/lib/clerk-config";
import { prisma } from "@/lib/prisma";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { userId } = isClerkConfigured ? await auth() : { userId: null };
  const userSettings = userId
    ? await prisma.user.findUnique({
        where: { clerkUserId: userId },
        select: {
          settings: {
            select: {
              reduceMotion: true
            }
          }
        }
      })
    : null;
  const userReducedMotion = userSettings?.settings?.reduceMotion;

  return (
    <MarketingMotionProvider userReducedMotion={userReducedMotion}>
      <div data-ambient="marketing" className="min-h-screen bg-actify-dashboard bg-actify-orbs">
        <LiquidOrbs />
        <RouteTransitionOverlay />
        <header className="container relative z-40 pt-4">
          <div className="liquid-enter">
            <GlassNavbar variant="warm" className="!p-0 overflow-hidden">
              <div className="relative bg-actify-brand px-4 py-4 md:px-6">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0)_65%)]"
                />
                <div className="relative flex flex-wrap items-center justify-between gap-3">
                  <Link href="/" className="inline-flex items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <ActifyLogo variant="icon" size={42} aria-label="ACTIFY home" />
                    <div>
                      <p className="font-[var(--font-brand)] text-lg tracking-[0.16em] text-white">ACTIFY</p>
                      <p className="text-xs text-white/85">Documentation that feels human.</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <GlassButton asChild variant="dense" size="sm">
                      <Link href="/sign-in">Sign in</Link>
                    </GlassButton>
                    <GlassButton asChild size="sm">
                      <Link href="/sign-up">Start free</Link>
                    </GlassButton>
                  </div>
                </div>
              </div>

              <nav className="px-4 py-3 md:px-6">
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                  <Link href="/about" className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1">
                    About
                  </Link>
                  <Link href="/contact" className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1">
                    Contact
                  </Link>
                  <Link href="/docs" className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1">
                    Docs
                  </Link>
                  <Link href="/pricing" className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1">
                    Access
                  </Link>
                </div>
              </nav>
            </GlassNavbar>
          </div>
        </header>
        <main className="container relative z-10 py-10">
          {children}
        </main>
        <footer className="container pb-8">
          <div className="glass-dense rounded-xl px-4 py-3">
            <div className="glass-content flex flex-wrap items-center justify-between gap-3 text-sm text-foreground/75">
              <p className="font-[var(--font-brand)] font-semibold tracking-[0.14em] text-foreground">ACTIFY</p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/about" className="hover:text-primary">About</Link>
                <Link href="/contact" className="hover:text-primary">Contact</Link>
                <Link href="/privacy" className="hover:text-primary">Privacy</Link>
                <Link href="/terms" className="hover:text-primary">Terms</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </MarketingMotionProvider>
  );
}
