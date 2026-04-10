"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";

type ForceClerkReauthProps = {
  redirectTo: string;
  mode: "sign-in" | "sign-up";
};

export function ForceClerkReauth({ redirectTo, mode }: ForceClerkReauthProps) {
  const clerk = useClerk();
  const [failed, setFailed] = useState(false);

  const targetLabel = useMemo(() => (mode === "sign-in" ? "Sign In" : "Sign Up"), [mode]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await clerk.signOut({
          redirectUrl: redirectTo
        });
      } catch (error) {
        console.error("[auth] forced reauth sign-out failed", error);
        if (!cancelled) {
          setFailed(true);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [clerk, redirectTo]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-2xl items-center px-4 py-12">
      <section className="w-full rounded-[2rem] border border-zinc-700 bg-[linear-gradient(160deg,#111724_0%,#0c111b_62%,#0a0d14_100%)] p-7 text-zinc-100 shadow-[0_34px_70px_-42px_rgba(0,0,0,0.9)] md:p-10">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-300">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          Secure Re-Authentication
        </p>
        <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">
          Preparing a fresh {targetLabel.toLowerCase()} session
        </h1>
        <p className="mt-2 text-sm leading-7 text-zinc-300">
          We’re signing out the current session so credentials are required again.
        </p>

        {failed ? (
          <div className="mt-5 rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p className="inline-flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              We couldn&apos;t reset the session automatically.
            </p>
            <p className="mt-1">
              Use the button below to continue.
            </p>
            <div className="mt-3">
              <Link
                href={redirectTo}
                className="inline-flex items-center rounded-xl border border-white/10 bg-white/90 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white"
              >
                Continue to {targetLabel}
              </Link>
            </div>
          </div>
        ) : (
          <p className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            Resetting session...
          </p>
        )}
      </section>
    </div>
  );
}
