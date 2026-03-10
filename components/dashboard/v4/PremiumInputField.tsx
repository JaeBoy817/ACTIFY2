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
        "relative flex h-11 items-center rounded-full border border-[#2a3f67] bg-[linear-gradient(180deg,#0f1b33_0%,#0c1528_100%)] px-3 text-[#d9e7ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_28px_-24px_rgba(37,99,235,0.65)]",
        className
      )}
    >
      <Search className="h-4 w-4 text-blue-200/80" aria-hidden />
      <input
        type="search"
        name={name}
        placeholder={placeholder}
        className="h-full w-full bg-transparent px-2 text-sm text-[#d9e7ff] placeholder:text-[#8ea7d4] focus:outline-none"
      />
      {shortcut ? (
        <kbd className="rounded-md border border-[#334f7e] bg-[#132543] px-1.5 py-0.5 text-[10px] font-semibold text-[#a7c2ed]">
          {shortcut}
        </kbd>
      ) : null}
    </label>
  );
}
