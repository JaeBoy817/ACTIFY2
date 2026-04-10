import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { SubscriptionActivationWatcher } from "@/components/billing/SubscriptionActivationWatcher";

type SearchParams = Record<string, string | string[] | undefined>;

function readSearchValue(source: SearchParams | undefined, key: string) {
  const value = source?.[key];
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default async function SubscriptionSuccessPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/subscribe/success");
  }

  const sessionId = readSearchValue(searchParams, "session_id");

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-3xl items-center px-4 py-12">
      <section className="w-full space-y-4 rounded-[2rem] border border-slate-700/75 bg-[linear-gradient(180deg,#0a1322_0%,#0b1020_50%,#090d18_100%)] p-6 shadow-[0_40px_90px_-50px_rgba(37,99,235,0.58)] md:p-8">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            Checkout Complete
          </p>
          <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">Finalizing your subscription</h1>
          <p className="mt-2 text-sm text-[#bfd0eb]">
            We’re confirming your Stripe subscription through webhook events before unlocking the dashboard.
          </p>
          {sessionId ? (
            <p className="mt-2 text-xs text-[#9eb4d7]">Session: {sessionId}</p>
          ) : null}
        </div>

        <SubscriptionActivationWatcher />

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-xl border border-white/15 bg-white/90 px-4 text-sm font-semibold text-slate-900 transition hover:bg-white"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/subscribe"
            className="inline-flex h-10 items-center rounded-xl border border-[#4d658c] bg-[#14223a] px-4 text-sm font-semibold text-[#d8e6ff] transition hover:bg-[#1a2d4a]"
          >
            Back to Subscription
          </Link>
        </div>
      </section>
    </div>
  );
}
