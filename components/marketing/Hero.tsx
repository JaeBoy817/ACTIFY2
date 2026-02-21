import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, ShieldCheck } from "lucide-react";

import { GlassButton, GlassCard, GlassPanel } from "@/components/marketing/Glass";
import { IconBadge } from "@/components/marketing/IconBadge";
import {
  getModuleRegistryItem,
  MODULE_REGISTRY,
  type ModuleRegistryItem,
  type ModuleRegistryKey
} from "@/lib/moduleRegistry";
import { cn } from "@/lib/utils";

export type MarketingHeroVariant = "home" | "about" | "auth" | "terms" | "privacy";

type HeroAction = {
  label: string;
  href: string;
};

type HeroProps = {
  variant: MarketingHeroVariant;
  kicker?: string;
  title: string;
  subtitle: string;
  primaryCta?: HeroAction;
  secondaryCta?: HeroAction;
  chips?: readonly string[];
  privacyPrinciples?: readonly string[];
  className?: string;
};

const variantModules: Record<MarketingHeroVariant, readonly ModuleRegistryKey[]> = {
  home: ["dashboard", "calendar", "attendance", "care-plan", "residents", "reports", "analytics", "templates"],
  about: ["residents", "care-plan", "attendance", "reports", "analytics", "dashboard"],
  auth: ["templates", "calendar", "residents", "attendance", "notes", "reports"],
  terms: ["reports", "resident-council", "dashboard", "templates"],
  privacy: ["reports", "notes", "attendance", "care-plan"]
};

const signatureDefaults: Record<MarketingHeroVariant, readonly string[]> = {
  home: ["Today’s workflow at a glance", "Fast documentation", "Report-ready outcomes"],
  about: ["Assess", "Plan", "Engage", "Track", "Report"],
  auth: ["Create facility + roles", "Add residents + templates", "Start calendar + attendance"],
  terms: ["Structured sections", "Clear responsibilities", "Transparent records guidance"],
  privacy: ["Data Use", "Security", "Retention"]
};

const constellationLayout = [
  { left: "4%", top: "18%" },
  { left: "14%", top: "72%" },
  { left: "27%", top: "12%" },
  { left: "38%", top: "76%" },
  { left: "61%", top: "14%" },
  { left: "74%", top: "72%" },
  { left: "86%", top: "24%" },
  { left: "92%", top: "66%" }
] as const;

function getModules(keys: readonly ModuleRegistryKey[]) {
  return keys
    .map((key) => getModuleRegistryItem(key))
    .filter((item): item is ModuleRegistryItem => Boolean(item));
}

