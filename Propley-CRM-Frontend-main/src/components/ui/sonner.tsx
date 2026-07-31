'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast rounded-lg border border-stone-alt bg-ivory text-ink shadow-[0_12px_40px_-12px_rgba(26,26,26,0.2)]',
          title: 'text-sm font-semibold text-ink',
          description: 'text-xs font-medium text-zinc-500',
          success: '!border-success/40 !bg-success-muted [&_[data-title]]:!text-success',
          error: '!border-error/40 !bg-error-muted [&_[data-title]]:!text-error',
        },
      }}
      {...props}
    />
  );
}
