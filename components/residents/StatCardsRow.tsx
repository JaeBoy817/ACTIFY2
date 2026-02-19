"use client";

import { BedDouble, Flag, HeartHandshake, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { ResidentFilterKey } from "@/lib/residents/types";

type StatCardValue = {
  label: string;
  value: number;
  filter: ResidentFilterKey;
  icon: React.ReactNode;
  iconWrapClassName: string;
};

export function StatCardsRow({
  activeCount,
  bedBoundCount,
  oneToOneDueCount,
  followUpsCount,
  activeFilter,
  onFilterSelect
}: {
  activeCount: number;
  bedBoundCount: number;
  oneToOneDueCount: number;
  followUpsCount: number;
  activeFilter: ResidentFilterKey;
  onFilterSelect: (value: ResidentFilterKey) => void;
}) {
  const cards: StatCardValue[] = [
    {
      label: "Active",
      value: activeCount,
      filter: "ACTIVE",
      icon: <Users className="h-4 w-4 text-blue-700" />,
      iconWrapClassName: "bg-blue-100 ring-blue-300/60"
    },
    {
      label: "Bed Bound",
      value: bedBoundCount,
      filter: "BED_BOUND",
      icon: <BedDouble className="h-4 w-4 text-cyan-700" />,
      iconWrapClassName: "bg-cyan-100 ring-cyan-300/60"
    },
    {
      label: "1:1 Due",
      value: oneToOneDueCount,
      filter: "ALL",
      icon: <HeartHandshake className="h-4 w-4 text-amber-700" />,
      iconWrapClassName: "bg-amber-100 ring-amber-300/60"
    },
    {
      label: "Follow-ups",
      value: followUpsCount,
      filter: "ALL",
      icon: <Flag className="h-4 w-4 text-violet-700" />,
      iconWrapClassName: "bg-violet-100 ring-violet-300/60"
    }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const selected = activeFilter === card.filter || (card.filter === "ALL" && activeFilter === "ALL");
        return (
          <button
            key={card.label}
            type="button"
            onClick={() => onFilterSelect(card.filter)}
            className="text-left"
            aria-pressed={selected}
          >
            <Card
              className={`glass-panel rounded-2xl border-white/15 shadow-xl shadow-black/10 transition hover:translate-y-[-1px] ${
                selected ? "ring-2 ring-actifyBlue/45" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs uppercase tracking-wide text-foreground/70">{card.label}</p>
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ring-1 ${card.iconWrapClassName}`}>
                    {card.icon}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
