"use client";

import { CircleDot, History, MessageSquarePlus, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type AssistantTopBarProps = {
  activeTab: "chat" | "history";
  historyCount: number;
  activeModel: string | null;
  onSelectTab: (tab: "chat" | "history") => void;
  onNewChat: () => void;
};

export function AssistantTopBar({
  activeTab,
  historyCount,
  activeModel,
  onSelectTab,
  onNewChat
}: AssistantTopBarProps) {
  return (
    <header className="rounded-[1.7rem] border border-white/80 bg-white/85 px-4 py-3 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.4)] backdrop-blur md:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-violet-200/70 bg-[radial-gradient(circle_at_35%_30%,#ffffff_0%,#ede9fe_32%,#ddd6fe_70%,#c4b5fd_100%)] text-violet-700 shadow-[0_8px_24px_-16px_rgba(139,92,246,0.8)]">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-slate-900">Actify Assistant</p>
            <p className="text-[11px] text-slate-500">Planning, notes, and resident support in one place</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
            <CircleDot className="h-2.5 w-2.5 fill-current" aria-hidden />
            Ready
          </span>
          {activeModel ? (
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-600">
              {activeModel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-slate-200 bg-slate-100/85 p-1">
          <button
            type="button"
            onClick={() => onSelectTab("chat")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              activeTab === "chat" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"
            )}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => onSelectTab("history")}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              activeTab === "history" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"
            )}
          >
            <History className="h-3.5 w-3.5" aria-hidden />
            History
            <span className="text-[10px] text-slate-500">({historyCount})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:-translate-y-0.5 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
          New Chat
        </button>
      </div>
    </header>
  );
}

