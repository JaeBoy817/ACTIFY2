import Link from "next/link";
import { FileText, ShieldCheck } from "lucide-react";

import {
  AccentTag,
  Eyebrow,
  MattePanel,
  PrimaryCta,
  PublicContainer,
  PublicSection,
  SecondaryCta
} from "@/components/public/PublicPrimitives";

export type LegalDocSection = {
  id: string;
  title: string;
  paragraphs: readonly string[];
};

export function LegalDocumentLayout({
  pageType,
  title,
  intro,
  effectiveDate,
  sections
}: {
  pageType: "privacy" | "terms";
  title: string;
  intro: string;
  effectiveDate: string;
  sections: readonly LegalDocSection[];
}) {
  const crossHref = pageType === "privacy" ? "/terms" : "/privacy";
  const crossLabel = pageType === "privacy" ? "View Terms" : "View Privacy";

  return (
    <div className="pb-14">
      <PublicSection className="pb-8 pt-12">
        <PublicContainer>
          <MattePanel className="overflow-hidden border-zinc-900 bg-zinc-900 p-0 text-zinc-100">
            <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.2fr_0.8fr] md:px-8 md:py-10">
              <div className="space-y-4">
                <Eyebrow className="text-zinc-400">
                  {pageType === "privacy" ? "Privacy Policy" : "Terms of Service"}
                </Eyebrow>
                <h1 className="font-[var(--font-display)] text-4xl leading-[1.02] md:text-6xl">
                  {title}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-zinc-300">{intro}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <AccentTag
                    icon={pageType === "privacy" ? ShieldCheck : FileText}
                    label={`Effective ${effectiveDate}`}
                    className="border-zinc-700 bg-zinc-800 text-zinc-200"
                  />
                  <AccentTag
                    label="Structured legal overview"
                    className="border-zinc-700 bg-zinc-800 text-zinc-200"
                  />
                </div>
              </div>
              <div className="space-y-3 self-end">
                <PrimaryCta href={crossHref} className="w-full justify-center">
                  {crossLabel}
                </PrimaryCta>
                <SecondaryCta href="/" className="w-full justify-center border-zinc-700 bg-zinc-800 text-zinc-100">
                  Back Home
                </SecondaryCta>
              </div>
            </div>
          </MattePanel>
        </PublicContainer>
      </PublicSection>

      <PublicSection className="pt-2">
        <PublicContainer>
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <MattePanel className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Contents
                </p>
                <details className="mt-2 lg:hidden">
                  <summary className="cursor-pointer rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-700">
                    Open sections
                  </summary>
                  <nav className="mt-2 space-y-1.5">
                    {sections.map((section) => (
                      <a
                        key={section.id}
                        href={`#${section.id}`}
                        className="block rounded-md border border-transparent px-2 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100"
                      >
                        {section.title}
                      </a>
                    ))}
                  </nav>
                </details>
                <nav className="mt-2 hidden space-y-1.5 lg:block">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block rounded-md border border-transparent px-2 py-1.5 text-sm text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </MattePanel>
            </aside>

            <div className="space-y-4">
              {sections.map((section) => (
                <MattePanel key={section.id} className="scroll-mt-24 p-6" >
                  <article id={section.id} className="space-y-4">
                    <h2 className="font-[var(--font-display)] text-3xl text-zinc-950">
                      {section.title}
                    </h2>
                    <div className="space-y-3 text-sm leading-7 text-zinc-700 md:text-[15px]">
                      {section.paragraphs.map((paragraph, index) => (
                        <p key={`${section.id}-${index}`}>{paragraph}</p>
                      ))}
                    </div>
                  </article>
                </MattePanel>
              ))}
              <MattePanel className="border-dashed border-zinc-300 bg-zinc-50/90 p-5">
                <p className="text-sm text-zinc-700">
                  Questions about these terms? Contact{" "}
                  <Link href="mailto:actifysupport@gmail.com" className="font-semibold text-zinc-900 underline underline-offset-2">
                    actifysupport@gmail.com
                  </Link>
                  .
                </p>
              </MattePanel>
            </div>
          </div>
        </PublicContainer>
      </PublicSection>
    </div>
  );
}
