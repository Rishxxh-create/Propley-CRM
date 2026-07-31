"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Label,
} from "recharts";
import { RiArrowRightUpLine } from "react-icons/ri";
import { useLeadSourceStats } from "@/store/hooks/useEventStats";
import { Skeleton } from "@/components/ui/skeleton";
import { BRAND_LOGO_PATHS, brandLogoForLeadSource } from "@/lib/brand-logos";
import { getLeadSourceLabel, resolveLeadSourceId } from "@/lib/lead-source-options";

type LeadSourceChartDatum = {
  source: string;
  count: number;
  sourceId: string;
};

type LegendPayloadEntry = {
  value?: string | number;
  payload?: object;
};

type LegendContentProps = {
  payload?: ReadonlyArray<LegendPayloadEntry>;
};

const getBrandColor = (source: string) => {
  const key = source.toLowerCase();
  if (key.includes('google')) return '#4285F4';
  if (key.includes('facebook')) return '#1877F2';
  if (key.includes('instagram')) return '#E1306C';
  if (key.includes('linkedin')) return '#0A66C2';
  if (key.includes('whatsapp')) return '#25D366';
  return '#B09B5F'; // default primary
};

const renderCustomLegend = (props: LegendContentProps, onSourceClick: (sourceId: string) => void) => {
  const { payload } = props;
  if (!payload?.length) return null;

  return (
    <ul className="flex flex-col gap-2 m-0 p-0 pl-4 list-none justify-center">
      {payload.map((entry, index) => {
        const sourceName = String(entry.value ?? '');
        const chartDatum = entry.payload as LeadSourceChartDatum | undefined;
        const sourceId = chartDatum?.sourceId || resolveLeadSourceId(sourceName) || sourceName.toLowerCase();
        const logoKey = brandLogoForLeadSource(sourceId);

        return (
          <li key={`item-${index}`}>
            <button
              type="button"
              onClick={() => onSourceClick(sourceId)}
              className="flex w-full items-center gap-3 text-xs font-medium text-zinc-600 cursor-pointer rounded-md px-1 py-0.5 -mx-1 transition-colors hover:text-ink hover:bg-stone/50"
            >
              {sourceId === 'referral' ? (
                <div className="w-4 h-4 bg-[#A67C52] rounded-full flex items-center justify-center text-white shrink-0">
                  <RiArrowRightUpLine size={10} />
                </div>
              ) : logoKey ? (
                <img
                  src={BRAND_LOGO_PATHS[logoKey]}
                  alt={sourceName}
                  className="w-4 h-4 object-contain"
                />
              ) : (
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: getBrandColor(sourceId) }}
                />
              )}
              <span className="flex-1 text-left">{sourceName}</span>
              <span className="font-semibold text-ink">{chartDatum?.count ?? 0}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export function LeadSourcesChart() {
  const router = useRouter();
  const { stats, loading } = useLeadSourceStats();

  const navigateToSource = useCallback(
    (sourceId: string) => {
      router.push(`/pipeline?source=${encodeURIComponent(sourceId)}`);
    },
    [router]
  );

  const data = useMemo(() => {
    if (!stats) return [];

    const aggregated = stats.reduce((acc, curr) => {
      const sourceId = resolveLeadSourceId(curr.source) || curr.source.toLowerCase();
      const displaySource = getLeadSourceLabel(curr.source) || (curr.source.charAt(0).toUpperCase() + curr.source.slice(1).toLowerCase());
      const existing = acc.find((item) => item.sourceId === sourceId);
      if (existing) {
        existing.count += curr.count;
      } else {
        acc.push({ ...curr, source: displaySource, sourceId });
      }
      return acc;
    }, [] as LeadSourceChartDatum[]);

    // Sort by count descending
    return aggregated.sort((a, b) => b.count - a.count);
  }, [stats]);

  const totalLeads = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.count, 0);
  }, [data]);

  if (loading) {
    return (
      <div className="w-full border border-stone-alt bg-white rounded-xl overflow-hidden flex flex-col h-full">
        <div className="p-5 sm:p-6 border-b border-stone-alt flex items-center gap-4">
          <div>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="p-5 sm:p-6 flex-1 flex flex-col h-[280px]">
          <Skeleton className="w-full h-full" />
        </div>
      </div>
    );
  }

  if (!stats || stats.length === 0 || data.length === 0) {
    return (
      <div className="w-full border border-stone-alt bg-white rounded-xl overflow-hidden flex flex-col h-full">
        <div className="p-5 sm:p-6 border-b border-stone-alt flex items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-ink tracking-tight leading-none mb-1.5">
              Lead Sources
            </h3>
            <p className="text-[12px] font-medium text-zinc-400 leading-none">
              Top sources for client acquisition
            </p>
          </div>
        </div>
        <div className="p-5 sm:p-6 flex-1 flex flex-col h-[280px] items-center justify-center">
          <p className="text-sm text-zinc-500 font-medium">Waiting for AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border border-stone-alt bg-white rounded-xl overflow-hidden flex flex-col h-full">
      <div className="p-5 sm:p-6 border-b border-stone-alt flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-ink tracking-tight leading-none mb-1.5">
            Lead Sources
          </h3>
          <p className="text-[12px] font-medium text-zinc-400 leading-none">
            Top sources for client acquisition
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-ink leading-none">{totalLeads}</p>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1.5">Total Leads</p>
        </div>
      </div>

      <div className="p-5 sm:p-6 flex-1 flex flex-col h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={`grad-${index}`} id={`colorUv-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getBrandColor(entry.source)} stopOpacity={0.7} />
                  <stop offset="95%" stopColor={getBrandColor(entry.source)} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              cx="45%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="count"
              nameKey="source"
              stroke="none"
              className="cursor-pointer"
              onClick={(_, index) => {
                const entry = data[index];
                if (entry?.sourceId) navigateToSource(entry.sourceId);
              }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#colorUv-${index})`} />
              ))}
              <Label
                position="center"
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="central">
                        <tspan x={viewBox.cx} y={(viewBox.cy as number) - 5} className="fill-ink text-3xl font-bold">
                          {totalLeads}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy as number) + 16} className="fill-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                          Leads
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1A1A1A",
                color: "#fff",
                border: "none",
                borderRadius: "0px",
                fontSize: "12px",
                padding: "8px 12px",
              }}
              itemStyle={{ color: "#fff" }}
              formatter={(value, name) => [`${value ?? 0} Leads`, String(name ?? '')]}
            />
            <Legend
              content={(props) => renderCustomLegend(props, navigateToSource)}
              layout="vertical"
              verticalAlign="middle"
              align="right"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
