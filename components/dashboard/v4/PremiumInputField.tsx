import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

export function PremiumInputField({
  name,
  placeholder,
  shortcut,
  className
}: {
  name?: string;
  placeholder: string;
  shortcut?: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "relative flex h-11 items-center rounded-full border border-emerald-900/65 bg-[linear-gradient(180deg,#10231b_0%,#0d1d16_100%)] px-3 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_28px_-24px_rgba(16,185,129,0.55)]",
        className
      )}
    >
      <Search className="h-4 w-4 text-emerald-200/75" aria-hidden />
      <input
        type="search"
        name={name}
        placeholder={placeholder}
        className="h-full w-full bg-transparent px-2 text-sm text-emerald-50 placeholder:text-emerald-200/50 focus:outline-none"
      />
      {shortcut ? (
        <kbd className="rounded-md border border-emerald-800/70 bg-[#123227] px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200/75">
          {shortcut}
        </kbd>
      ) : null}
    </label>
  );
}
