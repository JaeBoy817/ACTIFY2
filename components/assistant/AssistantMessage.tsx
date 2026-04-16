import { Clipboard, RefreshCcw, Sparkles } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { formatAssistantResponse } from "@/lib/assistant/formatAssistantResponse";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type AssistantMessageProps = {
  message: ChatMessage;
  isLastAssistant: boolean;
  isLoading: boolean;
  copyState: "idle" | "copied";
  onCopy: (id: string, text: string) => void;
  onRegenerate: () => void;
};

function inferCardLabel(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("progress note") || lower.includes("1:1 note")) return "Note Support";
  if (lower.includes("calendar") || lower.includes("week") || lower.includes("plan")) return "Planning";
  if (lower.includes("activity") || lower.includes("group") || lower.includes("resident")) return "Ideas";
  return "Assistant Response";
}

const markdownComponents: Components = {
  h1: ({ children }) => <h4 className="mt-4 text-base font-semibold leading-7 text-slate-900">{children}</h4>,
  h2: ({ children }) => <h4 className="mt-4 text-base font-semibold leading-7 text-slate-900">{children}</h4>,
  h3: ({ children }) => <h5 className="mt-3 text-[15px] font-semibold leading-7 text-slate-900">{children}</h5>,
  p: ({ children }) => <p className="mt-3 text-[15px] leading-7 text-slate-800">{children}</p>,
  ul: ({ children }) => <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] leading-7 text-slate-800">{children}</ul>,
  ol: ({ children }) => <ol className="mt-3 list-decimal space-y-2 pl-6 text-[15px] leading-7 text-slate-800">{children}</ol>,
  li: ({ children }) => <li className="pl-1 marker:text-slate-500">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-800">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="mt-3 border-l-2 border-sky-200 bg-sky-50/60 px-3 py-2 text-[15px] leading-7 text-slate-700">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-slate-200" />,
  code: ({ inline, children }) =>
    inline ? (
      <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800">{children}</code>
    ) : (
      <code className="font-mono text-[13px] leading-6 text-slate-100">{children}</code>
    ),
  pre: ({ children }) => (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-950/95 p-3 text-[13px] leading-6 text-slate-100">
      {children}
    </pre>
  )
};

export function AssistantMessage({
  message,
  isLastAssistant,
  isLoading,
  copyState,
  onCopy,
  onRegenerate
}: AssistantMessageProps) {
  const isAssistant = message.role === "assistant";
  const formattedAssistantText = isAssistant ? formatAssistantResponse(message.text) : message.text;
  const cardLabel = isAssistant ? inferCardLabel(formattedAssistantText) : null;
  const isNoteSupport = cardLabel === "Note Support";

  return (
    <article
      className={cn(
        "transition duration-200",
        isAssistant
          ? "max-w-[96%] rounded-[1.55rem] border border-slate-200/95 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_18px_36px_-28px_rgba(15,23,42,0.55)]"
          : "ml-auto max-w-[86%] rounded-[1.35rem] border border-slate-200 bg-[linear-gradient(180deg,#eef2ff_0%,#f8fafc_100%)]"
      )}
    >
      <div className={cn("px-4 py-3.5", isAssistant ? "sm:px-5 sm:py-4" : "")}> 
        {isAssistant ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {cardLabel}
            </div>
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Actify Assistant</span>
          </div>
        ) : (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">You</p>
        )}

        {isAssistant ? (
          <div
            className={cn(
              "break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
              isNoteSupport ? "rounded-2xl border border-slate-200/85 bg-slate-50/60 px-3 py-2.5 sm:px-4" : ""
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {formattedAssistantText}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-700">{message.text}</div>
        )}
      </div>

      {isAssistant ? (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-200/90 bg-white/70 px-4 py-2.5 sm:px-5">
          <button
            type="button"
            onClick={() => onCopy(message.id, formattedAssistantText)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <Clipboard className="h-3.5 w-3.5" aria-hidden />
            {copyState === "copied" ? "Copied" : "Copy"}
          </button>
          {isLastAssistant ? (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
              Try Another Response
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
