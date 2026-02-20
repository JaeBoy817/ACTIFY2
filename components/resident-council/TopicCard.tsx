import {
  Activity,
  BadgeHelp,
  BedSingle,
  Building2,
  ChefHat,
  HandHelping,
  HeartPulse,
  Shirt,
  Sparkles,
  Wrench
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ResidentCouncilSection, ResidentCouncilTopicCategory, ResidentCouncilTopicEntry } from "@/lib/resident-council/types";
import { cn } from "@/lib/utils";

const categoryThemeMap: Record<ResidentCouncilTopicCategory, { icon: typeof Activity; tone: string }> = {
  Activities: { icon: Sparkles, tone: "from-violet-500/30 to-fuchsia-500/10 text-violet-700" },
  Nursing: { icon: HeartPulse, tone: "from-rose-500/30 to-orange-500/10 text-rose-700" },
  Therapy: { icon: HandHelping, tone: "from-sky-500/30 to-indigo-500/10 text-sky-700" },
  Dietary: { icon: ChefHat, tone: "from-amber-500/30 to-orange-500/10 text-amber-700" },
  Housekeeping: { icon: BedSingle, tone: "from-cyan-500/30 to-blue-500/10 text-cyan-700" },
  Laundry: { icon: Shirt, tone: "from-teal-500/30 to-emerald-500/10 text-teal-700" },
  Maintenance: { icon: Wrench, tone: "from-slate-500/30 to-zinc-500/10 text-slate-700" },
  "Social Services": { icon: BadgeHelp, tone: "from-green-500/30 to-emerald-500/10 text-green-700" },
  Administration: { icon: Building2, tone: "from-blue-500/30 to-cyan-500/10 text-blue-700" },
  Other: { icon: Activity, tone: "from-neutral-400/30 to-neutral-300/10 text-neutral-700" }
};

export function TopicCard({
  topic,
  section
}: {
  topic: Pick<ResidentCouncilTopicEntry, "text" | "category" | "tags">;
  section: ResidentCouncilSection;
}) {
  const theme = categoryThemeMap[topic.category] ?? categoryThemeMap.Other;
  const Icon = theme.icon;

  return (
    <div className="rounded-xl border border-white/40 bg-white/75 p-3 shadow-lg shadow-black/10">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1 rounded-lg border border-white/30 bg-gradient-to-br px-2 py-1 text-xs font-medium", theme.tone)}>
          <Icon className="h-3.5 w-3.5" />
          {topic.category}
        </span>
        <Badge variant="outline" className="bg-white/80 text-[10px] uppercase tracking-wide">
          {section === "OLD" ? "Old Business" : "New Business"}
        </Badge>
      </div>
      <p className="text-sm text-foreground/85">{topic.text}</p>
      {topic.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {topic.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="bg-white/80 text-[10px]">
              #{tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
