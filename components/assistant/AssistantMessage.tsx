import { Clipboard, RefreshCcw } from "lucide-react";

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

export function AssistantMessage({
  message,
  isLastAssistant,
  isLoading,
  copyState,
  onCopy,
  onRegenerate
}: AssistantMessageProps) {
  const isAssistant = message.role === "assistant";

  return (
    <article
      className={
        message.role === "user"
          ? "ml-auto max-w-[85%] rounded-2xl rounded-tr-md border border-sky-200 bg-sky-50 px-3 py-2.5"
          : "max-w-[92%] rounded-2xl rounded-tl-md border border-slate-200 bg-white px-3 py-2.5"
      }
    >
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{message.text}</p>

      {isAssistant ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onCopy(message.id, message.text)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <Clipboard className="h-3.5 w-3.5" aria-hidden />
            {copyState === "copied" ? "Copied" : "Copy Response"}
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            Use in Note Studio
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            Send to Calendar Builder
          </button>
          {isLastAssistant ? (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
              Regenerate
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
