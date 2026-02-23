"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

import type { SettingsTabs as SettingsTabsComponent } from "@/app/app/settings/_components/SettingsTabs";

type SettingsTabsLazyProps = ComponentProps<typeof SettingsTabsComponent>;

const SettingsTabsClient = dynamic<SettingsTabsLazyProps>(
  () => import("@/app/app/settings/_components/SettingsTabs").then((mod) => mod.SettingsTabs),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="glass-panel h-28 animate-pulse rounded-2xl border-white/20" />
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="glass-panel h-[720px] animate-pulse rounded-2xl border-white/20" />
          <div className="glass-panel h-[720px] animate-pulse rounded-2xl border-white/20" />
        </div>
      </div>
    )
  }
);

export function SettingsTabsLazy(props: SettingsTabsLazyProps) {
  return <SettingsTabsClient {...props} />;
}
