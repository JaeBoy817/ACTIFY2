import Link from "next/link";

import { GlassButton } from "@/components/glass/GlassButton";
import { GlassCard } from "@/components/glass/GlassCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { requireFacilityContext } from "@/lib/auth";

export default async function BillingPage() {
  const context = await requireFacilityContext();

  return (
    <div className="space-y-6">
      <GlassPanel variant="warm" className="relative overflow-hidden">
        <h1 className="font-[var(--font-display)] text-3xl text-foreground">Billing</h1>
        <p className="mt-2 text-sm text-foreground/75">Billing tools are available per facility configuration.</p>
      </GlassPanel>

      <GlassCard>
        <h2 className="text-lg font-semibold text-foreground">Facility Workspace</h2>
        <p className="mt-2 text-sm text-foreground/70">{context.facility.name}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <GlassButton asChild>
            <Link href="/pricing">Open Pricing</Link>
          </GlassButton>
          <GlassButton asChild variant="dense">
            <Link href="/app/settings?tab=reports">Back to Settings</Link>
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  );
}
