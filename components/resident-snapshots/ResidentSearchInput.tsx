import { Search } from "lucide-react";

export function ResidentSearchInput({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm shadow-slate-200/60 focus-within:border-teal-300 focus-within:ring-2 focus-within:ring-teal-100">
      <Search className="h-4 w-4 text-slate-400" aria-hidden />
      <span className="sr-only">Search resident snapshots</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search name, room, tags, interests..."
        className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
      />
    </label>
  );
}
