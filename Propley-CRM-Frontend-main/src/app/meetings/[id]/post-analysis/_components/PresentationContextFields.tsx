'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { PresentationContextState } from './presentation-context';

const SIDEBAR_FIELDS = [
  { key: 'property', label: 'Immersive Property' },
  { key: 'clientName', label: 'Lead Client' },
  { key: 'sessionDate', label: 'Session Timestamp', muted: true },
  { key: 'salesMember', label: 'Active Advisor' },
] as const;

const MOBILE_FIELDS = [
  { key: 'property', label: 'Property' },
  { key: 'clientName', label: 'Client' },
  { key: 'sessionDate', label: 'Session', muted: true },
  { key: 'salesMember', label: 'Advisor' },
] as const;

function ContextFieldSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className={cn('space-y-1.5', compact && 'min-w-0')}>
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-4 w-24 sm:w-28" />
    </div>
  );
}

type Props = {
  context: PresentationContextState;
  variant: 'sidebar' | 'mobile';
};

export function PresentationContextFields({ context, variant }: Props) {
  const fields = variant === 'sidebar' ? SIDEBAR_FIELDS : MOBILE_FIELDS;
  const skeletonCount = variant === 'sidebar' ? 4 : 4;

  if (context.status === 'loading') {
    if (variant === 'mobile') {
      return (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <ContextFieldSkeleton key={i} compact />
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ContextFieldSkeleton key={i} />
        ))}
      </div>
    );
  }

  const entries = fields
    .map((field) => ({
      ...field,
      value: context[field.key],
    } as { key: string; label: string; muted?: boolean; value: string | null }))
    .filter((field) => field.value);

  if (entries.length === 0) return null;

  if (variant === 'mobile') {
    return (
      <>
        {entries.map((field) => (
          <div key={field.key} className="min-w-0">
            <p className="text-[10px] font-medium text-zinc-400">{field.label}</p>
            <p
              className={cn(
                'truncate text-xs font-semibold',
                field.muted ? 'text-zinc-500' : 'text-ink',
              )}
            >
              {field.value}
            </p>
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((field) => (
        <div key={field.key}>
          <p className="text-[10px] text-zinc-400 font-medium">{field.label}</p>
          <p
            className={cn(
              'text-xs font-semibold',
              field.muted ? 'text-zinc-500' : 'text-ink',
            )}
          >
            {field.value}
          </p>
        </div>
      ))}
    </div>
  );
}
