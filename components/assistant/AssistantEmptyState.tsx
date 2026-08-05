"use client";

import type { ReactNode } from "react";

import { AssistantExampleCardGrid, type AssistantExampleCard } from "@/components/assistant/AssistantExampleCardGrid";
import { AssistantGreeting } from "@/components/assistant/AssistantGreeting";
import { AssistantOrb } from "@/components/assistant/AssistantOrb";
import BorderGlow from "@/components/ui/border-glow";

type AssistantEmptyStateProps = {
  name: string | null;
  activePrompt: string | null;
  cards: AssistantExampleCard[];
  onSelectPrompt: (prompt: string) => void;
  composer: ReactNode;
};

export function AssistantEmptyState({
  name,
  activePrompt,
  cards,
  onSelectPrompt,
  composer
}: AssistantEmptyStateProps) {
  return (
    <section className="assistant-empty-shell flex min-h-[65vh] w-full flex-col items-center justify-center px-2 py-8 md:px-6">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex justify-center">
          <AssistantOrb />
        </div>
        <AssistantGreeting name={name} />
        <div className="mx-auto w-full max-w-3xl">
          <BorderGlow
            edgeSensitivity={24}
            glowColor="188 88 58"
            backgroundColor="#ffffff"
            borderRadius={32}
            glowRadius={26}
            glowIntensity={0.72}
            coneSpread={20}
            fillOpacity={0.16}
            colors={["#0f766e", "#38bdf8", "#f59e0b"]}
          >
            {composer}
          </BorderGlow>
        </div>
        <div className="mx-auto w-full max-w-4xl">
          <AssistantExampleCardGrid cards={cards} activePrompt={activePrompt} onSelect={onSelectPrompt} />
        </div>
      </div>
    </section>
  );
}

