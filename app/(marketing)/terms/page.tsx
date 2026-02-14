"use client";

import { useMemo, useState } from "react";

import { GlassPanel } from "@/components/glass/GlassPanel";
import { GlossaryTerm } from "@/components/marketing/animations/GlossaryTerm";
import { PlainEnglishToggle } from "@/components/marketing/animations/PlainEnglishToggle";
import { PolicySectionCards, type PolicySection } from "@/components/marketing/animations/PolicySectionCards";
import { Badge } from "@/components/ui/badge";

export default function TermsPage() {
  const [plainEnglishMode, setPlainEnglishMode] = useState(false);

  const sections = useMemo<PolicySection[]>(
    () => [
      {
        id: "acceptable-use",
        title: "Acceptable Use",
        content: (
          <>
            ACTIFY must be used for lawful care operations. Facilities are responsible for maintaining accurate account
            data, staff access permissions, and proper handling of credentials.
          </>
        )
      },
      {
        id: "account-responsibility",
        title: "Account Responsibility",
        content: (
          <>
            Admins manage users and roles. Use of shared credentials is discouraged. All actions can appear in an{" "}
            <GlossaryTerm
              term="Audit Trail"
              definition="A log of user actions tied to timestamp and actor."
              plainEnglishMode={plainEnglishMode}
            />{" "}
            for compliance and troubleshooting.
          </>
        )
      },
      {
        id: "service-availability",
        title: "Service Availability",
        content: (
          <>
            We aim for reliable uptime and safe updates. Temporary interruptions may occur for maintenance, incident
            response, or infrastructure events outside direct control.
          </>
        )
      },
      {
        id: "records-retention",
        title: "Records & Retention",
        content: (
          <>
            Data retention follows configured facility policies, including{" "}
            <GlossaryTerm
              term="Retention"
              definition="The period data remains available before archive or deletion."
              plainEnglishMode={plainEnglishMode}
            />
            . Exported reports should be handled under your facility governance.
          </>
        )
      }
    ],
    [plainEnglishMode]
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <GlassPanel variant="warm" className="space-y-4">
        <Badge className="w-fit border-0 bg-actify-warm text-foreground">Terms</Badge>
        <h1 className="font-[var(--font-display)] text-4xl text-foreground">Terms of Use</h1>
        <p className="text-sm text-foreground/75">Last updated: February 13, 2026</p>
        <PlainEnglishToggle enabled={plainEnglishMode} onEnabledChange={setPlainEnglishMode} />
      </GlassPanel>

      <PolicySectionCards sections={sections} />
    </div>
  );
}
