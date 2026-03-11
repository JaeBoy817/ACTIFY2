import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

export function AttendanceSearchField({
  value,
  onChange,
  placeholder,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "relative flex h-10 items-center rounded-full border border-[#2c416a] bg-[linear-gradient(180deg,#0f1b33_0%,#0c172c_100%)] px-3",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_22px_-20px_rgba(56,189,248,0.75)]",
        className
      )}
    >
      <Search className="h-4 w-4 text-[#8ea7d2]" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full w-full bg-transparent px-2 text-sm text-[#deebff] placeholder:text-[#7f97bf] focus:outline-none"
      />
    </label>
  );
}

