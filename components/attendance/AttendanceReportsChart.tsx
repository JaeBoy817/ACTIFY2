"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function AttendanceReportsChart({
  data
}: {
  data: Array<{ dateKey: string; total: number }>;
}) {
  return (
    <div className="h-[260px] w-full rounded-xl border border-white/25 bg-white/55 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="dateKey" tick={{ fontSize: 11 }} tickMargin={8} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.35)",
              background: "rgba(255,255,255,0.94)"
            }}
          />
          <Line type="monotone" dataKey="total" stroke="#38D9A9" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

