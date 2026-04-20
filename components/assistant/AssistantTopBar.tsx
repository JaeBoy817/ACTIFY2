"use client";

import { Clock3, MessageSquarePlus, MoreHorizontal, Sparkles } from "lucide-react";

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
    <header className="rounded-[1.7rem] border border-white/85 bg-white/90 px-4 py-3 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.35)] backdrop-blur md:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-violet-200/70 bg-[radial-gradient(circle_at_35%_30%,#ffffff_0%,#ede9fe_32%,#ddd6fe_70%,#c4b5fd_100%)] text-violet-700 shadow-[0_8px_24px_-16px_rgba(139,92,246,0.8)]">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-slate-900">Actify Assistant</p>
            <p className="text-[11px] text-slate-500">Simple AI workspace for planning and note support</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNewChat}
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
            New Chat
          </button>

          <details className="group relative">
            <summary className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-800">
              <MoreHorizontal className="h-4 w-4" aria-hidden />
              <span className="sr-only">Assistant options</span>
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_22px_40px_-28px_rgba(15,23,42,0.45)]">
              <button
                type="button"
                onClick={() => onSelectTab(activeTab === "history" ? "chat" : "history")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden />
                  {activeTab === "history" ? "Back to Chat" : "Open History"}
                </span>
                <span className="text-slate-500">({historyCount})</span>
              </button>
              {activeModel ? (
                <p className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                  Model: <span className="font-medium text-slate-700">{activeModel}</span>
                </p>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
