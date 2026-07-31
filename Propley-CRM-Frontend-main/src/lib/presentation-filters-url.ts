import type { ReadonlyURLSearchParams } from 'next/navigation';
import { TEAM_MEMBERS, type MeetingStatus } from '@/lib/mock-data';
import type { PresentationFilters } from '@/lib/presentations-store';

export function resolveAdvisorFromName(name?: string): Pick<PresentationFilters, 'advisorId' | 'advisorName'> {
  if (!name) return { advisorName: undefined, advisorId: undefined };
  const member = TEAM_MEMBERS.find((m) => m.name === name);
  return { advisorName: name, advisorId: member?.id };
}

export function filtersFromSearchParams(params: URLSearchParams): PresentationFilters {
  const status = params.get('status');
  const date = params.get('date');
  const advisorName = params.get('advisor') || undefined;
  return {
    status: (status as MeetingStatus) || 'all',
    ...resolveAdvisorFromName(advisorName),
    project: params.get('project') || undefined,
    datePreset:
      date === 'today' || date === 'week' || date === 'month' || date === 'custom'
        ? date
        : 'all',
  };
}

export function filtersToSearchParams(
  filters: PresentationFilters,
  base?: URLSearchParams | ReadonlyURLSearchParams
): URLSearchParams {
  const params = new URLSearchParams(base?.toString() ?? '');
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  else params.delete('status');
  if (filters.advisorName) params.set('advisor', filters.advisorName);
  else params.delete('advisor');
  if (filters.project) params.set('project', filters.project);
  else params.delete('project');
  if (filters.datePreset && filters.datePreset !== 'all') params.set('date', filters.datePreset);
  else params.delete('date');
  return params;
}

export function meetingsFiltersHref(filters: PresentationFilters): string {
  const q = filtersToSearchParams(filters).toString();
  return q ? `/meetings?${q}` : '/meetings';
}
