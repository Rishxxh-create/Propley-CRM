'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { IconType } from 'react-icons';
import {
  RiAppsLine,
  RiBuilding2Line,
  RiCalendar2Line,
  RiCalendarEventLine,
  RiCalendarScheduleLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiCloseLine,
  RiFilter3Line,
  RiListCheck,
  RiRecordCircleLine,
  RiRefreshLine,
  RiUser3Line,
} from 'react-icons/ri';
import { UniversalSelect } from '@/components/UniversalSelect';
import { TEAM_MEMBERS, type MeetingStatus } from '@/lib/mock-data';
import { useAppSelector } from '@/store/hooks';
import { selectProjects } from '@/store/selectors/projectsSelectors';
import type { PresentationFilters } from '@/lib/presentations-store';
import { filtersToSearchParams, resolveAdvisorFromName } from '@/lib/presentation-filters-url';
import { PAGE } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

const STATUSES: (MeetingStatus | 'all')[] = [
  'all',
  'Live',
  'Scheduled',
  'Completed',
  'Canceled',
];

const STATUS_ICONS: Record<MeetingStatus | 'all', IconType> = {
  all: RiListCheck,
  Live: RiRecordCircleLine,
  Scheduled: RiCalendarScheduleLine,
  Completed: RiCheckboxCircleLine,
  Canceled: RiCloseCircleLine,
};

const DATE_PRESETS: PresentationFilters['datePreset'][] = ['all', 'today', 'week', 'month'];

const DATE_ICONS: Partial<Record<NonNullable<PresentationFilters['datePreset']>, IconType>> = {
  all: RiAppsLine,
  today: RiCalendarEventLine,
  week: RiCalendar2Line,
  month: RiCalendarScheduleLine,
  custom: RiCalendar2Line,
};

const EMPTY_FILTERS: PresentationFilters = { status: 'all', datePreset: 'all' };

export function normalizePresentationFilters(filters: PresentationFilters): PresentationFilters {
  return {
    status: filters.status && filters.status !== 'all' ? filters.status : 'all',
    datePreset: filters.datePreset && filters.datePreset !== 'all' ? filters.datePreset : 'all',
    advisorName: filters.advisorName || undefined,
    advisorId: filters.advisorId || undefined,
    project: filters.project || undefined,
  };
}

export function countActiveFilters(filters: PresentationFilters): number {
  const n = normalizePresentationFilters(filters);
  let count = 0;
  if (n.status && n.status !== 'all') count++;
  if (n.advisorName) count++;
  if (n.project) count++;
  if (n.datePreset && n.datePreset !== 'all') count++;
  return count;
}

interface PresentationFiltersFormProps {
  draft: PresentationFilters;
  onDraftChange: (filters: PresentationFilters) => void;
  onApply: () => void;
  onClear: () => void;
}

