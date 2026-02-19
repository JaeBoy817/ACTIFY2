"use client";

import { cn } from "@/lib/utils";
import type { TemplateType } from "@/lib/templates/types";

type Segment = {
  value: TemplateType;
  label: string;
  count: number;
  enabled: boolean;
};

export function TemplateTypeSegmentedControl({
  value,
  segments,
  onChange
}: {
  value: TemplateType;
  segments: Segment[];
  onChange: (next: TemplateType) => void;
}) {
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-xl border border-white/35 bg-white/60 p-1 backdrop-blur"
      role="tablist"
      aria-label="Template type"
    >
      {segments.map((segment) => {
        const isActive = value === segment.value;
        return (
          <button
            key={segment.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={!segment.enabled}
            onClick={() => {
              if (segment.enabled) onChange(segment.value);
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition",
              "disabled:cursor-not-allowed disabled:opacity-45",
              isActive
                ? "bg-white text-foreground shadow-md"
                : "text-foreground/75 hover:bg-white/60 hover:text-foreground"
            )}
          >
            <span>{segment.label}</span>
            <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-xs">{segment.count}</span>
          </button>
        );
      })}
    </div>
  );
}

