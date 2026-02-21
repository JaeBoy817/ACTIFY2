import { Quote } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";

export function QuoteFooter() {
  return (
    <GlassCard variant="dense" className="rounded-3xl bg-gradient-to-r from-violet-500/12 via-fuchsia-500/10 to-cyan-500/12 p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/35 bg-gradient-to-br from-violet-500/35 via-fuchsia-400/25 to-cyan-400/20 text-violet-800">
          <Quote className="h-4 w-4" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Keep today lightweight and consistent.</p>
          <p className="text-xs text-foreground/70">Fast actions first, deeper insights when needed.</p>
        </div>
      </div>
    </GlassCard>
  );
}
