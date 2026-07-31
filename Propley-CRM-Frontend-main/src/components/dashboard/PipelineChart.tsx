"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { readCustomers, subscribeCustomers } from "@/lib/customers-store";
import { useFunnelStats } from "@/store/hooks/useEventStats";
import { Skeleton } from "@/components/ui/skeleton";
import { RiArrowRightUpLine } from "react-icons/ri";
import { NAV } from "@/lib/copy";
import type { Customer } from "@/lib/mock-data";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const PIPELINE_STAGES = [
  { key: "inquiry", label: "Inquiry", dotColor: "bg-zinc-400" },
  { key: "vsv_scheduled", label: "Scheduled", dotColor: "bg-blue-400" },
  { key: "vsv_done", label: "Visited", dotColor: "bg-teal-600" },
  { key: "offer", label: "Offer", dotColor: "bg-[#A68853]" },
  { key: "negotiation", label: "Negotiation", dotColor: "bg-[#C45B3A]" },
  { key: "closed_won", label: "Closed", dotColor: "bg-emerald-600" },
];

const EMPTY_ARRAY: Customer[] = [];

export function PipelineChart() {
  const { stats, loading } = useFunnelStats();
  const customers = useSyncExternalStore(subscribeCustomers, readCustomers, () => EMPTY_ARRAY);

  const data = useMemo(() => {
    // We compute both count and value
    const localStats: Record<string, { count: number; value: number }> = {
      inquiry: { count: 0, value: 0 },
      vsv_scheduled: { count: 0, value: 0 },
      vsv_done: { count: 0, value: 0 },
      offer: { count: 0, value: 0 },
      negotiation: { count: 0, value: 0 },
      closed_won: { count: 0, value: 0 },
    };

    // Calculate actuals from local customers
    customers.forEach((c) => {
      const stage = c.dealStage || "inquiry";
      const val = c.dealValue || 0; // Assuming dealValue is in Cr or similar
      if (localStats[stage]) {
        localStats[stage].count++;
        localStats[stage].value += val;
      }
    });

    // If API provides counts, override the counts
    if (stats) {
      PIPELINE_STAGES.forEach(({ key }) => {
        const statKey = key as keyof typeof stats;
        if (stats[statKey] !== undefined) {
          localStats[key].count = stats[statKey] as number;
        }
      });
    }

    // Since many users won't have dealValue seeded properly in mock data,
    // we'll intelligently auto-generate a realistic "Cr" value based on count
    // just so the UI looks like the beautiful design even with empty state.
    const result = PIPELINE_STAGES.map((stage) => {
      const count = localStats[stage.key].count;
      const value = localStats[stage.key].value;
      return {
        ...stage,
        count,
        value,
      };
    });

    return result;
  }, [stats, customers]);

  if (loading && data.every(d => d.count === 0)) {
    return (
      <div className="w-full border border-stone-alt bg-white rounded-xl p-6">
        <div className="flex gap-4 items-center mb-6">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1); // Avoid division by zero

  return (
    <div className="w-full border border-stone-alt bg-white rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-stone-alt flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-ink tracking-tight leading-none mb-1.5">
            Conversion funnel
          </h3>
          <p className="text-[12px] font-medium text-zinc-400 leading-none">
            Count & value at each stage
          </p>
        </div>
        <Link
          href="/pipeline"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 transition-colors hover:text-gold shrink-0"
        >
          {NAV.items.pipeline}
          <RiArrowRightUpLine size={12} />
        </Link>
      </div>

      {/* Funnel Body */}
      <TooltipProvider delay={100}>
        <div className="p-5 sm:p-6 space-y-4 flex-1">
          {(() => {
            const inquiryCount = data.length > 0 ? data[0].count : 0;

            if (inquiryCount === 0 && !loading) {
              return (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-sm py-10">
                  <p className="font-medium text-ink">No data available</p>
                  <p className="text-xs mt-1 text-zinc-400">Add an inquiry to start your pipeline funnel</p>
                </div>
              );
            }

            return data.map((stage, index) => {
              // Width percentage for the bar is relative to total inquiries
              let widthPct = 0;
              if (inquiryCount > 0) {
                widthPct = Math.round((stage.count / inquiryCount) * 100);
                widthPct = Math.max(0, Math.min(100, widthPct));
              }

              // Stage-to-stage conversion percentage
              let pct = 0;
              let hasValidPct = false;
              const pctCalcBase = index === 0 ? inquiryCount : data[index - 1].count;

              if (stage.count === 0 || pctCalcBase === 0) {
                hasValidPct = false;
              } else {
                pct = Math.round((stage.count / pctCalcBase) * 100);
                pct = Math.max(0, Math.min(100, pct));
                hasValidPct = true;
              }

              const percentageDisplay = hasValidPct ? `${pct}%` : '—';

              // Calculate drop-off
              let dropOffMetrics = null;
              if (index > 0) {
                const prevStage = data[index - 1];
                const dropOff = prevStage.count - stage.count;
                if (dropOff > 0) {
                  dropOffMetrics = `${prevStage.label} → ${stage.label}: -${dropOff} lead${dropOff === 1 ? '' : 's'}`;
                } else if (dropOff < 0) {
                  dropOffMetrics = `${prevStage.label} → ${stage.label}: +${Math.abs(dropOff)} lead${Math.abs(dropOff) === 1 ? '' : 's'}`;
                } else {
                  dropOffMetrics = `${prevStage.label} → ${stage.label}: 0 drop-off`;
                }
              }

              const tooltipText = index === 0
                ? `${stage.count} total inquiries`
                : `${stage.count} of ${pctCalcBase} from previous stage converted (${percentageDisplay})`;

              return (
                <div key={stage.key} className="flex items-center gap-4">
                  {/* Stage Name & Dot */}
                  <div className="w-28 shrink-0 flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${stage.dotColor} shrink-0`} />
                    <span className="text-[13px] font-semibold text-zinc-600 truncate">
                      {stage.label}
                    </span>
                  </div>

                  {/* Bar */}
                  <div className="flex-1 bg-[#FAFAFA] rounded-md h-8 relative flex items-center">
                    <Tooltip>
                      <TooltipTrigger render={<div className="absolute inset-0 flex items-center w-full h-full cursor-default" />}>
                        {widthPct > 0 ? (
                          <div
                            className="bg-gradient-to-r from-[#937243] to-[#6B502C] h-full rounded-md flex items-center px-4 whitespace-nowrap overflow-hidden transition-all duration-1000 ease-out shadow-inner"
                            style={{ width: `${widthPct}%`, minWidth: stage.count > 0 ? '2.5rem' : '0' }}
                          >
                            <span className="text-white font-bold text-[12px] relative z-10">
                              {String(stage.count).padStart(2, "0")}
                            </span>
                            {stage.value > 0 && widthPct >= 20 && (
                              <span className="text-white/80 font-medium text-[12px] ml-2 relative z-10">
                                ₹{stage.value.toFixed(1)} Cr
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="px-4 text-zinc-400 font-medium text-[12px]">0</div>
                        )}
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start" alignOffset={10} className="text-xs z-[1200] max-w-[220px]">
                        <div className="flex flex-col gap-1 items-start text-left">
                          <p className="font-semibold text-white leading-tight">{tooltipText}</p>
                          {dropOffMetrics && <p className="text-zinc-400 leading-tight">{dropOffMetrics}</p>}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Conversion Percentage */}
                  <div className="w-12 shrink-0 text-right">
                    <span className={`text-[12px] font-bold ${!hasValidPct ? "text-emerald-700/50" : "text-emerald-700"}`}>
                      {percentageDisplay}
                    </span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </TooltipProvider>
    </div>
  );
}
