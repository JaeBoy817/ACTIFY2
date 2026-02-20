import Link from "next/link";
import { NotebookPen, ScrollText, UsersRound } from "lucide-react";

import { GlassButton, GlassCard, GlassPanel } from "@/components/marketing/Glass";
import { MarketingHero } from "@/components/marketing/Hero";
import { IconBadge } from "@/components/marketing/IconBadge";
import { Section } from "@/components/marketing/Section";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  CORE_WORKFLOW_FEATURES,
  FEATURE_WORKFLOWS,
  FULL_TOOLKIT_FEATURES,
  HERO_BULLETS,
  HERO_HEADLINE,
  HERO_KICKER,
  HERO_SUBHEAD,
  HOME_FAQ_ITEMS,
  HOW_IT_WORKS_STEPS,
  MODULE_SNAPSHOT_ITEMS,
  PACKAGING_TITLE,
  PAPERWORK_OUTPUTS,
  PAPERWORK_TO_PROOF_TITLE,
  PRICING_PLAN_FEATURES,
  PRICING_PLAN_NAME,
  PRICING_PLAN_VALUE,
  PRICING_SUBTITLE,
  PRICING_TITLE,
  TRUST_ROW_BULLETS,
  TRUST_ROW_TITLE
} from "@/content/marketing";
import { getModuleRegistryItem, MODULE_REGISTRY, type ModuleRegistryKey } from "@/lib/moduleRegistry";

export const dynamic = "force-static";

const moduleSurfaceClassMap: Record<ModuleRegistryKey, string> = {
  dashboard: "from-cyan-200/24 via-white/18 to-blue-200/18",
  calendar: "from-sky-200/26 via-white/16 to-indigo-200/18",
  templates: "from-violet-200/26 via-white/16 to-rose-200/18",
  attendance: "from-emerald-200/26 via-white/16 to-teal-200/18",
  notes: "from-rose-200/24 via-white/16 to-orange-200/16",
  residents: "from-fuchsia-200/24 via-white/16 to-pink-200/16",
  "care-plan": "from-blue-200/26 via-white/16 to-cyan-200/18",
  analytics: "from-indigo-200/24 via-white/16 to-sky-200/18",
  volunteers: "from-green-200/26 via-white/16 to-emerald-200/18",
  "budget-stock": "from-amber-200/26 via-white/16 to-orange-200/18",
  "resident-council": "from-orange-200/24 via-white/16 to-rose-200/18",
  reports: "from-slate-200/24 via-white/16 to-indigo-200/16"
};

const howItWorksSurfaceClasses = [
  "from-sky-200/26 via-white/16 to-indigo-200/16",
  "from-emerald-200/26 via-white/16 to-cyan-200/16",
  "from-violet-200/26 via-white/16 to-fuchsia-200/16"
] as const;

