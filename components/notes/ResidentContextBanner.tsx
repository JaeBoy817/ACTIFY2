"use client";

import { ExternalLink, HeartPulse, ShieldAlert, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";

type ResidentContext = {
  id: string;
  name: string;
  room: string;
  status: string;
  preferences: string[];
  safety: string[];
};

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ResidentContextBanner({
  resident,
  href
}: {
  resident: ResidentContext;
  href: string;
}) {
  return (
    <section className="rounded-2xl border border-white/25 bg-white/75 p-4 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-foreground/65">
            <UserRound className="h-3.5 w-3.5 text-[color:var(--actify-accent)]" />
            Resident Context
          </p>
          <h2 className="mt-1 font-[var(--font-display)] text-2xl text-foreground">{resident.name}</h2>
          <p className="text-sm text-muted-foreground">
            Room {resident.room} · {formatStatus(resident.status)}
          </p>
        </div>
        <Button asChild variant="outline" className="bg-white/80">
          <a href={href} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1.5 h-4 w-4" />
            View Resident
          </a>
        </Button>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-foreground/60">
            <HeartPulse className="h-3.5 w-3.5 text-emerald-600" />
            Preferences
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {resident.preferences.length > 0 ? (
              resident.preferences.map((item) => (
                <span key={item} className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                  {item}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No preferences recorded.</span>
            )}
          </div>
        </div>

        <div>
          <p className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-foreground/60">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
            Safety
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {resident.safety.length > 0 ? (
              resident.safety.map((item) => (
                <span key={item} className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                  {item}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No safety notes recorded.</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
