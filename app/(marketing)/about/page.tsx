import Link from "next/link";
import { ArrowRight, HandHeart, Target } from "lucide-react";

import { GlassButton, GlassCard } from "@/components/marketing/Glass";
import { MarketingHero } from "@/components/marketing/Hero";
import { IconBadge } from "@/components/marketing/IconBadge";
import { Section } from "@/components/marketing/Section";
import {
  ABOUT_BADGE,
  ABOUT_BODY,
  ABOUT_CTA_BODY,
  ABOUT_CTA_TITLE,
  ABOUT_MISSION_BODY,
  ABOUT_MISSION_TITLE,
  ABOUT_SOLUTIONS,
  ABOUT_TITLE
} from "@/content/marketing";

export const dynamic = "force-static";

export default function AboutPage() {
  return (
    <div className="relative pb-8 pt-10">
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-120px] top-[220px] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(77,171,247,0.24)_0%,rgba(77,171,247,0)_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-110px] top-[540px] h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,rgba(218,119,242,0.2)_0%,rgba(218,119,242,0)_72%)]"
      />

      <MarketingHero
        variant="about"
        kicker={ABOUT_BADGE}
        title={ABOUT_TITLE}
        subtitle={ABOUT_BODY}
        primaryCta={{ label: "Get Started", href: "/sign-up" }}
        secondaryCta={{ label: "Sign In", href: "/sign-in" }}
        chips={ABOUT_SOLUTIONS.map((item) => item.title)}
      />

      <Section kicker="Mission" title={ABOUT_MISSION_TITLE} subtitle={ABOUT_MISSION_BODY}>
        <div className="grid gap-3 md:grid-cols-3">
          {ABOUT_SOLUTIONS.map((item, index) => (
            <GlassCard
              key={item.title}
              className={`bg-gradient-to-br ${
                index === 0
                  ? "from-emerald-200/26 via-white/16 to-cyan-200/16"
                  : index === 1
                    ? "from-sky-200/26 via-white/16 to-indigo-200/16"
                    : "from-violet-200/26 via-white/16 to-fuchsia-200/16"
              } p-5`}
            >
              <div className="mb-2">
                <IconBadge icon={index === 0 ? HandHeart : index === 1 ? Target : ArrowRight} tone={index === 0 ? "mint" : index === 1 ? "blue" : "violet"} />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{item.title}</h2>
              <p className="mt-2 text-sm text-foreground/74">{item.body}</p>
            </GlassCard>
          ))}
        </div>
      </Section>

      <Section kicker="Next Step" title={ABOUT_CTA_TITLE} subtitle={ABOUT_CTA_BODY}>
        <GlassCard className="bg-gradient-to-br from-indigo-200/22 via-white/14 to-pink-200/14 p-5">
          <div className="flex flex-wrap gap-2">
            <GlassButton asChild>
              <Link href="/sign-up" prefetch>
                Get Started
              </Link>
            </GlassButton>
            <GlassButton asChild variant="secondary">
              <Link href="/sign-in" prefetch>
                Sign In
              </Link>
            </GlassButton>
          </div>
        </GlassCard>
      </Section>
    </div>
  );
}
