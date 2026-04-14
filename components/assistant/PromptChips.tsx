import { PromptChip } from "@/components/assistant-dashboard/PromptChip";

type PromptChipsProps = {
  prompts: string[];
  activePrompt: string | null;
  onPickPrompt: (prompt: string) => void;
};

export function PromptChips({ prompts, activePrompt, onPickPrompt }: PromptChipsProps) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Assistant quick prompts">
      {prompts.map((prompt) => (
        <PromptChip
          key={prompt}
          label={prompt}
          active={activePrompt === prompt}
          onClick={() => onPickPrompt(prompt)}
        />
      ))}
    </div>
  );
}