export default function LandingPage() {
  return (
    <div className="relative pb-8">
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-120px] top-[220px] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(77,171,247,0.26)_0%,rgba(77,171,247,0)_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-130px] top-[620px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(218,119,242,0.22)_0%,rgba(218,119,242,0)_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[80px] left-[24%] h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(99,230,190,0.24)_0%,rgba(99,230,190,0)_72%)]"
      />

      <div className="relative pt-10">
        <MarketingHero
          variant="home"
          kicker={HERO_KICKER}
          title={HERO_HEADLINE}
          subtitle={HERO_SUBHEAD}
          primaryCta={{ label: "Get Started", href: "/sign-up" }}
          secondaryCta={{ label: "Sign In", href: "/sign-in" }}
          chips={HERO_BULLETS}
        />
      </div>

      <Section
        id="modules-snapshot"
        kicker="Modules Snapshot"
        title="One platform for every activity workflow"
        subtitle="Core Workflow plus Full Toolkit modules in one navigation system."
        headerAlign="center"
        headerSeparate
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {MODULE_SNAPSHOT_ITEMS.map((item) => {
            const moduleItem =
              getModuleRegistryItem(item.key as ModuleRegistryKey) ??
              MODULE_REGISTRY.find((entry) => entry.title === item.title) ??
              MODULE_REGISTRY[0];
            const Icon = moduleItem.icon;
            const moduleSurfaceClass =
              moduleSurfaceClassMap[item.key as ModuleRegistryKey] ??
              "from-sky-200/24 via-white/16 to-indigo-200/16";
            return (
              <GlassCard key={item.key} className={`bg-gradient-to-br ${moduleSurfaceClass} p-4`}>
                <div className="space-y-2">
                  <IconBadge icon={Icon} gradientClassName={moduleItem.accentGradientClasses} />
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="text-xs leading-5 text-foreground/74">{item.description}</p>
                </div>
              </GlassCard>
            );
          })}
        </div>

        <GlassCard className="mt-4 bg-gradient-to-br from-blue-200/20 via-white/14 to-fuchsia-200/16 p-5">
          <h3 className="text-lg font-semibold text-foreground">{PACKAGING_TITLE}</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/15 bg-gradient-to-br from-cyan-200/22 via-white/14 to-blue-200/16 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/68">Core Workflow</p>
              <ul className="mt-2 space-y-1 text-sm text-foreground/78">
                {CORE_WORKFLOW_FEATURES.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-white/15 bg-gradient-to-br from-violet-200/22 via-white/14 to-rose-200/16 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/68">Full Toolkit</p>
              <ul className="mt-2 space-y-1 text-sm text-foreground/78">
                {FULL_TOOLKIT_FEATURES.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </div>
          </div>
        </GlassCard>
      </Section>

      <Section
        kicker="How It Works"
        title="Three clear steps"
        subtitle="Create a usable monthly narrative from daily activity work."
        headerAlign="center"
        headerSeparate
      >
        <div className="grid gap-3 md:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <GlassCard
              key={step.title}
              className={`bg-gradient-to-br ${howItWorksSurfaceClasses[index % howItWorksSurfaceClasses.length]} p-5`}
            >
              <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-semibold text-foreground/82">
                {index + 1}
              </div>
              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-foreground/74">{step.body}</p>
            </GlassCard>
          ))}
        </div>

        <GlassCard className="mt-4 bg-gradient-to-br from-emerald-200/20 via-white/14 to-violet-200/16 p-5">
          <h3 className="text-lg font-semibold text-foreground">{PAPERWORK_TO_PROOF_TITLE}</h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-3 md:grid-cols-3">
              {FEATURE_WORKFLOWS.map((workflow, index) => (
                <div
                  key={workflow.title}
                  className={`rounded-xl border border-white/15 bg-gradient-to-br ${
                    howItWorksSurfaceClasses[index % howItWorksSurfaceClasses.length]
                  } p-3`}
                >
                  <p className="text-sm font-semibold text-foreground">{workflow.title}</p>
                  <p className="mt-1 text-xs leading-5 text-foreground/74">{workflow.description}</p>
                  <ul className="mt-2 space-y-1 text-xs text-foreground/72">
                    {workflow.points.map((point) => (
                      <li key={point}>{index + 1}. {point}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-white/15 bg-gradient-to-br from-amber-200/24 via-white/14 to-orange-200/16 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/68">Monthly report outputs</p>
              <ul className="mt-2 space-y-2 text-sm text-foreground/78">
                {PAPERWORK_OUTPUTS.map((item) => (
                  <li key={item} className="rounded-lg border border-white/15 bg-gradient-to-r from-white/22 to-white/12 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </GlassCard>
      </Section>

      <Section
        kicker="Trust"
        title={TRUST_ROW_TITLE}
        subtitle="Built for practical, day-to-day activity department work."
        headerAlign="center"
        headerSeparate
      >
        <GlassCard className="bg-gradient-to-br from-teal-200/22 via-white/14 to-pink-200/14 p-5">
          <div className="grid gap-2 md:grid-cols-3">
            {TRUST_ROW_BULLETS.map((bullet, index) => (
              <div
                key={bullet}
                className={`flex items-center gap-2 rounded-xl border border-white/15 bg-gradient-to-br ${
                  howItWorksSurfaceClasses[index % howItWorksSurfaceClasses.length]
                } px-3 py-2 text-sm text-foreground/82`}
              >
                <IconBadge
                  icon={index === 0 ? UsersRound : index === 1 ? ScrollText : NotebookPen}
                  tone={index === 0 ? "mint" : index === 1 ? "slate" : "blue"}
                  className="h-7 w-7"
                />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </Section>

      <Section kicker="Access" title={PRICING_TITLE} subtitle={PRICING_SUBTITLE} headerAlign="center" headerSeparate>
        <GlassPanel className="grid gap-4 bg-gradient-to-br from-sky-200/20 via-white/14 to-violet-200/14 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-foreground/65">{PRICING_PLAN_NAME}</p>
            <p className="mt-2 text-4xl font-semibold text-foreground">{PRICING_PLAN_VALUE}</p>
            <ul className="mt-4 space-y-2 text-sm text-foreground/78">
              {PRICING_PLAN_FEATURES.map((feature) => (
                <li key={feature} className="rounded-lg border border-white/15 bg-gradient-to-r from-white/22 to-white/12 px-3 py-2">
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2 self-start">
            <GlassButton asChild>
              <Link href="/sign-up" prefetch>
                Start free
              </Link>
            </GlassButton>
            <GlassButton asChild variant="secondary">
              <Link href="/sign-in" prefetch>
                Sign in
              </Link>
            </GlassButton>
            <GlassButton asChild variant="secondary">
              <Link href="/docs" prefetch>
                View sample monthly report
              </Link>
            </GlassButton>
          </div>
        </GlassPanel>
      </Section>

      <Section
        kicker="FAQ"
        title="Common questions"
        subtitle="Quick answers for teams evaluating ACTIFY."
        headerAlign="center"
        headerSeparate
      >
        <GlassCard className="bg-gradient-to-br from-indigo-200/22 via-white/14 to-pink-200/14 p-2 md:p-3">
          <Accordion type="single" collapsible className="space-y-2 px-2">
            {HOME_FAQ_ITEMS.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="marketing-faq-item overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white/22 to-white/12 px-0 backdrop-blur-sm transition-colors duration-200 data-[state=open]:from-white/24 data-[state=open]:to-white/16"
              >
                <AccordionTrigger className="marketing-faq-trigger px-4 py-4 text-base font-semibold text-foreground transition-colors duration-200 hover:bg-white/8 hover:no-underline">
                  <span className="flex-1 text-center">{item.question}</span>
                </AccordionTrigger>
                <AccordionContent className="marketing-faq-content px-4 pb-4 text-center text-sm leading-7 text-foreground/78">
                  <div className="mx-auto max-w-3xl">{item.answer}</div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </GlassCard>
      </Section>
    </div>
  );
}
