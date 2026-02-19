"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, LineChart, Sparkles } from "lucide-react";

import { GlassCard } from "@/components/glass/GlassCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export type DashboardPreferences = {
  showReportsQuickAction: boolean;
  showCarePlanQuickAction: boolean;
  showAnalyticsPreviewCard: boolean;
  showExtraWidgetsInActivityFeed: boolean;
};

const DASHBOARD_PREFERENCES_KEY = "actify:dashboard:preferences:v1";

const defaultPreferences: DashboardPreferences = {
  showReportsQuickAction: true,
  showCarePlanQuickAction: true,
  showAnalyticsPreviewCard: true,
  showExtraWidgetsInActivityFeed: false
};

function readPreferences(): DashboardPreferences {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_PREFERENCES_KEY);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw) as Partial<DashboardPreferences>;
    return {
      ...defaultPreferences,
      ...parsed
    };
  } catch {
    return defaultPreferences;
  }
}

function writePreferences(next: DashboardPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DASHBOARD_PREFERENCES_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("actify:dashboard-preferences-updated", { detail: next }));
}

export function useDashboardPreferences() {
  const [preferences, setPreferences] = useState<DashboardPreferences>(defaultPreferences);

  useEffect(() => {
    setPreferences(readPreferences());

    const onUpdated = (event: Event) => {
      const custom = event as CustomEvent<DashboardPreferences>;
      if (custom.detail) {
        setPreferences({
          ...defaultPreferences,
          ...custom.detail
        });
        return;
      }
      setPreferences(readPreferences());
    };

    window.addEventListener("actify:dashboard-preferences-updated", onUpdated as EventListener);
    window.addEventListener("storage", onUpdated);

    return () => {
      window.removeEventListener("actify:dashboard-preferences-updated", onUpdated as EventListener);
      window.removeEventListener("storage", onUpdated);
    };
  }, []);

  const update = useMemo(
    () => (next: DashboardPreferences) => {
      setPreferences(next);
      writePreferences(next);
    },
    []
  );

  return {
    preferences,
    update
  };
}

export function DashboardSettingsPanel() {
  const { preferences, update } = useDashboardPreferences();

  const toggle = (key: keyof DashboardPreferences) => {
    update({
      ...preferences,
      [key]: !preferences[key]
    });
  };

  const reset = () => update(defaultPreferences);

  return (
    <div className="space-y-4">
      <GlassCard variant="dense" className="rounded-2xl p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Dashboard Preferences</h2>
          <p className="text-sm text-foreground/70">Keep home minimal. Toggle optional shortcuts and extra widgets.</p>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/45 bg-white/70 px-3 py-2.5">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              {preferences.showReportsQuickAction ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-foreground/60" />}
              Show Reports quick action
            </span>
            <Switch checked={preferences.showReportsQuickAction} onCheckedChange={() => toggle("showReportsQuickAction")} />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/45 bg-white/70 px-3 py-2.5">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              {preferences.showCarePlanQuickAction ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-foreground/60" />}
              Show Care Plan quick action
            </span>
            <Switch checked={preferences.showCarePlanQuickAction} onCheckedChange={() => toggle("showCarePlanQuickAction")} />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/45 bg-white/70 px-3 py-2.5">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              {preferences.showAnalyticsPreviewCard ? <LineChart className="h-4 w-4 text-actifyBlue" /> : <LineChart className="h-4 w-4 text-foreground/60" />}
              Show Analytics preview card
            </span>
            <Switch checked={preferences.showAnalyticsPreviewCard} onCheckedChange={() => toggle("showAnalyticsPreviewCard")} />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/45 bg-white/70 px-3 py-2.5">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              {preferences.showExtraWidgetsInActivityFeed ? <Sparkles className="h-4 w-4 text-amber-600" /> : <Sparkles className="h-4 w-4 text-foreground/60" />}
              Enable extra widgets in Activity Feed
            </span>
            <Switch checked={preferences.showExtraWidgetsInActivityFeed} onCheckedChange={() => toggle("showExtraWidgetsInActivityFeed")} />
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <Button type="button" variant="outline" onClick={reset}>
            Reset to default
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

export const dashboardPreferencesStorage = {
  key: DASHBOARD_PREFERENCES_KEY,
  defaults: defaultPreferences,
  read: readPreferences
};
