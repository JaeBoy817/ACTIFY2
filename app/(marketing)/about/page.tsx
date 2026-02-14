import { GlassPanel } from "@/components/glass/GlassPanel";
import { OrbitFeatureShowcase } from "@/components/marketing/animations/OrbitFeatureShowcase";
import { WorkflowTimeline } from "@/components/marketing/animations/WorkflowTimeline";
import { Badge } from "@/components/ui/badge";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <GlassPanel variant="warm" className="space-y-4">
        <Badge className="w-fit border-0 bg-actify-warm text-foreground">About ACTIFY</Badge>
        <h1 className="font-[var(--font-display)] text-4xl text-foreground">Built to make activity documentation easier.</h1>
        <p className="max-w-3xl text-foreground/80">
          ACTIFY helps SNF, Memory Care, and ALF teams capture quality documentation, run better programs, and track engagement outcomes without the usual paperwork drag.
        </p>
      </GlassPanel>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Practical workflows",
            body: "Calendar, templates, attendance, and notes are connected so teams can move quickly."
          },
          {
            title: "Cleaner data",
            body: "Attendance, barriers, and goal evidence are structured for better reporting and follow-through."
          },
          {
            title: "Team friendly",
            body: "Designed for Activity Directors and assistants with role-based access and clear daily actions."
          }
        ].map((item) => (
          <GlassPanel key={item.title} variant="dense" className="space-y-2 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-foreground">{item.title}</h2>
            <p className="text-sm text-foreground/75">{item.body}</p>
          </GlassPanel>
        ))}
      </div>

      <GlassPanel variant="dense" className="rounded-2xl p-5">
        <WorkflowTimeline />
      </GlassPanel>

      <OrbitFeatureShowcase />
    </div>
  );
}
