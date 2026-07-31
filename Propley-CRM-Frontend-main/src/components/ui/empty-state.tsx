import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  actionDisabled,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-8 py-16 text-center', className)}>
      {icon ? (
        <div className="mb-6 flex h-14 w-14 items-center justify-center border border-stone-alt bg-stone text-gold">
          {icon}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold tracking-tight text-ink">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm font-medium text-zinc-500">{description}</p>
      ) : null}
      {actionLabel && actionHref ? (
        <Link href={actionHref} className={cn(buttonVariants({ variant: 'propley' }), 'mt-8')}>
          {actionLabel}
        </Link>
      ) : null}
      {actionLabel && onAction && !actionHref ? (
        <Button
          variant="propley"
          className="mt-8"
          disabled={actionDisabled}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
