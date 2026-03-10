import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { ArrowLeft, LogOut } from "lucide-react";

import { PrimaryCta, PublicContainer, PublicSection, SecondaryCta } from "@/components/public/PublicPrimitives";
import { isClerkConfigured } from "@/lib/clerk-config";

export const dynamic = "force-dynamic";

export default function SignOutPage() {
  return (
    <div className="pb-16 pt-10">
      <PublicContainer>
        <PublicSection>
          <div className="mx-auto max-w-[740px] rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8 text-zinc-100 shadow-[0_34px_70px_-42px_rgba(0,0,0,0.9)] md:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Session</p>
            <h1 className="mt-2 font-[var(--font-display)] text-5xl leading-[0.96] md:text-6xl">Sign out of Actify</h1>
            <p className="mt-4 text-base leading-7 text-zinc-300">
              End this session now. You can sign back in anytime.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {isClerkConfigured ? (
                <SignOutButton redirectUrl="/signed-out">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-yellow-500 bg-yellow-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-400"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </SignOutButton>
              ) : (
                <PrimaryCta href="/signed-out">Continue</PrimaryCta>
              )}
              <SecondaryCta href="/app">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to app
              </SecondaryCta>
              <Link
                href="/signed-out"
                className="inline-flex items-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-800"
              >
                Skip to signed-out page
              </Link>
            </div>
          </div>
        </PublicSection>
      </PublicContainer>
    </div>
  );
}
