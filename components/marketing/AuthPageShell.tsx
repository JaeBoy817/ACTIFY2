import Link from "next/link";
import { CheckCircle2, FileCheck2, NotebookPen, ShieldCheck, UserCog } from "lucide-react";

import { ActifyLogo } from "@/components/ActifyLogo";
import { AmbientBackdrop } from "@/components/marketing/AmbientBackdrop";
import { GlassButton, GlassCard, GlassPanel } from "@/components/marketing/Glass";
import { MarketingHero } from "@/components/marketing/Hero";
import { IconBadge } from "@/components/marketing/IconBadge";
import { AUTH_SHARED_BULLETS, SIGN_IN_BENEFITS, SIGN_UP_BENEFITS } from "@/content/marketing";

type Mode = "sign-in" | "sign-up";

const benefitIconMap = [NotebookPen, CheckCircle2, FileCheck2] as const;
const trustIconMap = [UserCog, ShieldCheck, FileCheck2] as const;

export function AuthPageShell({ mode, children }: { mode: Mode; children: React.ReactNode }) {
  const title = mode === "sign-in" ? "Sign in to ACTIFY" : "Create your ACTIFY account";
  const subtitle =
    mode === "sign-in"
      ? "Sign in to continue with your daily activity workflow."
      : "Set up your workspace for calm scheduling, documentation, and reporting.";
  const benefits = mode === "sign-in" ? SIGN_IN_BENEFITS : SIGN_UP_BENEFITS;
  const switchHref = mode === "sign-in" ? "/sign-up" : "/sign-in";
  const switchText = mode === "sign-in" ? "Don't have an account?" : "Already have an account?";
  const switchCta = mode === "sign-in" ? "Sign up" : "Sign in";
  const welcomeTitle = mode === "sign-in" ? "Welcome Back!" : "Welcome!";
  const welcomeSubtitle =
    mode === "sign-in"
      ? "Sign in to continue to your ACTIFY workspace."
      : "Create your account to start your ACTIFY workspace.";

  return (
    <div data-ambient="auth" className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#E7F5FF]/70 via-[#EDF2FF]/60 to-[#E3FAFC]/70">
      <AmbientBackdrop />
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-140px] top-[220px] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(77,171,247,0.24)_0%,rgba(77,171,247,0)_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-140px] top-[560px] h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(63,230,190,0.24)_0%,rgba(63,230,190,0)_72%)]"
      />

      <main className="relative z-10 mx-auto w-full max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
            <ActifyLogo variant="icon" size={36} />
            <span className="font-[var(--font-brand)] text-sm tracking-[0.14em] text-foreground">ACTIFY</span>
          </Link>
          <GlassButton asChild variant="secondary">
            <Link href="/">Back to Home</Link>
          </GlassButton>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(420px,560px)] lg:items-stretch">
          <div className="space-y-4">
            <MarketingHero
              variant="auth"
              kicker={mode === "sign-in" ? "Secure Sign In" : "Create Workspace Access"}
              title={title}
              subtitle={subtitle}
              primaryCta={{
                label: mode === "sign-in" ? "Create account" : "Sign in",
                href: mode === "sign-in" ? "/sign-up" : "/sign-in"
              }}
              secondaryCta={{ label: "Back to Home", href: "/" }}
              chips={AUTH_SHARED_BULLETS}
            />

            <GlassPanel tone="strong" className="bg-gradient-to-br from-violet-200/22 via-white/14 to-sky-200/16 p-5">
              <div className="space-y-2.5">
                {benefits.map((benefit, index) => {
                  const Icon = benefitIconMap[index] ?? NotebookPen;
                  return (
                    <div
                      key={benefit}
                      className={`flex items-center gap-2 rounded-xl border border-white/15 bg-gradient-to-br ${
                        index === 0
                          ? "from-sky-200/24 via-white/14 to-indigo-200/14"
                          : index === 1
                            ? "from-emerald-200/24 via-white/14 to-teal-200/14"
                            : "from-violet-200/24 via-white/14 to-pink-200/14"
                      } px-3 py-2 text-sm text-foreground/84`}
                    >
                      <IconBadge icon={Icon} tone={index === 0 ? "blue" : index === 1 ? "mint" : "violet"} className="h-8 w-8" />
                      <span>{benefit}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl border border-white/15 bg-gradient-to-br from-indigo-200/22 via-white/14 to-violet-200/14 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/68">Trust</p>
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                  {AUTH_SHARED_BULLETS.map((label, index) => {
                    const Icon = trustIconMap[index] ?? ShieldCheck;
                    return (
                      <div key={label} className="inline-flex items-center gap-2 text-xs text-foreground/80">
                        <IconBadge icon={Icon} tone="slate" className="h-7 w-7" />
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </GlassPanel>
          </div>

          <GlassCard tone="strong" className="bg-gradient-to-br from-sky-200/24 via-white/14 to-cyan-200/14 p-5 md:p-6">
            <div className="mb-4 text-center">
              <div className="flex justify-center">
                <ActifyLogo variant="stacked" size={38} className="gap-1.5" aria-label="ACTIFY" />
              </div>
              <h2 className="mt-3 font-[var(--font-display)] text-2xl text-foreground md:text-[1.75rem]">{welcomeTitle}</h2>
              <p className="mt-1 text-sm text-foreground/72">{welcomeSubtitle}</p>
            </div>

            <div className="actify-auth-clerk [&_.cl-badge]:!border [&_.cl-badge]:!border-actifyBlue/20 [&_.cl-badge]:!bg-actifyBlue/10 [&_.cl-badge]:!text-actifyBlue [&_.cl-card]:!border-0 [&_.cl-card]:!bg-transparent [&_.cl-card]:!shadow-none [&_.cl-cardBox]:!w-full [&_.cl-formButtonPrimary]:!font-semibold [&_.cl-footer]:!border-0 [&_.cl-footer]:!bg-transparent [&_.cl-footer]:!shadow-none">
              {children}
            </div>
            <div className="mt-4 rounded-xl border border-white/15 bg-gradient-to-r from-white/24 to-white/14 px-3 py-2 text-sm text-foreground/74">
              <span>{switchText} </span>
              <Link href={switchHref} className="font-semibold text-actifyBlue hover:text-actifyBlue/80">
                {switchCta}
              </Link>
            </div>
            <div className="mt-3 text-xs text-foreground/66">
              <Link href="/privacy" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
                Privacy
              </Link>
              <span className="px-2">•</span>
              <Link href="/terms" className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20">
                Terms
              </Link>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
