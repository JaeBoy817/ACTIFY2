import { CheckCircle2, RotateCcw } from "lucide-react";

import {
  AccentTag,
  Eyebrow,
  MattePanel,
  PrimaryCta,
  PublicContainer,
  PublicSection,
  SecondaryCta
} from "@/components/public/PublicPrimitives";

export const dynamic = "force-static";

export default function SignedOutPage() {
  return (
    <div className="pb-16 pt-10">
      <PublicContainer>
        <PublicSection>
          <div className="mx-auto grid max-w-[980px] gap-5 md:grid-cols-[1.1fr_0.9fr]">
            <MattePanel className="border-zinc-900 bg-zinc-900 p-8 text-zinc-100">
              <Eyebrow className="text-zinc-400">Signed out</Eyebrow>
              <h1 className="mt-3 font-[var(--font-display)] text-5xl leading-[0.96] md:text-6xl">
                You’re signed out.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-zinc-300">
                Your day is saved. Come back anytime to continue scheduling, documentation, and resident follow-up.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <PrimaryCta href="/sign-in">Sign back in</PrimaryCta>
                <SecondaryCta href="/">Go to home</SecondaryCta>
              </div>
            </MattePanel>
            <MattePanel className="space-y-3 p-5">
              <AccentTag icon={CheckCircle2} label="Session closed successfully" />
              {[
                "Calendar scheduling and attendance tracking",
                "Notes + 1:1 documentation workflows",
                "Care plan follow-up and resident insights",
                "Inventory, council updates, and reporting"
              ].map((line) => (
                <div key={line} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                  {line}
                </div>
              ))}
              <PrimaryCta href="/sign-in" className="w-full justify-center">
                <RotateCcw className="mr-1 h-4 w-4" />
                Return to Actify
              </PrimaryCta>
            </MattePanel>
          </div>
        </PublicSection>
      </PublicContainer>
    </div>
  );
}
