"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function AnalyticsBarChart({
  data,
  barColor = "#8B5CF6",
  horizontal = false
}: {
  data: Array<{ label: string; value: number }>;
  barColor?: string;
  horizontal?: boolean;
}) {
  if (horizontal) {
    return (
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="label" type="category" width={190} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill={barColor} radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-28} textAnchor="end" height={72} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" fill={barColor} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
