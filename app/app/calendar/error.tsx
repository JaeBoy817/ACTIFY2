"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function CalendarError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[calendar] route error", {
      message: error.message,
      digest: error.digest
    });
  }, [error]);

  return (
    <div className="rounded-3xl border border-rose-400/30 bg-slate-950/85 p-6 text-slate-100 shadow-[0_22px_60px_-42px_rgba(251,113,133,0.65)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-300/90">Calendar unavailable</p>
      <h2 className="mt-2 text-2xl font-bold text-white">We hit a loading error.</h2>
      <p className="mt-2 text-sm text-slate-300">
        Retry to reload this page. If this keeps happening, share the error digest with support.
      </p>
      {error.digest ? (
        <p className="mt-3 rounded-xl border border-rose-300/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          Digest: {error.digest}
        </p>
      ) : null}
      <div className="mt-5">
        <Button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    </div>
  );
}
