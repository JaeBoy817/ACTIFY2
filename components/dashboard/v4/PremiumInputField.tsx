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
        "relative flex h-11 items-center rounded-full border border-[#344267] bg-[linear-gradient(180deg,#101a2c_0%,#0d1627_100%)] px-3 text-[#dbe8ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_28px_-24px_rgba(59,130,246,0.7)]",
        className
      )}
    >
      <Search className="h-4 w-4 text-[#8ea6d8]" aria-hidden />
      <input
        type="search"
        name={name}
        placeholder={placeholder}
        className="h-full w-full bg-transparent px-2 text-sm text-[#e8efff] placeholder:text-[#8194bd] focus:outline-none"
      />
      {shortcut ? (
        <kbd className="rounded-md border border-[#3b4b76] bg-[#131f35] px-1.5 py-0.5 text-[10px] font-semibold text-[#9bb1da]">
          {shortcut}
        </kbd>
      ) : null}
    </label>
  );
}
