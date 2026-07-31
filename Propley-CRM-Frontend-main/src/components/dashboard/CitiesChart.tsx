"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { useCityStats } from "@/store/hooks/useEventStats";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = [
  "#B09B5F", // primary
  "#C0B07F", 
  "#D0C59F",
  "#E0DABF",
  "#F0EFDF",
];

export function CitiesChart() {
  const { stats, loading } = useCityStats();

  const data = useMemo(() => {
    if (!stats) return [];
    
    // Sort by count descending
    return [...stats]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(s => ({
        ...s,
        city: s.city ? s.city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : 'Unknown'
      }));
  }, [stats]);

  if (loading) {
    return (
      <div className="w-full border border-stone-alt bg-white rounded-xl overflow-hidden flex flex-col h-full">
        <div className="p-5 sm:p-6 border-b border-stone-alt flex items-center gap-4">
          <div>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="p-5 sm:p-6 w-full h-[320px]">
          <Skeleton className="w-full h-full" />
        </div>
      </div>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <div className="w-full border border-stone-alt bg-white rounded-xl overflow-hidden flex flex-col h-full">
        <div className="p-5 sm:p-6 border-b border-stone-alt flex items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-ink tracking-tight leading-none mb-1.5">
              Top Cities
            </h3>
            <p className="text-[12px] font-medium text-zinc-400 leading-none">
              Geographic distribution of inquiries
            </p>
          </div>
        </div>
        <div className="p-5 sm:p-6 w-full h-[320px] flex items-center justify-center">
          <p className="text-sm text-zinc-500 font-medium">Waiting for AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border border-stone-alt bg-white rounded-xl overflow-hidden flex flex-col h-full">
      <div className="p-5 sm:p-6 border-b border-stone-alt flex items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-ink tracking-tight leading-none mb-1.5">
            Top Cities
          </h3>
          <p className="text-[12px] font-medium text-zinc-400 leading-none">
            Geographic distribution of inquiries
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-6 w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={`grad-city-${index}`} id={`colorCity-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.7} />
                  <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
            <XAxis
              dataKey="city"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#52525b", fontSize: 11, fontWeight: 500 }}
              dy={10}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "#f4f4f5" }}
              contentStyle={{
                backgroundColor: "#1A1A1A",
                color: "#FBFBFA",
                border: "none",
                borderRadius: "0px",
                fontSize: "12px",
                padding: "8px 12px",
              }}
              itemStyle={{ color: "#FBFBFA" }}
              formatter={(value: any) => [value, "Count"] as any}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={32}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#colorCity-${index})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
