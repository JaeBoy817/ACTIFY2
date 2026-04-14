"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RefreshCcw, TriangleAlert } from "lucide-react";

type AppRouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppRouteError({ error, reset }: AppRouteErrorProps) {
  useEffect(() => {
    console.error("[app-route-error]", error);
  }, [error]);

  return (
    <section className="mx-auto max-w-2xl rounded-[2rem] border border-rose-200/70 bg-white/90 p-6 text-slate-900 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.35)]">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <TriangleAlert className="h-5 w-5" aria-hidden />
        </span>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">Workspace Error</p>
          <h2 className="text-2xl font-semibold text-slate-900">We hit a server error loading this page.</h2>
          <p className="text-sm text-slate-600">
            Retry this request. If it continues, use the digest below when contacting support.
          </p>
          {error.digest ? <p className="text-xs text-slate-500">Digest: {error.digest}</p> : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden />
          Retry
        </button>
        <Link
          href="/app"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          Back to Assistant Home
        </Link>
      </div>
    </section>
  );
}
