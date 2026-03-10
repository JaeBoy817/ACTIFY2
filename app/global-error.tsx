"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#040814] text-slate-100">
        <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
          <section className="w-full rounded-3xl border border-rose-300/25 bg-slate-950/80 p-6 shadow-[0_24px_70px_-42px_rgba(244,63,94,0.62)]">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-300/90">
              <AlertTriangle className="h-4 w-4" />
              Application Error
            </p>
            <h1 className="mt-2 text-2xl font-black text-white">We hit a server error loading this page.</h1>
            <p className="mt-2 text-sm text-slate-300">
              Retry this request. If it continues, use the digest below when contacting support.
            </p>
            {error.digest ? (
              <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                Digest: {error.digest}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
              <Link
                href="/sign-in"
                className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
              >
                Open Sign In
              </Link>
              <Link
                href="/"
                className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
              >
                Back Home
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
