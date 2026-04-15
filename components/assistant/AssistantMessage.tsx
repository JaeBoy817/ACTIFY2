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
          ? "ml-auto max-w-[88%] rounded-[1.4rem] border border-slate-200 bg-slate-100 px-4 py-3"
          : "max-w-[94%] rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3.5"
      }
    >
      <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-800">{message.text}</p>

      {isAssistant ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onCopy(message.id, message.text)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <Clipboard className="h-3.5 w-3.5" aria-hidden />
            {copyState === "copied" ? "Copied" : "Copy Response"}
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            Use in Note Studio
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            Send to Calendar Builder
          </button>
          {isLastAssistant ? (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
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
