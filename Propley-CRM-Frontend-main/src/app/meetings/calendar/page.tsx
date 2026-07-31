'use client';

import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PresentationsViewTabs } from '@/components/presentations/PresentationsViewTabs';
import { PresentationGoogleCalendar } from '@/components/presentations/PresentationGoogleCalendar';
import { usePresentationsList } from '@/store/hooks/useMeetings';
import { PAGE } from '@/lib/copy';

function CalendarSkeleton() {
  return (
    <div className="rounded-xl border border-stone-alt bg-white overflow-hidden shadow-sm">
      {/* Header controls skeleton */}
      <div className="flex items-center justify-between border-b border-stone-alt p-4">
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded-md bg-zinc-200 animate-pulse" />
          <div className="flex gap-1">
            <div className="h-8 w-8 rounded-md bg-zinc-200 animate-pulse" />
            <div className="h-8 w-8 rounded-md bg-zinc-200 animate-pulse" />
          </div>
        </div>
        <div className="h-6 w-32 rounded-md bg-zinc-200 animate-pulse" />
        <div className="flex items-center gap-4 hidden sm:flex">
          <div className="h-8 w-24 rounded-md bg-zinc-200 animate-pulse" />
          <div className="h-8 w-32 rounded-md bg-zinc-200 animate-pulse" />
        </div>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 border-b border-stone-alt bg-stone/30">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="px-2 py-3 text-center">
            <div className="mx-auto h-3 w-8 rounded-md bg-zinc-200 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="min-h-[120px] border-b border-r border-stone-alt/50 p-2 last:border-r-0">
            <div className="h-3 w-5 rounded-md bg-zinc-200 animate-pulse mb-2" />
            {i % 8 === 0 && (
              <div className="h-12 w-full rounded-md bg-zinc-100 animate-pulse" />
            )}
            {i % 12 === 0 && (
              <div className="h-12 w-full rounded-md bg-zinc-100 animate-pulse mt-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MeetingsCalendarPage() {
  const { list: meetings, loading } = usePresentationsList();

  if (loading) {
    return (
      <DashboardLayout activePath="/meetings">
        <div className='px-4 sm:px-8 py-8'>
          <CalendarSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePath="/meetings">
      <motion.div
        className="space-y-6 px-4 sm:px-8 py-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex flex-col gap-4 @2xl/dashboard:flex-row @2xl/dashboard:items-end @2xl/dashboard:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-ink @lg/dashboard:text-3xl @3xl/dashboard:text-4xl">
              {PAGE.calendar.title}
              <span className="text-gold">.</span>
            </h1>
            <p className="text-sm font-medium text-zinc-500">{PAGE.calendar.subtitle}</p>
            <div className="h-[2px] w-16 bg-gold" />
          </div>
          <PresentationsViewTabs />
        </div>

        <PresentationGoogleCalendar meetings={meetings} />
      </motion.div>
    </DashboardLayout>
  );
}
