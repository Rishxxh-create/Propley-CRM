import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, cols = 6, className }: TableSkeletonProps) {
  return (
    <div className={cn('divide-y divide-stone-alt', className)}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-5 py-4 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={cn('h-4 animate-pulse rounded-md bg-zinc-200', c === 0 ? 'w-32 sm:w-48' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
