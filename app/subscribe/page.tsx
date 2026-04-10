import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SubscriptionStatus } from "@prisma/client";
import { CheckCircle2, Lock, ShieldCheck, Sparkles } from "lucide-react";

import { getAccessStateForUser } from "@/lib/access-control";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { ManageBillingButton } from "@/components/billing/ManageBillingButton";
import { requireUser } from "@/lib/auth";
import { getFacilityBillingState } from "@/lib/billing";

type SearchParams = Record<string, string | string[] | undefined>;

function readSearchValue(source: SearchParams | undefined, key: string) {
  const value = source?.[key];
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default async function SubscribePage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const canceled = readSearchValue(searchParams, "canceled") === "1";
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-3xl items-center px-4 py-12">
        <section className="w-full rounded-[2rem] border border-slate-700/75 bg-[linear-gradient(180deg,#0a1322_0%,#0b1020_50%,#090d18_100%)] p-6 shadow-[0_36px_80px_-46px_rgba(37,99,235,0.55)] md:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9fb5da]">Actify Subscription</p>
          <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">Sign in to continue with Actify Pro.</h1>
          <p className="mt-2 text-sm text-[#bfd0eb]">
            Create your account or sign in, then continue with secure Stripe checkout.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/sign-in"
              className="inline-flex h-11 items-center rounded-xl border border-white/10 bg-white/90 px-5 text-sm font-semibold text-slate-900 transition hover:bg-white"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-11 items-center rounded-xl border border-[#4d658c] bg-[#14223a] px-5 text-sm font-semibold text-[#d8e6ff] transition hover:bg-[#1a2d4a]"
            >
              Create Account
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const user = await requireUser();
  const accessState = await getAccessStateForUser({
    id: user.id,
    clerkUserId: user.clerkUserId,
    email: user.email,
    facilityId: user.facilityId,
    role: user.role
  }).catch((error) => {
    console.error("[billing] subscribe page access lookup failed", error);
    return {
      isCreatorBypass: false,
      hasActiveSubscription: false,
      allowed: false
    };
  });
  const billing = await getFacilityBillingState(user.facilityId).catch((error) => {
    console.error("[billing] subscribe page billing snapshot failed", error);
    return {
      stripeCustomerId: null,
      subscriptionStatus: SubscriptionStatus.NONE
    };
  });

  if (accessState.allowed) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-3xl items-center px-4 py-12">
        <section className="w-full rounded-[2rem] border border-emerald-300/40 bg-[linear-gradient(180deg,#0e182a_0%,#0b1322_50%,#080f1c_100%)] p-6 shadow-[0_36px_80px_-46px_rgba(16,185,129,0.45)] md:p-8">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            Subscription Active
          </p>
          <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">
            {accessState.isCreatorBypass ? "Creator access is active." : "Actify Pro is active for your facility."}
          </h1>
          <p className="mt-2 text-sm text-[#c6d5ed]">
            {accessState.isCreatorBypass
              ? "This account bypasses subscription enforcement and can access the app."
              : "Your billing is current. Continue to your dashboard."}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center rounded-xl border border-white/10 bg-white/90 px-5 text-sm font-semibold text-slate-900 transition hover:bg-white"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/app/billing"
              className="inline-flex h-11 items-center rounded-xl border border-[#4d658c] bg-[#14223a] px-5 text-sm font-semibold text-[#d8e6ff] transition hover:bg-[#1a2d4a]"
            >
              Open Billing
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-5xl items-center px-4 py-12">
      <section className="w-full rounded-[2rem] border border-slate-700/75 bg-[linear-gradient(180deg,#0a1322_0%,#0b1020_50%,#090d18_100%)] p-6 shadow-[0_40px_90px_-50px_rgba(37,99,235,0.58)] md:p-8">
        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9fb5da]">Subscription</p>
            <h1 className="mt-3 text-3xl font-black text-white md:text-4xl">Activate Actify Pro</h1>
            <p className="mt-2 text-sm text-[#bfd0eb]">
              One plan. One checkout. Full access to scheduling, attendance, documentation, residents, and analytics.
            </p>

            {canceled ? (
              <p className="mt-4 rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                Checkout was canceled. No charges were made.
              </p>
            ) : null}

            <div className="mt-5 space-y-2">
              <p className="inline-flex items-center gap-2 text-sm text-[#cfe0f9]">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Secure checkout via Stripe
              </p>
              <p className="inline-flex items-center gap-2 text-sm text-[#cfe0f9]">
                <Sparkles className="h-4 w-4 text-sky-300" />
                Monthly billing
              </p>
              <p className="inline-flex items-center gap-2 text-sm text-[#cfe0f9]">
                <Lock className="h-4 w-4 text-indigo-300" />
                Cancel anytime from billing portal
              </p>
            </div>
          </div>

          <article className="rounded-2xl border border-[#4f678f] bg-[linear-gradient(180deg,#16243b_0%,#101b2d_100%)] p-5 shadow-[0_22px_40px_-30px_rgba(37,99,235,0.6)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9eb5dc]">Plan</p>
            <h2 className="mt-2 text-2xl font-black text-white">Actify Pro</h2>
            <p className="mt-1 text-sm text-[#bbd0ee]">For Activity Directors and care teams</p>

            <div className="mt-4 rounded-xl border border-[#5e79a6] bg-[#0f1a2b] px-4 py-3">
              <p className="text-3xl font-black text-white">$20</p>
              <p className="text-sm text-[#9fb4d8]">per month</p>
            </div>

            <CheckoutButton className="mt-5 h-11 w-full rounded-xl bg-white text-slate-900 hover:bg-slate-100" />
            {billing.stripeCustomerId ? (
              <ManageBillingButton className="mt-2 h-11 w-full rounded-xl border-[#5e79a6] bg-[#13213a] text-[#d8e6ff] hover:bg-[#1b2e4d]" />
            ) : null}
            <p className="mt-3 text-xs text-[#93a8cc]">
              You’ll return here after checkout while we confirm billing via webhook.
            </p>
            <p className="mt-1 text-xs text-[#93a8cc]">
              Current status: {billing.subscriptionStatus?.toLowerCase().replaceAll("_", " ") ?? "none"}
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
