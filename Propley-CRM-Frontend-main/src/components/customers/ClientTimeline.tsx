'use client';

import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  RiArrowRightUpLine,
  RiCalendarEventLine,
  RiGitBranchLine,
  RiStickyNoteLine,
  RiDeleteBinLine,
  RiShakeHandsLine,
} from 'react-icons/ri';
import type { Customer } from '@/lib/mock-data';
import { PAGE } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { fetchClientById } from '@/lib/api/clients';
import type { ApiClientActivity } from '@/lib/api/types/clients';
import { formatIndianDateTime } from '@/lib/date-format';
import { Skeleton } from '@/components/ui/skeleton';

interface ClientTimelineProps {
  customer: Customer;
}

const ACTION_LABELS: Record<string, string> = {
  viewAnalysis: PAGE.customers.profile.viewAnalysis,
  enterPortal: PAGE.customers.profile.enterPortal,
  viewPresentation: PAGE.customers.profile.viewPresentation,
};

function eventIcon(ev: ApiClientActivity): IconType {
  if (ev.type === 'note_deleted') return RiDeleteBinLine;
  if (ev.type === 'note_added') return RiStickyNoteLine;
  if (ev.type === 'pipeline_update' || ev.title?.includes('Pipeline stage')) return RiShakeHandsLine;
  return RiCalendarEventLine;
}

function formatText(text?: string): string {
  if (!text) return '';
  return text
    .replace(/vsv_scheduled/gi, 'Virtual Site Visit Scheduled')
    .replace(/vsv_done/gi, 'Virtual Site Visit Done')
    .replace(/\bVSV\b/gi, 'Virtual Site Visit');
}

function nodeClass(ev: ApiClientActivity): string {
  if (ev.type === 'note_added') {
    return 'border-gold/40 bg-gold/10 text-gold';
  }
  if (ev.type === 'note_deleted') {
    return 'border-stone-alt bg-stone/60 text-zinc-500';
  }
  return 'border-stone-alt bg-stone/60 text-zinc-600';
}

export function ClientTimeline({ customer }: ClientTimelineProps) {
  const [activities, setActivities] = useState<ApiClientActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    setLoading(true);
    fetchClientById(customer.id, controller.signal)
      .then((data) => {
        if (mounted && data.activities) {
          setActivities(data.activities);
        }
      })
      .catch((err) => {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        console.error('Failed to fetch client activities:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [customer.id]);

  const stage = customer.dealStage ?? 'inquiry';
  const stageLabel = PAGE.customers.dealStages[stage];

  return (
    <section className="border border-stone-alt bg-ivory">
      <div className="border-b border-stone-alt px-6 py-4">
        <h2 className="text-sm font-semibold text-ink">{PAGE.customers.profile.timeline}</h2>
      </div>

      <div className="px-6 py-6">
        <div className="mb-6 flex items-center gap-3 border border-gold/25 bg-gold/5 px-4 py-3">
          <RiGitBranchLine className="shrink-0 text-gold" size={18} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              {PAGE.customers.profile.currentStage}
            </p>
            <p className="text-sm font-semibold text-ink">{stageLabel}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 shrink-0 border" />
                <div className="space-y-2 flex-1 pt-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="border border-dashed border-stone-alt bg-stone/20 px-4 py-8 text-center text-sm font-medium text-zinc-500">
            {PAGE.customers.profile.timelineEmpty}
          </p>
        ) : (
          <ol className="relative space-y-2 m-0 list-none p-0">
            {activities.map((ev, i) => {
              const Icon = eventIcon(ev);
              const isLast = i === activities.length - 1;

              return (
                <li
                  key={ev.id}
                  className="relative pl-[52px] pb-6 last:pb-0"
                >
                  {!isLast && (
                    <div className="absolute top-[38px] left-[19px] w-[2px] h-[calc(100%-24px)] bg-black/5" />
                  )}
                  <div
                    className={cn(
                      'absolute top-0 left-0 w-10 h-10 rounded-lg flex items-center justify-center z-10 border shadow-none!',
                      nodeClass(ev)
                    )}
                  >
                    <Icon size={18} aria-hidden />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 pt-0.5 ml-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={cn("text-[15px] font-semibold leading-tight text-ink", ev.type === 'note_deleted' && "text-zinc-500 line-through")}>

                          {formatText(ev.description)}

                        </h3>
                        {ev.type === 'note_added' && (
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide bg-gold/10 text-gold">
                            Note
                          </span>
                        )}
                        {ev.type === 'note_deleted' && (
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide bg-stone/30 text-zinc-500 border border-stone-alt">
                            Deleted Note
                          </span>
                        )}
                      </div>

                      {ev.description && (
                        <p className={cn("mt-1 text-[14px] leading-snug", ev.type === 'note_deleted' ? "text-zinc-400" : "text-zinc-600")}>
                          {formatText(ev.title)}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5 mt-1 sm:mt-0">
                      <div className="text-[12px] text-zinc-400 font-medium shrink-0">
                        {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
