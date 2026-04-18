import type { ReactNode } from "react";

import { ActifyLogo } from "@/components/branding/ActifyLogo";
import { AuthBackgroundScene } from "@/components/auth/AuthBackgroundScene";
import { AuthFooterLinks } from "@/components/auth/AuthFooterLinks";
import { AuthGlassCard } from "@/components/auth/AuthGlassCard";
import { AuthModeToggle } from "@/components/auth/AuthModeToggle";
import { clerkSignInUrl, clerkSignUpUrl } from "@/lib/clerk-config";

type AuthMode = "sign-in" | "sign-up";

type AuthPageShellProps = {
  mode: AuthMode;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  statusBanner?: ReactNode;
  debugCard?: ReactNode;
};

export function AuthPageShell({
  mode,
  eyebrow,
  title,
  description,
  children,
  statusBanner,
  debugCard
}: AuthPageShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <AuthBackgroundScene />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10 md:px-8 md:py-12">
        <div className="w-full max-w-[34rem]">
          <AuthGlassCard>
            <div className="space-y-5">
              <header className="space-y-3">
                <span className="inline-flex items-center">
                  <ActifyLogo
                    size={28}
                    variant="lockup"
                    className="gap-2.5"
                    imageClassName="opacity-95"
                    wordmarkClassName="text-slate-50"
                    priority
                    aria-label="Actify"
                  />
                </span>
                <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-100/90">
                  {eyebrow}
                </p>
                <h1 className="font-[var(--font-display)] text-3xl leading-[1.06] tracking-tight text-white md:text-[2.15rem]">
                  {title}
                </h1>
                <p className="text-sm leading-6 text-slate-100/80 md:text-[0.95rem]">
                  {description}
                </p>
              </header>

              <AuthModeToggle mode={mode} signInHref={clerkSignInUrl} signUpHref={clerkSignUpUrl} />

              {statusBanner ? <div>{statusBanner}</div> : null}

              <section className="actify-auth-clerk" aria-label={mode === "sign-in" ? "Sign in form" : "Sign up form"}>
                {children}
              </section>

              <AuthFooterLinks mode={mode} />
            </div>
          </AuthGlassCard>

          {debugCard ? <div className="mt-4">{debugCard}</div> : null}
        </div>
      </div>
    </main>
  );
}
