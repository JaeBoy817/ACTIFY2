"use client";

import { AlertCircle, CheckCircle2, Loader2, PencilLine } from "lucide-react";

import { cn } from "@/lib/utils";

export type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveStatusChip({
  state,
  message
}: {
  state: SaveState;
  message?: string;
}) {
  const content = (() => {
    if (state === "saving") {
      return {
        icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
        label: message || "Saving...",
        className: "border-sky-300 bg-sky-100 text-sky-700"
      };
    }

    if (state === "saved") {
      return {
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        label: message || "Saved",
        className: "border-emerald-300 bg-emerald-100 text-emerald-700"
      };
    }

    if (state === "error") {
      return {
        icon: <AlertCircle className="h-3.5 w-3.5" />,
        label: message || "Could not save",
        className: "border-rose-300 bg-rose-100 text-rose-700"
      };
    }

    return {
      icon: <PencilLine className="h-3.5 w-3.5" />,
      label: message || "Not saved",
      className: "border-white/40 bg-white/70 text-foreground/75"
    };
  })();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm",
        content.className
      )}
      aria-live="polite"
    >
      {content.icon}
      {content.label}
    </span>
  );
}
