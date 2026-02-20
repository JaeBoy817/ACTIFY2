import { GlassCard } from "@/components/marketing/Glass";
import { MarketingHero, type MarketingHeroVariant } from "@/components/marketing/Hero";

type LegalSection = {
  id: string;
  title: string;
  paragraphs: readonly string[];
};

export function LegalDocumentPage({
  badge,
  title,
  intro,
  lastUpdated,
  sections,
  heroVariant
}: {
  badge: string;
  title: string;
  intro: string;
  lastUpdated: string;
  sections: readonly LegalSection[];
  heroVariant: Extract<MarketingHeroVariant, "terms" | "privacy">;
}) {
  const crossLink = heroVariant === "terms" ? "/privacy" : "/terms";
  const crossLabel = heroVariant === "terms" ? "View Privacy" : "View Terms";

  return (
    <div className="relative py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-120px] top-[260px] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(165,180,252,0.2)_0%,rgba(165,180,252,0)_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-120px] top-[620px] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(116,192,252,0.2)_0%,rgba(116,192,252,0)_72%)]"
      />

      <MarketingHero
        variant={heroVariant}
        kicker={badge}
        title={title}
        subtitle={intro}
        primaryCta={{ label: crossLabel, href: crossLink }}
        secondaryCta={{ label: "Back to Home", href: "/" }}
        chips={[`Last updated: ${lastUpdated}`, "Structured and transparent", "Readable by section"]}
        privacyPrinciples={heroVariant === "privacy" ? sections.slice(0, 3).map((section) => section.title) : undefined}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <GlassCard
            className={`bg-gradient-to-br ${
              heroVariant === "terms"
                ? "from-slate-200/26 via-white/16 to-indigo-200/16"
                : "from-sky-200/26 via-white/16 to-violet-200/16"
            } p-4`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">Table of Contents</p>
            <details className="marketing-legal-details mt-2 lg:hidden">
              <summary className="marketing-legal-summary cursor-pointer rounded-lg border border-white/16 bg-gradient-to-r from-white/24 to-white/14 px-3 py-2 text-sm font-medium text-foreground">
                Open sections
              </summary>
              <nav className="marketing-legal-details-nav mt-2 flex flex-col gap-1.5">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="rounded-md border border-transparent px-2 py-1 text-sm text-foreground/80 transition hover:border-white/15 hover:bg-white/18"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </details>
            <nav className="mt-2 hidden flex-col gap-1.5 lg:flex">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-md border border-transparent px-2 py-1 text-sm text-foreground/80 transition hover:border-white/15 hover:bg-white/18"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </GlassCard>
        </aside>

        <div className="space-y-4">
          {sections.map((section, index) => (
            <GlassCard
              key={section.id}
              id={section.id}
              className={`scroll-mt-24 bg-gradient-to-br ${
                heroVariant === "terms"
                  ? index % 2 === 0
                    ? "from-slate-200/22 via-white/14 to-indigo-200/14"
                    : "from-indigo-200/22 via-white/14 to-sky-200/14"
                  : index % 2 === 0
                    ? "from-sky-200/22 via-white/14 to-violet-200/14"
                    : "from-violet-200/22 via-white/14 to-pink-200/14"
              } p-6`}
            >
              <h2 className="text-2xl font-semibold text-foreground">{section.title}</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-foreground/80">
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={`${section.id}-${paragraphIndex}`}>{paragraph}</p>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
