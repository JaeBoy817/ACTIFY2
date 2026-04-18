import Link from "next/link";

import { cn } from "@/lib/utils";

type AuthMode = "sign-in" | "sign-up";

type AuthModeToggleProps = {
  mode: AuthMode;
  signInHref: string;
  signUpHref: string;
};

export function AuthModeToggle({ mode, signInHref, signUpHref }: AuthModeToggleProps) {
  return (
    <nav aria-label="Authentication mode" className="rounded-2xl border border-white/25 bg-white/10 p-1.5 backdrop-blur-md">
      <div className="grid grid-cols-2 gap-1">
        <Link
          href={signInHref}
          className={cn(
            "inline-flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70",
            mode === "sign-in"
              ? "bg-white/88 text-slate-900 shadow-[0_10px_22px_-14px_rgba(15,23,42,0.6)]"
              : "text-slate-100/85 hover:bg-white/12 hover:text-white"
          )}
          aria-current={mode === "sign-in" ? "page" : undefined}
        >
          Sign In
        </Link>
        <Link
          href={signUpHref}
          className={cn(
            "inline-flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70",
            mode === "sign-up"
              ? "bg-white/88 text-slate-900 shadow-[0_10px_22px_-14px_rgba(15,23,42,0.6)]"
              : "text-slate-100/85 hover:bg-white/12 hover:text-white"
          )}
          aria-current={mode === "sign-up" ? "page" : undefined}
        >
          Sign Up
        </Link>
      </div>
    </nav>
  );
}
