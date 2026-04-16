export function AttendanceBreakdownList({
  items
}: {
  items: Array<{ label: string; count: number }>;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No attendance breakdown available yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.slice(0, 6).map((item) => (
        <li
          key={`${item.label}-${item.count}`}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-700"
        >
          <span>{item.label}</span>
          <span className="font-semibold text-slate-900">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}
