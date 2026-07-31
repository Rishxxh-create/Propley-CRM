'use client';

import { useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useMeetingsReport } from '@/store/hooks/useReports';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  CartesianGrid,
  ReferenceLine,
  Label,
} from 'recharts';
import {
  RiGroupLine,
  RiPlayCircleLine,
  RiCheckDoubleLine,
  RiPercentLine,
  RiFireLine,
  RiPhoneLine,
  RiArrowRightUpLine,
  RiSpyLine,
  RiZzzLine,
  RiQuestionLine,
  RiThunderstormsLine,
} from 'react-icons/ri';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type {
  MeetingEngagementDist,
  MeetingInteractionDist,
  MeetingsReportResponse,
} from '@/lib/api/types/reports';

/* ─── helpers ─── */

function cleanName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .replace(/\bSir\b\.?/gi, '')
    .replace(/\bMam\b\.?/gi, '')
    .replace(/\bMaam\b\.?/gi, '')
    .replace(/\bMa'am\b/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\bTest\b\s*-?\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

interface MergedLead {
  name: string;
  engagement: number;
  interactions: number;
  priority: number;
  meetingId: number;
}

function buildMergedLeads(report: MeetingsReportResponse): MergedLead[] {
  const interactionMap = new Map<number, number>();
  report.interaction_distribution.forEach((d) => {
    interactionMap.set(d.meeting_id, d.interactions);
  });

  const nameMap = new Map<number, string>();
  report.engagement_distribution.forEach((d) => {
    nameMap.set(d.meeting_id, d.meeting_for);
  });

  // Build from engagement (it has names)
  const leads: MergedLead[] = report.engagement_distribution.map((d) => {
    const interactions = interactionMap.get(d.meeting_id) ?? 0;
    return {
      name: cleanName(d.meeting_for),
      engagement: d.engagement,
      interactions,
      priority: Math.round(d.engagement * 0.7 + interactions * 0.3),
      meetingId: d.meeting_id,
    };
  });

  return leads.sort((a, b) => b.priority - a.priority);
}

type Bucket = 'Cold' | 'Warm' | 'Hot' | 'Very Hot';

function getBucket(engagement: number): Bucket {
  if (engagement <= 20) return 'Cold';
  if (engagement <= 40) return 'Warm';
  if (engagement <= 60) return 'Hot';
  return 'Very Hot';
}

function getQuadrant(engagement: number, interactions: number, medEng: number, medInt: number): string {
  if (engagement >= medEng && interactions >= medInt) return 'Hot Leads';
  if (engagement >= medEng && interactions < medInt) return 'Silent Opportunities';
  if (engagement < medEng && interactions >= medInt) return 'Confused Prospects';
  return 'Cold Leads';
}

function getPriorityLabel(priority: number): { label: string; style: string } {
  if (priority >= 50) return { label: 'Urgent', style: 'bg-red-50 text-red-600 border-red-100' };
  if (priority >= 30) return { label: 'High', style: 'bg-amber-50 text-amber-700 border-amber-100' };
  if (priority >= 15) return { label: 'Medium', style: 'bg-blue-50 text-blue-600 border-blue-100' };
  return { label: 'Low', style: 'bg-zinc-100 text-zinc-500 border-zinc-200' };
}

function getAction(lead: MergedLead): string {
  if (lead.engagement >= 50 && lead.interactions >= 50) return 'Schedule follow-up call now';
  if (lead.engagement >= 40 && lead.interactions < 20) return 'Send a WhatsApp check-in';
  if (lead.engagement >= 30) return 'Share new property options';
  if (lead.interactions >= 50 && lead.engagement < 30) return 'Clarify client requirements';
  if (lead.engagement < 10) return 'Re-engage with fresh content';
  return 'Monitor and nurture';
}

/* ─── sub-components ─── */

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
  delay = 0,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  accent?: string;
  delay?: number;
}) {
  return (
    <motion.div {...fadeIn} transition={{ ...fadeIn.transition, delay }}>
      <Card className="rounded-xl border border-stone-alt bg-white p-5 shadow-none!">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accent || 'bg-stone')}>
            <Icon size={16} className="text-white" />
          </div>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.12em]">{label}</p>
        </div>
        <p className="text-3xl font-semibold tracking-tight text-ink">{value}</p>
      </Card>
    </motion.div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-1">
      <h3 className="text-lg font-semibold text-ink tracking-tight leading-none mb-1.5">{title}</h3>
      <p className="text-[12px] font-medium text-zinc-400 leading-none">{subtitle}</p>
    </div>
  );
}

