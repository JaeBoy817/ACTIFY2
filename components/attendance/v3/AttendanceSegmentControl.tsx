import { cn } from "@/lib/utils";

export type AttendanceSegmentOption<T extends string> = {
  value: T;
  label: string;
};

export function AttendanceSegmentControl<T extends string>({
  value,
  onChange,
  options,
  className
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<AttendanceSegmentOption<T>>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-full border border-[#26395f] bg-[#0b1427] p-1",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_28px_-24px_rgba(59,130,246,0.7)]",
        className
      )}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold tracking-[0.02em] transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/40",
              active
                ? "border border-blue-300/35 bg-[linear-gradient(180deg,#243f74_0%,#1a2f55_100%)] text-white shadow-[0_10px_20px_-15px_rgba(37,99,235,0.9)]"
                : "text-[#9ab0d6] hover:bg-[#13213b] hover:text-[#d3e2ff]"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

