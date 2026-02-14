"use client";

import { Switch } from "@/components/ui/switch";

type PlainEnglishToggleProps = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
};

export function PlainEnglishToggle({ enabled, onEnabledChange }: PlainEnglishToggleProps) {
  return (
    <label className="inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/75 px-3 py-2 text-sm text-foreground">
      <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      <span className="font-medium">Plain English Mode</span>
    </label>
  );
}