/* ─── custom tooltip ─── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink text-stone rounded-lg px-3 py-2 text-xs font-medium border border-white/10">
      <p className="font-semibold mb-1">{label ?? payload[0]?.payload?.name}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-stone/80">
          {p.name}: <span className="text-white font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-ink text-stone rounded-lg px-3 py-2 text-xs font-medium border border-white/10">
      <p className="font-semibold mb-1">{d.name}</p>
      <p className="text-stone/80">
        Engagement: <span className="text-white font-semibold">{d.engagement}</span>
      </p>
      <p className="text-stone/80">
        Interactions: <span className="text-white font-semibold">{d.interactions}</span>
      </p>
      <p className="text-gold mt-1 font-semibold">{d.quadrant}</p>
    </div>
  );
}

/* ─── skeleton ─── */
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="rounded-xl border border-stone-alt bg-white p-5 shadow-none!">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-8 w-8 rounded-lg bg-zinc-200" />
              <Skeleton className="h-3 w-20 rounded-lg bg-zinc-200" />
            </div>
            <Skeleton className="h-8 w-16 rounded-lg bg-zinc-200 mt-2" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="rounded-xl border border-stone-alt bg-white shadow-none! h-[360px] p-6">
            <Skeleton className="h-5 w-48 rounded-lg bg-zinc-200 mb-2" />
            <Skeleton className="h-3 w-64 rounded-lg bg-zinc-100 mb-6" />
            <div className="flex items-end gap-2 h-[240px]">
              {[60, 80, 40, 90, 50, 70].map((h, j) => (
                <Skeleton key={j} className={`w-full rounded-t-md bg-zinc-100`} style={{ height: `${h}%` }} />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── chart colors ─── */

const DONUT_COLORS_STATUS = ['#8B6B3F', '#E2D5C0'];
const DONUT_COLORS_BUCKET: Record<Bucket, string> = {
  'Very Hot': '#DC2626',
  Hot: '#F59E0B',
  Warm: '#8B6B3F',
  Cold: '#D4D4D8',
};

const QUADRANT_COLORS: Record<string, string> = {
  'Hot Leads': '#DC2626',
  'Silent Opportunities': '#8B6B3F',
  'Confused Prospects': '#F59E0B',
  'Cold Leads': '#A1A1AA',
};

/* ─── page ─── */

export default function MeetingsReportPage() {
  const { report, loading } = useMeetingsReport();
  const [tableFilter, setTableFilter] = useState<'all' | 'urgent' | 'high'>('all');

  const mergedLeads = useMemo(() => (report ? buildMergedLeads(report) : []), [report]);

  const completionRate = report ? Math.round((report.completed / report.total) * 100) : 0;

  /* top 10 charts */
  const topEngaged = useMemo(() => mergedLeads.slice(0, 10).map((l) => ({ name: l.name, engagement: l.engagement })), [mergedLeads]);
  const topInteractive = useMemo(
    () =>
      [...mergedLeads]
        .sort((a, b) => b.interactions - a.interactions)
        .slice(0, 10)
        .map((l) => ({ name: l.name, interactions: l.interactions })),
    [mergedLeads]
  );

  /* donut — status */
  const statusData = report
    ? [
        { name: 'Active', value: report.active },
        { name: 'Completed', value: report.completed },
      ]
    : [];

  /* donut — engagement buckets */
  const bucketData = useMemo(() => {
    const counts: Record<Bucket, number> = { Cold: 0, Warm: 0, Hot: 0, 'Very Hot': 0 };
    mergedLeads.forEach((l) => counts[getBucket(l.engagement)]++);
    return (Object.entries(counts) as [Bucket, number][])
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [mergedLeads]);

  /* scatter data */
  const scatterData = useMemo(() => {
    if (!mergedLeads.length) return [];
    const engArr = mergedLeads.map((l) => l.engagement).sort((a, b) => a - b);
    const intArr = mergedLeads.map((l) => l.interactions).sort((a, b) => a - b);
    const medEng = engArr[Math.floor(engArr.length / 2)];
    const medInt = intArr[Math.floor(intArr.length / 2)];
    return mergedLeads.map((l) => ({
      name: l.name,
      engagement: l.engagement,
      interactions: l.interactions,
      quadrant: getQuadrant(l.engagement, l.interactions, medEng, medInt),
    }));
  }, [mergedLeads]);

  const medianEngagement = useMemo(() => {
    if (!mergedLeads.length) return 0;
    const sorted = mergedLeads.map((l) => l.engagement).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }, [mergedLeads]);

  const medianInteraction = useMemo(() => {
    if (!mergedLeads.length) return 0;
    const sorted = mergedLeads.map((l) => l.interactions).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }, [mergedLeads]);

  /* table data */
  const tableData = useMemo(() => {
    if (tableFilter === 'urgent') return mergedLeads.filter((l) => getPriorityLabel(l.priority).label === 'Urgent');
    if (tableFilter === 'high') return mergedLeads.filter((l) => ['Urgent', 'High'].includes(getPriorityLabel(l.priority).label));
    return mergedLeads;
  }, [mergedLeads, tableFilter]);

  /* action center */
  const actionLeads = useMemo(() => {
    const hot = mergedLeads.filter((l) => l.engagement >= 40 && l.interactions >= 40).slice(0, 3);
    const silent = mergedLeads.filter((l) => l.engagement >= 40 && l.interactions < 15).slice(0, 3);
    const top = mergedLeads.slice(0, 3);
    return { hot, silent, top };
  }, [mergedLeads]);

  return (
    <DashboardLayout activePath="/reports/meetings">
      <div className="space-y-10 px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full">
        {/* header */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-ink">
              Sales Intelligence
              <span className="text-gold">.</span>
            </h1>
            <p className="text-sm font-medium text-zinc-500">
              What should you do next? Your prospects at a glance.
            </p>
          </div>
          <div className="h-[2px] w-16 bg-gold" />
        </div>

        {loading || !report ? (
          <DashboardSkeleton />
        ) : (
          <div className="space-y-10">
            {/* ── KPI cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={RiGroupLine} label="Total Leads" value={report.total} accent="bg-ink" delay={0} />
              <KpiCard icon={RiPlayCircleLine} label="Active Leads" value={report.active} accent="bg-gold" delay={0.05} />
              <KpiCard icon={RiCheckDoubleLine} label="Completed" value={report.completed} accent="bg-emerald-600" delay={0.1} />
              <KpiCard icon={RiPercentLine} label="Close Rate" value={`${completionRate}%`} accent="bg-gold" delay={0.15} />
            </div>

            {/* ── row: status donut + bucket donut ── */}
            <motion.div {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* lead status */}
              <Card className="rounded-xl border border-stone-alt bg-white shadow-none! p-5 sm:p-6">
                <SectionHeader title="Lead Status" subtitle="Active vs completed sessions" />
                <div className="h-[240px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} strokeWidth={0}>
                        {statusData.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS_STATUS[i]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 mt-2">
                  {statusData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS_STATUS[i] }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </Card>

              {/* engagement segments */}
              <Card className="rounded-xl border border-stone-alt bg-white shadow-none! p-5 sm:p-6">
                <SectionHeader title="Engagement Segments" subtitle="How warm are your prospects?" />
                <div className="h-[240px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={bucketData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} strokeWidth={0}>
                        {bucketData.map((d) => (
                          <Cell key={d.name} fill={DONUT_COLORS_BUCKET[d.name as Bucket]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 flex-wrap mt-2">
                  {bucketData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS_BUCKET[d.name as Bucket] }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* ── row: top 10 engaged + top 10 interactive ── */}
            <motion.div {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.15 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* most engaged */}
              <Card className="rounded-xl border border-stone-alt bg-white shadow-none! overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-stone-alt">
                  <SectionHeader title="Most Engaged Prospects" subtitle="Top 10 by engagement score" />
                </div>
                <div className="p-5 sm:p-6 h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topEngaged} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#1A1A1A', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f4f4f5' }} />
                      <Bar dataKey="engagement" radius={[0, 6, 6, 0]} barSize={20} fill="#8B6B3F" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* most interactive */}
              <Card className="rounded-xl border border-stone-alt bg-white shadow-none! overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-stone-alt">
                  <SectionHeader title="Most Interactive Meetings" subtitle="Top 10 by interaction count" />
                </div>
                <div className="p-5 sm:p-6 h-[380px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topInteractive} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#1A1A1A', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f4f4f5' }} />
                      <Bar dataKey="interactions" radius={[0, 6, 6, 0]} barSize={20} fill="#1A1A1A" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>

            {/* ── scatter: engagement vs interaction ── */}
            <motion.div {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.2 }}>
              <Card className="rounded-xl border border-stone-alt bg-white shadow-none! overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-stone-alt">
                  <SectionHeader title="Engagement vs Interaction Map" subtitle="Each dot is a prospect — find your hot leads" />
                </div>
                <div className="p-5 sm:p-6 h-[440px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                      <XAxis
                        type="number"
                        dataKey="interactions"
                        name="Interactions"
                        tick={{ fill: '#71717a', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      >
                        <Label value="Interactions →" position="bottom" offset={0} style={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }} />
                      </XAxis>
                      <YAxis
                        type="number"
                        dataKey="engagement"
                        name="Engagement"
                        tick={{ fill: '#71717a', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      >
                        <Label value="Engagement →" angle={-90} position="insideLeft" offset={10} style={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 500 }} />
                      </YAxis>
                      <ZAxis range={[40, 200]} />
                      <ReferenceLine x={medianInteraction} stroke="#d4d4d8" strokeDasharray="4 4" />
                      <ReferenceLine y={medianEngagement} stroke="#d4d4d8" strokeDasharray="4 4" />
                      <Tooltip content={<ScatterTooltip />} />
                      {Object.entries(QUADRANT_COLORS).map(([quadrant, color]) => (
                        <Scatter
                          key={quadrant}
                          name={quadrant}
                          data={scatterData.filter((d) => d.quadrant === quadrant)}
                          fill={color}
                          opacity={0.8}
                        />
                      ))}
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div className="px-6 pb-5 flex items-center gap-6 flex-wrap">
                  {Object.entries(QUADRANT_COLORS).map(([q, c]) => (
                    <div key={q} className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c }} />
                      {q}
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            {/* ── priority table ── */}
            <motion.div {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.25 }}>
              <Card className="rounded-xl border border-stone-alt bg-white shadow-none! overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-stone-alt flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <SectionHeader title="Lead Priority Board" subtitle="Sorted by priority score — engagement × 0.7 + interactions × 0.3" />
                  <div className="flex items-center gap-2">
                    {(['all', 'high', 'urgent'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setTableFilter(f)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors border',
                          tableFilter === f
                            ? 'bg-ink text-white border-ink'
                            : 'bg-white text-zinc-500 border-stone-alt hover:border-gold/40'
                        )}
                      >
                        {f === 'all' ? 'All' : f === 'high' ? 'High+' : 'Urgent'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-stone-alt bg-stone/30">
                        <th className="text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.12em] px-5 py-3">Prospect</th>
                        <th className="text-center text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.12em] px-5 py-3">Engagement</th>
                        <th className="text-center text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.12em] px-5 py-3">Interactions</th>
                        <th className="text-center text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.12em] px-5 py-3">Priority</th>
                        <th className="text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.12em] px-5 py-3">Next Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.slice(0, 25).map((lead, idx) => {
                        const p = getPriorityLabel(lead.priority);
                        return (
                          <tr key={lead.meetingId} className="border-b border-stone-alt/50 hover:bg-stone/20 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ink to-zinc-700 text-[11px] font-bold text-white">
                                  {lead.name.charAt(0)}
                                </div>
                                <span className="text-sm font-semibold text-ink">{lead.name}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className="h-1.5 w-16 rounded-full bg-stone-alt overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gold"
                                    style={{ width: `${Math.min(100, (lead.engagement / 80) * 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-ink tabular-nums">{lead.engagement}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-center text-xs font-semibold text-zinc-600 tabular-nums">{lead.interactions}</td>
                            <td className="px-5 py-3.5 text-center">
                              <span className={cn('inline-flex border px-2 py-0.5 text-[10px] font-bold rounded-md', p.style)}>
                                {p.label}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-xs font-medium text-zinc-500">{getAction(lead)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {tableData.length > 25 && (
                  <div className="px-5 py-3 border-t border-stone-alt text-xs font-medium text-zinc-400 text-center">
                    Showing top 25 of {tableData.length} leads
                  </div>
                )}
              </Card>
            </motion.div>

            {/* ── action center ── */}
            <motion.div {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.3 }}>
              <div className="space-y-4">
                <SectionHeader title="Action Center" subtitle="Your most important follow-ups right now" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* hot leads */}
                  <Card className="rounded-xl border border-stone-alt bg-white shadow-none! p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50">
                        <RiFireLine size={14} className="text-red-500" />
                      </div>
                      <p className="text-xs font-semibold text-ink">Hot — call now</p>
                    </div>
                    <div className="space-y-3">
                      {actionLeads.hot.length === 0 ? (
                        <p className="text-xs text-zinc-400 font-medium">No hot leads right now</p>
                      ) : (
                        actionLeads.hot.map((l) => (
                          <div key={l.meetingId} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-6 w-6 rounded-md bg-red-50 flex items-center justify-center text-[10px] font-bold text-red-600 shrink-0">
                                {l.name.charAt(0)}
                              </div>
                              <span className="text-xs font-semibold text-ink truncate">{l.name}</span>
                            </div>
                            <span className="text-[10px] font-bold text-gold tabular-nums shrink-0">{l.engagement}%</span>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  {/* silent opportunities */}
                  <Card className="rounded-xl border border-stone-alt bg-white shadow-none! p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                        <RiSpyLine size={14} className="text-amber-600" />
                      </div>
                      <p className="text-xs font-semibold text-ink">Silent — re-engage</p>
                    </div>
                    <div className="space-y-3">
                      {actionLeads.silent.length === 0 ? (
                        <p className="text-xs text-zinc-400 font-medium">No silent opportunities</p>
                      ) : (
                        actionLeads.silent.map((l) => (
                          <div key={l.meetingId} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-6 w-6 rounded-md bg-amber-50 flex items-center justify-center text-[10px] font-bold text-amber-700 shrink-0">
                                {l.name.charAt(0)}
                              </div>
                              <span className="text-xs font-semibold text-ink truncate">{l.name}</span>
                            </div>
                            <span className="text-[10px] font-bold text-gold tabular-nums shrink-0">{l.engagement}%</span>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  {/* top engagement */}
                  <Card className="rounded-xl border border-stone-alt bg-white shadow-none! p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/10">
                        <RiThunderstormsLine size={14} className="text-gold" />
                      </div>
                      <p className="text-xs font-semibold text-ink">Highest engagement</p>
                    </div>
                    <div className="space-y-3">
                      {actionLeads.top.map((l) => (
                        <div key={l.meetingId} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-6 w-6 rounded-md bg-gold/10 flex items-center justify-center text-[10px] font-bold text-gold shrink-0">
                              {l.name.charAt(0)}
                            </div>
                            <span className="text-xs font-semibold text-ink truncate">{l.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-gold tabular-nums shrink-0">{l.engagement}%</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
