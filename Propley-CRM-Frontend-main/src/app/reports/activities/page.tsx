'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { UniversalSelect, SelectOption } from '@/components/UniversalSelect';
import { fetchDashboardActivities } from '@/lib/api/reports';
import { DashboardActivity } from '@/lib/api/types/reports';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import {
  RiPulseLine,
  RiThunderstormsLine,
  RiCheckLine,
  RiUserAddLine,
  RiFireLine,
  RiSparkling2Line,
  RiSlideshowLine,
  RiLoader4Line
} from 'react-icons/ri';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ACTIVITY_TYPES: SelectOption[] = [
  { id: '', name: 'All Activities' },
  { id: 'meeting_scheduled', name: 'Meeting Scheduled' },
  { id: 'meeting_started', name: 'Meeting Started' },
  { id: 'meeting_completed', name: 'Meeting Completed' },
  { id: 'lead_created', name: 'Lead Created' },
];

function getTimelineConfig(type: string, title: string) {
  const t = title ? title.toLowerCase() : "";

  if (t.includes("started") || type === "participant_joined" || type === "meeting_created") {
    return {
      icon: RiSlideshowLine,
      bgClass: "bg-white border border-stone-alt",
      textClass: "text-zinc-600",
      badgeText: "Virtual Site Visit",
      badgeStyle: "bg-blue-50 text-blue-600",
    };
  }
  if (t.includes("completed") || type === "meeting_completed" || type === "moderator_ended") {
    return {
      icon: RiCheckLine,
      bgClass: "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm",
      textClass: "text-white",
      badgeText: "Won",
      badgeStyle: "bg-emerald-50 text-emerald-600",
    };
  }
  if (t.includes("lead created") || type === "client_created") {
    return {
      icon: RiUserAddLine,
      bgClass: "bg-white border border-stone-alt",
      textClass: "text-zinc-600",
      badgeText: "Hot Lead",
      badgeStyle: "bg-blue-50 text-blue-600",
    };
  }
  if (type === "slide_view") {
    return {
      icon: RiFireLine,
      bgClass: "bg-gradient-to-br from-rose-500 to-rose-600 shadow-sm",
      textClass: "text-white",
      badgeText: "Hot signal",
      badgeStyle: "bg-rose-50 text-rose-600",
    };
  }
  if (type === "client_interaction") {
    return {
      icon: RiSparkling2Line,
      bgClass: "bg-gradient-to-br from-gold to-gold-hover shadow-sm",
      textClass: "text-white",
      badgeText: "Engaged",
      badgeStyle: "bg-amber-50 text-amber-600",
    };
  }

  return {
    icon: RiPulseLine,
    bgClass: "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm",
    textClass: "text-white",
    badgeText: "Live",
    badgeStyle: "bg-emerald-50 text-emerald-600",
  };
}

function capitalizeDescription(desc: string) {
  if (!desc) return "";
  if (desc.toLowerCase().startsWith("meeting for ")) {
    const name = desc.slice(12).trim();
    if (!name) return desc;
    const capName = name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    return `Meeting for ${capName}`;
  }
  return desc.charAt(0).toUpperCase() + desc.slice(1);
}

function formatActivityTime(iso: string): string {
  try {
    const date = parseISO(iso);
    return format(date, "d MMM yyyy, h:mm a");
  } catch (e) {
    return iso;
  }
}