function HeroConstellation({ modules }: { modules: readonly ModuleRegistryItem[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
      {constellationLayout.map((point, index) => {
        const moduleItem = modules[index % modules.length] ?? MODULE_REGISTRY[index % MODULE_REGISTRY.length];
        const Icon = moduleItem.icon;
        return (
          <span
            key={`${moduleItem.key}-${index}`}
            className="marketing-hero-flow absolute opacity-25"
            style={{
              left: point.left,
              top: point.top,
              animationDelay: `${index * 1.6}s`,
              animationDuration: `${46 + (index % 4) * 8}s`
            }}
          >
            <span
              className={cn(
                "marketing-hero-glow absolute inset-[-24px] rounded-2xl bg-gradient-to-br opacity-80 blur-3xl",
                moduleItem.accentGradientClasses
              )}
            />
            <span
              className={cn(
                "marketing-hero-float relative inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br shadow-[0_14px_26px_-18px_rgba(15,23,42,0.4)] backdrop-blur-[8px]",
                moduleItem.accentGradientClasses
              )}
            >
              <Icon className="h-6 w-6 opacity-20 blur-[4.2px]" />
            </span>
          </span>
        );
      })}
    </div>
  );
}

function HomeSignature({ modules }: { modules: readonly ModuleRegistryItem[] }) {
  const cards = [
    {
      label: "Today’s Calendar",
      detail: "Week plan + locations",
      moduleItem: modules.find((item) => item.key === "calendar")
    },
    {
      label: "Attendance Snapshot",
      detail: "Present / Refused / Out",
      moduleItem: modules.find((item) => item.key === "attendance")
    },
    {
      label: "Care Plan Quick Actions",
      detail: "Review due + add note",
      moduleItem: modules.find((item) => item.key === "care-plan")
    }
  ] as const;

  return (
    <GlassCard className="p-4 md:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">Command Center Strip</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {cards.map((card) => {
          const fallback = modules[0] ?? MODULE_REGISTRY[0];
          const moduleItem = card.moduleItem ?? fallback;
          const Icon = moduleItem.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-white/18 bg-white/12 p-3">
              <div className="flex items-center gap-2">
                <IconBadge icon={Icon} className="h-8 w-8" gradientClassName={moduleItem.accentGradientClasses} />
                <p className="text-sm font-semibold text-foreground">{card.label}</p>
              </div>
              <p className="mt-2 text-xs text-foreground/70">{card.detail}</p>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function AboutSignature({ modules }: { modules: readonly ModuleRegistryItem[] }) {
  const path = [
    { label: "Assess", key: "residents" as const },
    { label: "Plan", key: "care-plan" as const },
    { label: "Engage", key: "attendance" as const },
    { label: "Track", key: "analytics" as const },
    { label: "Report", key: "reports" as const }
  ] as const;

  return (
    <GlassCard className="p-4 md:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">Care Path Timeline</p>
      <ol className="mt-3 grid gap-3 md:grid-cols-5">
        {path.map((step, index) => {
          const moduleItem = modules.find((item) => item.key === step.key) ?? modules[index % modules.length] ?? MODULE_REGISTRY[0];
          const Icon = moduleItem.icon;
          return (
            <li key={step.label} className="relative rounded-2xl border border-white/18 bg-white/12 p-3 text-center">
              <IconBadge icon={Icon} gradientClassName={moduleItem.accentGradientClasses} className="mx-auto h-8 w-8" />
              <p className="mt-2 text-sm font-semibold text-foreground">{step.label}</p>
            </li>
          );
        })}
      </ol>
    </GlassCard>
  );
}

function AuthSignature({ modules }: { modules: readonly ModuleRegistryItem[] }) {
  const steps = [
    {
      title: "Create Facility + Roles",
      key: "dashboard" as const
    },
    {
      title: "Add Residents / Templates",
      key: "residents" as const
    },
    {
      title: "Start Calendar + Attendance",
      key: "calendar" as const
    }
  ] as const;

  return (
    <>
      <GlassCard className="hidden p-4 md:block">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">Quick Start Stepper</p>
        <ol className="mt-3 space-y-3">
          {steps.map((step, index) => {
            const moduleItem = modules.find((item) => item.key === step.key) ?? modules[index % modules.length] ?? MODULE_REGISTRY[0];
            return (
              <li key={step.title} className="flex items-center gap-3 rounded-xl border border-white/16 bg-white/10 px-3 py-2">
                <IconBadge icon={moduleItem.icon} gradientClassName={moduleItem.accentGradientClasses} className="h-8 w-8" />
                <span className="text-sm font-medium text-foreground/88">{step.title}</span>
              </li>
            );
          })}
        </ol>
      </GlassCard>

      <div className="grid gap-2 md:hidden">
        {steps.map((step, index) => {
          const moduleItem = modules.find((item) => item.key === step.key) ?? modules[index % modules.length] ?? MODULE_REGISTRY[0];
          return (
            <div key={step.title} className="inline-flex items-center gap-2 rounded-xl border border-white/18 bg-white/12 px-3 py-2">
              <IconBadge icon={moduleItem.icon} gradientClassName={moduleItem.accentGradientClasses} className="h-7 w-7" />
              <span className="text-xs font-medium text-foreground/84">{step.title}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function TermsSignature({ moduleItem }: { moduleItem: ModuleRegistryItem }) {
  const Icon = moduleItem.icon;
  return (
    <GlassCard className="p-4 md:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">Document Stack + TOC Preview</p>
      <div className="mt-3 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="relative h-36">
          <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl border border-white/14 bg-white/8" />
          <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-2xl border border-white/16 bg-white/10" />
          <div className="absolute inset-0 rounded-2xl border border-white/18 bg-white/14 p-4">
            <div className="flex items-center gap-2">
              <IconBadge icon={Icon} gradientClassName={moduleItem.accentGradientClasses} className="h-8 w-8" />
              <IconBadge icon={BadgeCheck} gradientClassName={moduleItem.accentGradientClasses} className="h-8 w-8" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-2 w-2/3 rounded-full bg-white/45" />
              <div className="h-2 w-4/5 rounded-full bg-white/35" />
              <div className="h-2 w-1/2 rounded-full bg-white/28" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/18 bg-white/12 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/64">TOC preview</p>
          <div className="mt-2 space-y-2">
            <div className="h-2 w-full rounded-full bg-white/38" />
            <div className="h-2 w-5/6 rounded-full bg-white/34" />
            <div className="h-2 w-2/3 rounded-full bg-white/32" />
            <div className="h-2 w-3/4 rounded-full bg-white/30" />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function PrivacySignature({
  moduleItem,
  principles
}: {
  moduleItem: ModuleRegistryItem;
  principles: readonly string[];
}) {
  const BulletIcon: LucideIcon = ShieldCheck;
  return (
    <GlassCard className="relative overflow-hidden p-4 md:p-5">
      <span
        aria-hidden
        className={cn(
          "absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20",
          "marketing-hero-arc"
        )}
      />
      <span
        aria-hidden
        className={cn(
          "absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/16",
          "marketing-hero-arc",
          "marketing-hero-arc-delay"
        )}
      />
      <div className="relative z-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">Privacy Shield Panel</p>
        <IconBadge icon={moduleItem.icon} gradientClassName={moduleItem.accentGradientClasses} className="mx-auto mt-3 h-10 w-10" />
        <ul className="mt-3 grid gap-2 text-left sm:grid-cols-3">
          {principles.map((item) => (
            <li key={item} className="rounded-xl border border-white/18 bg-white/12 px-3 py-2 text-xs text-foreground/84">
              <span className="inline-flex items-center gap-1.5">
                <BulletIcon className="h-3.5 w-3.5 text-foreground/70" />
                <span>{item}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </GlassCard>
  );
}

function renderSignature(props: {
  variant: MarketingHeroVariant;
  modules: readonly ModuleRegistryItem[];
  privacyPrinciples?: readonly string[];
}) {
  const { variant, modules, privacyPrinciples } = props;
  if (variant === "home") {
    return <HomeSignature modules={modules} />;
  }
  if (variant === "about") {
    return <AboutSignature modules={modules} />;
  }
  if (variant === "auth") {
    return <AuthSignature modules={modules} />;
  }
  if (variant === "terms") {
    return <TermsSignature moduleItem={modules[0] ?? MODULE_REGISTRY[0]} />;
  }
  return (
    <PrivacySignature
      moduleItem={modules[0] ?? MODULE_REGISTRY[0]}
      principles={privacyPrinciples?.length ? privacyPrinciples : signatureDefaults.privacy}
    />
  );
}

export function MarketingHero({
  variant,
  kicker,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  chips,
  privacyPrinciples,
  className
}: HeroProps) {
  const modules = getModules(variantModules[variant]);
  const anchor = modules[0] ?? MODULE_REGISTRY[0];
  const chipText = chips?.length ? chips : signatureDefaults[variant];

  return (
    <GlassPanel tone="strong" className={cn("relative overflow-hidden", className)}>
      <span
        aria-hidden
        className={cn("absolute inset-x-0 top-0 h-1 rounded-t-3xl bg-gradient-to-r", anchor.accentGradientClasses)}
      />
      <HeroConstellation modules={modules} />

      <div className="relative z-10 space-y-5">
        <div className="max-w-3xl space-y-3">
          {kicker ? (
            <p className="inline-flex w-fit rounded-full border border-white/18 bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/74">
              {kicker}
            </p>
          ) : null}
          <h1 className="font-[var(--font-display)] text-4xl text-foreground md:text-5xl">{title}</h1>
          <p className="text-base text-foreground/78 md:text-lg">{subtitle}</p>
          {(primaryCta || secondaryCta) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {primaryCta ? (
                <GlassButton asChild>
                  <Link href={primaryCta.href} prefetch>
                    {primaryCta.label}
                  </Link>
                </GlassButton>
              ) : null}
              {secondaryCta ? (
                <GlassButton asChild variant="secondary">
                  <Link href={secondaryCta.href} prefetch>
                    {secondaryCta.label}
                  </Link>
                </GlassButton>
              ) : null}
            </div>
          )}
        </div>

        {renderSignature({ variant, modules, privacyPrinciples })}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {chipText.slice(0, 4).map((item, index) => {
            const moduleItem = modules[index % modules.length] ?? MODULE_REGISTRY[index % MODULE_REGISTRY.length];
            return (
              <div key={item} className="inline-flex items-center gap-2 rounded-xl border border-white/18 bg-white/12 px-3 py-2">
                <IconBadge icon={moduleItem.icon} gradientClassName={moduleItem.accentGradientClasses} className="h-7 w-7" />
                <span className="text-xs font-medium text-foreground/84">{item}</span>
              </div>
            );
          })}
        </div>
      </div>
    </GlassPanel>
  );
}