export function PresentationFiltersForm({
  draft,
  onDraftChange,
  onApply,
  onClear,
}: PresentationFiltersFormProps) {
  const patch = (partial: Partial<PresentationFilters>) => {
    onDraftChange(normalizePresentationFilters({ ...draft, ...partial }));
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
    <div className="flex flex-col gap-8">
      <section className="space-y-3">
        <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.14em] text-zinc-400">
          <RiAppsLine size={14} className="text-gold" />
          {PAGE.presentations.filters.status}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((s) => {
            const Icon = STATUS_ICONS[s];
            const active = (draft.status ?? 'all') === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => patch({ status: s })}
                className={cn(
                  'flex items-center gap-2 border px-3 py-2.5 text-left text-xs font-semibold transition-colors',
                  active
                    ? 'border-ink bg-ink text-ivory'
                    : 'border-stone-alt bg-ivory text-zinc-600 hover:border-gold/40'
                )}
              >
                <Icon
                  size={16}
                  className={cn(
                    'shrink-0',
                    active ? 'text-gold-light' : s === 'Live' ? 'text-gold' : 'text-zinc-400'
                  )}
                />
                {s === 'all' ? PAGE.presentations.filters.all : s}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 border-t border-stone-alt pt-6">
        <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.14em] text-zinc-400">
          <RiUser3Line size={14} className="text-gold" />
          {PAGE.presentations.filters.advisor}
        </p>
        <UniversalSelect
          value={draft.advisorName ?? ''}
          onChange={(name) => {
            if (!name) {
              patch({ advisorName: undefined, advisorId: undefined });
            } else {
              patch(resolveAdvisorFromName(name));
            }
          }}
          options={[{ id: '', name: PAGE.presentations.filters.all }, ...advisorOptions]}
          placeholder={PAGE.presentations.filters.all}
          enableSearch
        />
      </section>

      <section className="space-y-3 border-t border-stone-alt pt-6">
        <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.14em] text-zinc-400">
          <RiBuilding2Line size={14} className="text-gold" />
          {PAGE.presentations.filters.project}
        </p>
        <UniversalSelect
          value={draft.project ?? ''}
          onChange={(project) => patch({ project: project || undefined })}
          options={[{ id: '', name: PAGE.presentations.filters.all }, ...projectOptions]}
          placeholder={PAGE.presentations.filters.all}
          enableSearch
        />
      </section>

      <section className="space-y-3 border-t border-stone-alt pt-6">
        <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.14em] text-zinc-400">
          <RiCalendar2Line size={14} className="text-gold" />
          {PAGE.presentations.filters.date}
        </p>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => {
            const Icon = DATE_ICONS[preset ?? 'all'] ?? RiCalendar2Line;
            const active = (draft.datePreset ?? 'all') === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => patch({ datePreset: preset })}
                className={cn(
                  'inline-flex items-center gap-2 border px-3 py-2 text-xs font-semibold transition-colors',
                  active
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-stone-alt bg-ivory text-zinc-600 hover:border-gold/30'
                )}
              >
                <Icon size={15} className={active ? 'text-gold' : 'text-zinc-400'} />
                {preset === 'all' && PAGE.presentations.filters.all}
                {preset === 'today' && PAGE.presentations.filters.today}
                {preset === 'week' && PAGE.presentations.filters.week}
                {preset === 'month' && PAGE.presentations.filters.month}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex gap-3 border-t border-stone-alt pt-6">
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 gap-2 rounded-lg border-stone-alt text-xs font-semibold"
          onClick={onClear}
        >
          <RiRefreshLine size={16} />
          {PAGE.presentations.empty.clearFilters}
        </Button>
        <Button
          type="button"
          variant="propley"
          className="h-11 flex-1 rounded-lg text-xs font-semibold"
          onClick={onApply}
        >
          {PAGE.presentations.filters.apply}
        </Button>
      </div>
    </div>
  );
}

interface PresentationFiltersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: PresentationFilters;
  onApply: (filters: PresentationFilters) => void;
}

export function PresentationFiltersDrawer({
  open,
  onOpenChange,
  filters,
  onApply,
}: PresentationFiltersDrawerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<PresentationFilters>(() =>
    normalizePresentationFilters(filters)
  );

  const commit = (next: PresentationFilters) => {
    const normalized = normalizePresentationFilters(next);
    onApply(normalized);
    const params = filtersToSearchParams(normalized, searchParams);
    const q = params.toString();
    router.replace(q ? `/meetings?${q}` : '/meetings', { scroll: false });
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraft(normalizePresentationFilters(filters));
    }
    onOpenChange(next);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} direction="right">
      <DrawerContent className="flex h-full flex-col rounded-lg border-s border-stone-alt bg-ivory outline-none sm:w-[420px]">
        <div className="flex shrink-0 items-start justify-between border-b border-stone-alt px-6 py-5">
          <div>
            <DrawerTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">
              <RiFilter3Line className="text-gold" size={20} />
              {PAGE.presentations.filters.drawerTitle}
            </DrawerTitle>
            <p className="mt-1 text-xs font-medium text-zinc-500">
              {PAGE.presentations.filters.drawerHint}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="flex h-9 w-9 items-center justify-center border border-stone-alt text-zinc-400 transition-colors hover:border-gold/40 hover:text-ink"
            aria-label="Close filters"
          >
            <RiCloseLine size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
          <PresentationFiltersForm
            draft={draft}
            onDraftChange={setDraft}
            onApply={() => commit(draft)}
            onClear={() => commit(EMPTY_FILTERS)}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
