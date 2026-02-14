import Link from "next/link";

import { GlassPanel } from "@/components/glass/GlassPanel";
import { Badge } from "@/components/ui/badge";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <GlassPanel variant="warm" className="space-y-4">
        <Badge className="w-fit border-0 bg-actify-warm text-foreground">Contact</Badge>
        <h1 className="font-[var(--font-display)] text-4xl text-foreground">We’re here to help your team succeed.</h1>
        <p className="text-foreground/80">
          Reach out for onboarding support, workflow questions, or implementation guidance.
        </p>
      </GlassPanel>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassPanel variant="dense" className="space-y-2 rounded-2xl p-5">
          <h2 className="text-lg font-semibold">General support</h2>
          <p className="text-sm text-foreground/75">Email: actifysupport@gmail.com</p>
          <p className="text-sm text-foreground/75">Hours: Monday-Friday, 8:00 AM-5:00 PM (ET)</p>
        </GlassPanel>

        <GlassPanel variant="dense" className="space-y-2 rounded-2xl p-5">
          <h2 className="text-lg font-semibold">Product and partnerships</h2>
          <p className="text-sm text-foreground/75">Email: partnerships@actify.app</p>
          <p className="text-sm text-foreground/75">
            Need implementation details first? Visit our{" "}
            <Link href="/docs" className="font-medium text-primary underline-offset-4 hover:underline">
              product docs
            </Link>.
          </p>
        </GlassPanel>
      </div>
    </div>
  );
}
