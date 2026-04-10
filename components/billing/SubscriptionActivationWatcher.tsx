"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type BillingStatusResponse = {
  hasActiveSubscription: boolean;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
};

export function SubscriptionActivationWatcher({
  pollIntervalMs = 2500,
  maxPollAttempts = 50
}: {
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [statusText, setStatusText] = useState("Waiting for Stripe confirmation...");
  const [hasError, setHasError] = useState(false);

  const canKeepPolling = useMemo(() => attempts < maxPollAttempts, [attempts, maxPollAttempts]);

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      try {
        const response = await fetch("/api/billing/status", {
          method: "GET",
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error(`Billing status request failed (${response.status}).`);
        }

        const data = (await response.json()) as BillingStatusResponse;
        if (cancelled) return;

        if (data.hasActiveSubscription) {
          setIsActive(true);
          setStatusText("Subscription active. Redirecting to your dashboard...");
          router.replace("/dashboard");
          return;
        }

        setStatusText(`Current status: ${data.subscriptionStatus.toLowerCase().replaceAll("_", " ")}. Waiting for activation...`);
      } catch (error) {
        console.error("[billing][activation-watcher]", error);
        if (cancelled) return;
        setHasError(true);
        setStatusText("We couldn't confirm status yet. We'll keep checking.");
      } finally {
        if (!cancelled) {
          setAttempts((value) => value + 1);
        }
      }
    }

    void checkStatus();
    if (!canKeepPolling || isActive) return () => undefined;

    const timer = window.setInterval(() => {
      void checkStatus();
    }, pollIntervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [canKeepPolling, isActive, maxPollAttempts, pollIntervalMs, router]);

  return (
    <div className="space-y-4 rounded-2xl border border-[#ced8ed] bg-white/95 p-5 shadow-[0_24px_44px_-32px_rgba(15,23,42,0.5)]">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-actifyBlue" />
        <div>
          <p className="text-sm font-semibold text-slate-900">Finalizing your subscription...</p>
          <p className="text-sm text-slate-600">{statusText}</p>
        </div>
      </div>

      {!canKeepPolling && !isActive ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This is taking longer than expected. Use the button below to continue, and we’ll re-check billing state.
        </p>
      ) : null}

      {hasError ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          Webhook confirmation can take a moment. No action is needed unless this persists.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => router.push("/dashboard")} className="rounded-xl">
          Go to Dashboard
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => router.refresh()}>
          Refresh Status
        </Button>
      </div>
    </div>
  );
}
