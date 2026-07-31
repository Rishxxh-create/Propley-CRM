import type { MeetingStatus } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export function statusBadgeClass(status: MeetingStatus | string | undefined): string {
  if (status === 'Canceled') return 'bg-error-muted text-error border-error/30';
  if (status === 'Live') return 'bg-gold/10 text-gold border-gold/40';
  if (status === 'Completed') return 'bg-success-muted text-success border-success/35';
  return 'bg-stone text-zinc-600 border-stone-alt';
}

export function statusBadgeCn(status: MeetingStatus | string | undefined, className?: string) {
  return cn(
    'inline-flex border px-2 py-1 text-[10px] font-semibold',
    statusBadgeClass(status),
    className
  );
}

/** Calendar event accent — left bar + readable surface (no low-contrast gold wash) */
export function statusCalendarClass(status: MeetingStatus | string | undefined): string {
  if (status === 'Canceled') return 'border-l-4 border-l-error bg-error-muted/60';
  if (status === 'Live') return 'border-l-4 border-l-gold bg-ivory';
  if (status === 'Completed') return 'border-l-4 border-l-success bg-success-muted/50';
  return 'border-l-4 border-l-zinc-400 bg-ivory';
}

export function isTimelineComplete(
  status?: MeetingStatus | string,
  kind?: string
): boolean {
  if (kind === 'follow_up') return false;
  if (status === 'Completed' || status === 'closed') return true;
  if (kind === 'deal_stage' && status === 'closed') return true;
  return false;
}
