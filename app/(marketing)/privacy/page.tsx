"use client";

import { useMemo, useState } from "react";

import { GlassPanel } from "@/components/glass/GlassPanel";
import { GlossaryTerm } from "@/components/marketing/animations/GlossaryTerm";
import { PlainEnglishToggle } from "@/components/marketing/animations/PlainEnglishToggle";
import { PolicySectionCards, type PolicySection } from "@/components/marketing/animations/PolicySectionCards";
import { Badge } from "@/components/ui/badge";

export default function PrivacyPage() {
  const [plainEnglishMode, setPlainEnglishMode] = useState(false);

  const sections = useMemo<PolicySection[]>(
    () => [
      {
        id: "data-use",
        title: "Data Use",
        content: (
          <>
            ACTIFY stores account, facility, and usage data to power scheduling, notes, reporting, and support. We use{" "}
            <GlossaryTerm
              term="PHI"
              definition="Protected Health Information: health-related data tied to a person."
              plainEnglishMode={plainEnglishMode}
            />{" "}
            only for permitted platform workflows and operations requested by your team.
          </>
        )
      },
      {
        id: "security",
        title: "Security",
        content: (
          <>
            Access is controlled by role-based permissions and activity is tracked with{" "}
            <GlossaryTerm
              term="Audit Trail"
              definition="A timestamped record showing who changed what and when."
              plainEnglishMode={plainEnglishMode}
            />
            . We continuously monitor for misuse and preserve change history for accountability.
          </>
        )
      },
      {
        id: "retention",
        title: "Retention",
        content: (
          <>
            Records and exports are retained based on facility settings. Your team defines{" "}
            <GlossaryTerm
              term="Retention"
              definition="How long data and exported files are kept before cleanup."
              plainEnglishMode={plainEnglishMode}
            />{" "}
            windows for audit logs and report files.
          </>
        )
      },
      {
        id: "rights",
        title: "Your Rights",
        content: (
          <>
            You can request access, correction, and export support for your facility’s data. For legal and privacy
            requests, contact{" "}
            <span className="font-medium text-foreground">actifysupport@gmail.com</span>.
          </>
        )
      }
    ],
    [plainEnglishMode]
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <GlassPanel variant="warm" className="space-y-4">
        <Badge className="w-fit border-0 bg-actify-warm text-foreground">Privacy</Badge>
        <h1 className="font-[var(--font-display)] text-4xl text-foreground">Privacy Policy</h1>
        <p className="text-sm text-foreground/75">Last updated: February 13, 2026</p>
        <PlainEnglishToggle enabled={plainEnglishMode} onEnabledChange={setPlainEnglishMode} />
      </GlassPanel>

      <PolicySectionCards sections={sections} />
    </div>
  );
}
