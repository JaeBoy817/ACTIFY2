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
    <div className="rounded-[1.6rem] border border-[#2a3f67] bg-[linear-gradient(180deg,#091327_0%,#0a1324_100%)] p-6 text-[#d8e6ff] shadow-[0_24px_52px_-34px_rgba(37,99,235,0.65)]">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-orange-500 text-white shadow-[0_12px_20px_-12px_rgba(244,63,94,0.7)]">
          <TriangleAlert className="h-5 w-5" />
        </span>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9fb4da]">Dashboard Error</p>
          <h2 className="text-xl font-black text-white">We hit a server issue loading this workspace.</h2>
          <p className="text-sm text-[#b8caea]">
            Try reloading this section. If it persists, open another module and come back.
          </p>
          {error.digest ? (
            <p className="text-xs text-[#89a1cf]">Digest: {error.digest}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full border border-[#3f67aa] bg-[linear-gradient(180deg,#1a3d78_0%,#132f5d_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition hover:-translate-y-px"
        >
          <RefreshCcw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/app/calendar"
          className="inline-flex items-center rounded-full border border-[#2a3f67] bg-[linear-gradient(180deg,#0f1b33_0%,#0b1428_100%)] px-4 py-2 text-sm font-semibold text-[#d8e6ff] transition hover:-translate-y-px hover:border-[#47669f]"
        >
          Open Calendar
        </Link>
        <Link
          href="/app/analytics"
          className="inline-flex items-center rounded-full border border-[#2a3f67] bg-[linear-gradient(180deg,#0f1b33_0%,#0b1428_100%)] px-4 py-2 text-sm font-semibold text-[#d8e6ff] transition hover:-translate-y-px hover:border-[#47669f]"
        >
          Open Analytics
        </Link>
      </div>
    </div>
  );
}