function ActivitiesSkeleton() {
  return (
    <>
      {[1, 2].map((group) => (
        <div key={group} className="relative mb-8">
          <div className="sticky top-0 z-20 mb-8 border-b border-stone-alt bg-[#FBFBFA]/80 backdrop-blur-md py-3">
            <Skeleton className="h-3 w-32 rounded-lg bg-zinc-200" />
          </div>
          <ul className="relative space-y-2">
            {[1, 2, 3].map((item) => (
              <li key={item} className="relative pl-[52px] pb-6 last:pb-0">
                {item !== 3 && (
                  <div className="absolute top-[38px] left-[19px] w-[2px] h-[calc(100%-24px)] bg-black/5" />
                )}
                <div className="absolute top-0 left-0 w-10 h-10 rounded-lg flex items-center justify-center z-10 border border-stone-alt shadow-sm bg-white">
                  <Skeleton className="h-5 w-5 rounded-md bg-zinc-200" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 pt-0.5 ml-2">
                  <div className="space-y-2 w-full max-w-sm">
                    <Skeleton className="h-4 w-3/4 rounded-lg bg-zinc-200" />
                    <Skeleton className="h-3 w-1/2 rounded-lg bg-zinc-100" />
                  </div>
                  <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5 mt-1 sm:mt-0">
                    <Skeleton className="h-3 w-28 rounded-lg bg-zinc-200" />
                    <Skeleton className="h-2 w-16 rounded-lg bg-zinc-100" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export default function ActivitiesReportPage() {
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState<string>('');

  const loadingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const filterRef = useRef('');

  const observerTarget = useRef<HTMLDivElement>(null);

  const loadActivities = useCallback(async (pageNum: number, type: string, append: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const data = await fetchDashboardActivities(20, pageNum, type);
      if (data.length < 20) {
        hasMoreRef.current = false;
        setHasMore(false);
      } else {
        hasMoreRef.current = true;
        setHasMore(true);
      }
      
      // Deduplicate activities when appending, since mock data might generate dupes on same page requests
      setActivities((prev) => {
        if (!append) return data;
        const existingIds = new Set(prev.map(a => `${a.created_at}-${a.type}-${a.description}`));
        const newData = data.filter(a => !existingIds.has(`${a.created_at}-${a.type}-${a.description}`));
        return [...prev, ...newData];
      });
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      hasMoreRef.current = false;
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    filterRef.current = filterType;
    pageRef.current = 1;
    hasMoreRef.current = true;
    setActivities([]);
    loadActivities(1, filterType, false);
  }, [filterType, loadActivities]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
          const nextPage = pageRef.current + 1;
          pageRef.current = nextPage;
          setPage(nextPage);
          loadActivities(nextPage, filterRef.current, true);
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadActivities]);

  const groupedActivities = activities.reduce((acc, curr) => {
    const dateStr = format(parseISO(curr.created_at), 'yyyy-MM-dd');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(curr);
    return acc;
  }, {} as Record<string, DashboardActivity[]>);

  const sortedDates = Object.keys(groupedActivities).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <DashboardLayout activePath="/reports/activities">
      <div className="space-y-8 px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-ink">
                Activities Log
                <span className="text-gold">.</span>
              </h1>
              <p className="text-sm font-medium text-zinc-500">
                Timeline of all system activities and events.
              </p>
            </div>
            <div className="h-[2px] w-16 bg-gold" />
          </div>

          <div className="w-full md:w-64">
            <UniversalSelect
              value={filterType}
              onChange={setFilterType}
              options={ACTIVITY_TYPES}
              placeholder="All Activities"
              enableSearch={false}
            />
          </div>
        </div>

        <div className="space-y-8 pb-12">
          {sortedDates.length === 0 && loading && (
            <ActivitiesSkeleton />
          )}

          {sortedDates.length === 0 && !loading && (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-zinc-500">No activities found.</p>
            </div>
          )}

          {sortedDates.map((dateStr) => (
            <div key={dateStr} className="relative mb-8">
              <h3 className="sticky top-0 z-20 mb-8 border-b border-stone-alt backdrop-blur-md py-3 text-xs font-bold uppercase tracking-[0.15em] text-zinc-500 bg-background">
                {format(parseISO(dateStr), 'MMMM d, yyyy')}
              </h3>
              <ul className="relative space-y-2">
                {groupedActivities[dateStr].map((activity, idx) => {
                  const config = getTimelineConfig(activity.type, activity.title);
                  const Icon = config.icon;
                  return (
                    <li key={`${activity.created_at}-${idx}`} className="relative pl-[52px] pb-6 last:pb-0">
                      {idx !== groupedActivities[dateStr].length - 1 && (
                        <div className="absolute top-[38px] left-[19px] w-[2px] h-[calc(100%-24px)] bg-black/5" />
                      )}
                      <div className={cn("absolute top-0 left-0 w-10 h-10 rounded-lg flex items-center justify-center z-10", config.bgClass, config.textClass)}>
                        <Icon size={18} />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 pt-0.5 ml-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-[15px] font-semibold text-ink leading-tight">
                              {capitalizeDescription(activity.description)}
                            </h3>
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide", config.badgeStyle)}>
                              {config.badgeText}
                            </span>
                          </div>
                          <p className="text-[14px] text-zinc-600 mt-1 leading-snug">
                            {activity.title === 'Meeting Started' ? 'Virtual Site Visit Started' : activity.title}
                          </p>
                        </div>
                        <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5 mt-1 sm:mt-0">
                          <div className="text-[12px] text-zinc-400 font-medium shrink-0">
                            {formatActivityTime(activity.created_at)}
                          </div>
                          <span className="text-[11px] font-medium text-zinc-400 pr-1">
                            {formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Intersection observer target */}
          <div ref={observerTarget} className="pt-4">
            {loading && sortedDates.length > 0 && (
              <ActivitiesSkeleton />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
