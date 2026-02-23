"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import type { NoteBuilder as NoteBuilderComponent } from "@/components/notes/NoteBuilder";

type NoteBuilderLazyProps = ComponentProps<typeof NoteBuilderComponent>;

const NoteBuilderClient = dynamic<NoteBuilderLazyProps>(
  () => import("@/components/notes/NoteBuilder").then((mod) => mod.NoteBuilder),
  {
    loading: () => (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="glass-panel h-[780px] animate-pulse rounded-2xl border-white/25" />
        <div className="glass-panel h-[780px] animate-pulse rounded-2xl border-white/25" />
      </div>
    )
  }
);

export function NoteBuilderLazy(props: NoteBuilderLazyProps) {
  return <NoteBuilderClient {...props} />;
}
