import { Suspense } from 'react';
import { PresentationsRegistry } from '@/components/presentations/PresentationsRegistry';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import DashboardLayout from '@/components/layout/DashboardLayout';

function MeetingsFallback() {
  return (
    <DashboardLayout activePath="/meetings">
      <div className="space-y-6 px-4 sm:px-8 py-8">
        <div className="flex flex-col gap-4 @2xl/dashboard:flex-row @2xl/dashboard:items-end @2xl/dashboard:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="h-8 w-64 rounded-md bg-zinc-200 animate-pulse" />
            <div className="h-4 w-48 rounded-md bg-zinc-100 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 rounded-md bg-zinc-200 animate-pulse" />
            <div className="h-10 w-32 rounded-md bg-zinc-200 animate-pulse" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
          <div className="flex gap-2">
            <div className="h-10 w-48 rounded-md bg-zinc-200 animate-pulse" />
            <div className="h-10 w-32 rounded-md bg-zinc-200 animate-pulse" />
          </div>
          <div className="h-10 w-32 rounded-md bg-zinc-200 animate-pulse" />
        </div>
        <div className="rounded-xl border border-stone-alt bg-white shadow-none! overflow-hidden mt-6">
          <div className="h-11 border-b border-stone-alt bg-stone/50" />
          <TableSkeleton rows={8} cols={7} />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function MeetingsPage() {
  return (
    <Suspense fallback={<MeetingsFallback />}>
      <PresentationsRegistry />
    </Suspense>
  );
}
