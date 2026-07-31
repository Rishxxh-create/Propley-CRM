'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { TEAM_MEMBERS, type MeetingStatus } from '@/lib/mock-data';
import { UniversalSelect } from '@/components/UniversalSelect';
import { useAppSelector } from '@/store/hooks';
import { selectProjects } from '@/store/selectors/projectsSelectors';
import type { PresentationFilters as Filters } from '@/lib/presentations-store';
import { PAGE } from '@/lib/copy';
import { cn } from '@/lib/utils';

const STATUSES: (MeetingStatus | 'all')[] = [
  'all',
  'Live',
  'Scheduled',
  'Completed',
  'Canceled',
];

const DATE_PRESETS: Filters['datePreset'][] = ['all', 'today', 'week', 'month'];

interface PresentationFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function PresentationFiltersBar({ filters, onChange }: PresentationFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const syncUrl = useCallback(
    (next: Filters) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.status && next.status !== 'all') params.set('status', next.status);
      else params.delete('status');
      if (next.advisorName) params.set('advisor', next.advisorName);
      else params.delete('advisor');
      if (next.project) params.set('project', next.project);
      else params.delete('project');
      if (next.datePreset && next.datePreset !== 'all') params.set('date', next.datePreset);
      else params.delete('date');
      const q = params.toString();
      router.replace(q ? `/meetings?${q}` : '/meetings', { scroll: false });
    },
    [router, searchParams]
  );

  const patch = (partial: Partial<Filters>) => {
    const next = { ...filters, ...partial };
    onChange(next);
    syncUrl(next);
  };

  const advisorOptions = TEAM_MEMBERS.map((m) => ({
    id: m.name,
    name: m.name,
    subtitle: m.department,
  }));

  const projects = useAppSelector(selectProjects);
  const projectOptions = projects.map((d) => ({
    id: d.name,
    name: d.name,
  }));

  return (
    <div className="flex flex-col gap-4 border border-stone-alt bg-stone/30 p-4 md:flex-row md:flex-wrap md:items-end">
      <div className="space-y-2">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-zinc-400">
          {PAGE.presentations.filters.status}
        </p>
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => patch({ status: s })}
              className={cn(
                'px-3 py-2 text-xs font-semibold transition-colors',
                (filters.status ?? 'all') === s
                  ? 'bg-ink text-ivory'
                  : 'bg-ivory text-zinc-500 hover:text-ink border border-stone-alt'
              )}
            >
              {s === 'all' ? PAGE.presentations.filters.all : s}
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-[180px] flex-1 space-y-2">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-zinc-400">
          {PAGE.presentations.filters.advisor}
        </p>
        <UniversalSelect
          value={filters.advisorName ?? ''}
          onChange={(name) =>
            patch({
              advisorName: name || undefined,
              advisorId: TEAM_MEMBERS.find((m) => m.name === name)?.id,
            })
          }
          options={[{ id: '', name: PAGE.presentations.filters.all }, ...advisorOptions]}
          placeholder={PAGE.presentations.filters.all}
          enableSearch
        />
      </div>

      <div className="min-w-[180px] flex-1 space-y-2">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-zinc-400">
          {PAGE.presentations.filters.project}
        </p>
        <UniversalSelect
          value={filters.project ?? ''}
          onChange={(project) => patch({ project: project || undefined })}
          options={[{ id: '', name: PAGE.presentations.filters.all }, ...projectOptions]}
          placeholder={PAGE.presentations.filters.all}
          enableSearch
        />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-zinc-400">
          {PAGE.presentations.filters.date}
        </p>
        <div className="flex flex-wrap gap-1">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => patch({ datePreset: preset })}
              className={cn(
                'px-3 py-2 text-xs font-semibold transition-colors',
                (filters.datePreset ?? 'all') === preset
                  ? 'bg-gold/10 text-gold border border-gold/30'
                  : 'bg-ivory text-zinc-500 border border-stone-alt hover:text-ink'
              )}
            >
              {preset === 'all' && PAGE.presentations.filters.all}
              {preset === 'today' && PAGE.presentations.filters.today}
              {preset === 'week' && PAGE.presentations.filters.week}
              {preset === 'month' && PAGE.presentations.filters.month}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
