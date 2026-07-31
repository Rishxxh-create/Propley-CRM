"use client";

import { motion } from "framer-motion";

import { useMemo, useSyncExternalStore, useState, useEffect } from "react";
import Link from "next/link";
import { parseDateString } from "@/lib/presentation-templates";
import {
  filterPresentations,
  readPresentations,
  subscribePresentations,
} from "@/lib/presentations-store";
import { readCustomers, subscribeCustomers } from "@/lib/customers-store";
import {
  getCurrentAdvisorId,
  subscribeCurrentAdvisor,
} from "@/lib/current-advisor";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/selectors/authSelectors";
import { seedPresentationsIfEmpty } from "@/lib/presentations-migrate";
import { APP, PAGE } from "@/lib/copy";
import { useEventStats } from "@/store/hooks/useEventStats";
import { fetchDashboardActivities } from "@/lib/api/reports";
import type { DashboardActivity } from "@/lib/api/types/reports";
import type { Customer } from "@/lib/mock-data";
import { isSameDay, parseISO, isValid, format } from "date-fns";
import { formatIndianDate, IN_DATETIME } from "@/lib/date-format";
import { statusBadgeCn } from "@/lib/presentation-status";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { LeadSourcesChart } from "@/components/dashboard/LeadSourcesChart";
import { CitiesChart } from "@/components/dashboard/CitiesChart";
import { cn } from "@/lib/utils";
import {
  RiArrowRightLine,
  RiCalendarCheckLine,
  RiGroupLine,
  RiLineChartLine,
  RiPulseLine,
  RiLoginBoxLine,
  RiLogoutBoxRLine,
  RiCloseCircleLine,
  RiCursorFill,
  RiSlideshowLine,
  RiAddLine,
  RiInformationLine,
  RiDownloadLine,
  RiTimeLine,
  RiFireLine,
  RiThunderstormsLine,
  RiSparkling2Line,
  RiCheckLine,
  RiUserAddLine,
} from "react-icons/ri";
import { toast } from "@/lib/toast";

function getEventIcon(type: string) {
  switch (type) {
    case "meeting_created":
    case "participant_joined":
      return <RiLoginBoxLine className="text-emerald-700" size={18} />;
    case "meeting_completed":
    case "participant_ended":
      return <RiLogoutBoxRLine className="text-rose-700" size={18} />;
    case "meeting_canceled":
    case "moderator_ended":
      return <RiCloseCircleLine className="text-rose-700" size={18} />;
    case "client_interaction":
    case "client_created":
      return <RiCursorFill className="text-blue-700" size={18} />;
    case "slide_view":
      return <RiSlideshowLine className="text-purple-700" size={18} />;
    default:
      return <RiInformationLine className="text-zinc-700" size={18} />;
  }
}

function getTimelineConfig(type: string, title: string) {
  const t = title ? title.toLowerCase() : "";

  if (t.includes("started") || type === "participant_joined" || type === "meeting_created") {
    return {
      icon: RiSlideshowLine,
      bgClass: "bg-white border border-black/10",
      textClass: "text-black",
      badgeText: "Virtual Site Visit",
      badgeStyle: "bg-slate-100 text-slate-700",
    };
  }
  if (t.includes("completed") || type === "meeting_completed" || type === "moderator_ended") {
    return {
      icon: RiCheckLine,
      bgClass: "bg-[#1b7f5a]",
      textClass: "text-white",
      badgeText: "Won",
      badgeStyle: "bg-emerald-50 text-emerald-700",
    };
  }
  if (t.includes("lead created") || type === "client_created") {
    return {
      icon: RiUserAddLine,
      bgClass: "bg-white border border-black/10",
      textClass: "text-black",
      badgeText: "Hot Lead",
      badgeStyle: "bg-slate-100 text-slate-700",
    };
  }
  if (type === "slide_view") {
    return {
      icon: RiFireLine,
      bgClass: "bg-[#b42318]",
      textClass: "text-white",
      badgeText: "Hot signal",
      badgeStyle: "bg-rose-50 text-rose-700",
    };
  }
  if (type === "client_interaction") {
    return {
      icon: RiSparkling2Line,
      bgClass: "bg-[#8b6b3f]",
      textClass: "text-white",
      badgeText: "Engaged",
      badgeStyle: "bg-amber-50 text-amber-700",
    };
  }

  return {
    icon: RiPulseLine,
    bgClass: "bg-[#1b7f5a]",
    textClass: "text-white",
    badgeText: "Live",
    badgeStyle: "bg-emerald-50 text-emerald-700",
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
  const d = parseISO(iso);
  return isValid(d) ? formatIndianDate(d, IN_DATETIME) : iso;
}

function formatStatValue(value: string | number | undefined, loading: boolean) {
  if (loading) return "—";
  if (value === undefined || value === null) return "—";
  return typeof value === "number" ? String(value).padStart(2, "0") : value;
}

function StatSkeleton() {
  return (
    <div className="group relative flex flex-col justify-between gap-4 overflow-hidden rounded-xl border border-stone-alt bg-white p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20 bg-stone-alt" />
        <Skeleton className="h-8 w-8 rounded-lg bg-stone-alt" />
      </div>
      <div>
        <Skeleton className="h-7 w-12 bg-stone-alt mb-2" />
        <Skeleton className="h-3 w-16 bg-stone-alt/50" />
      </div>
    </div>
  );
}

function ActivitySkeleton({ isLast = false }: { isLast?: boolean }) {
  return (
    <li className="relative pl-[52px] pb-6 last:pb-0">
      {!isLast && (
        <div className="absolute top-[38px] left-[19px] w-[2px] h-[calc(100%-24px)] bg-black/5" />
      )}
      <div className="absolute top-0 left-0 w-10 h-10 rounded-xl flex items-center justify-center z-10 border border-stone-alt bg-white shadow-sm">
        <Skeleton className="h-4 w-4 rounded-full bg-stone-alt" />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 pt-0.5">
        <div className="space-y-2 w-full max-w-sm">
          <Skeleton className="h-4 w-3/4 rounded-lg bg-stone-alt/50" />
          <Skeleton className="h-3 w-1/2 rounded-lg bg-stone-alt/50" />
        </div>
        <div className="shrink-0">
          <Skeleton className="h-4 w-24 rounded-lg bg-stone-alt/50" />
        </div>
      </div>
    </li>
  );
}

const SLIDE_IMAGES = [
  "/assets/images/arieal view.png"
];

const EMPTY_ARRAY: Customer[] = [];

export function AdvisorOverview() {
  const { stats: eventStats, loading: statsLoading } = useEventStats();

  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchDashboardActivities(5, 1).then((data) => {
      if (active) {
        setActivities(data);
        setActivitiesLoading(false);
      }
    }).catch(() => {
      if (active) setActivitiesLoading(false);
    });
    return () => { active = false; };
  }, []);

  const advisorId = useSyncExternalStore(
    subscribeCurrentAdvisor,
    getCurrentAdvisorId,
    () => "tm-001",
  );
  const user = useAppSelector(selectAuthUser);
  const advisorName = user?.name?.trim() || "Consultant";

  const meetings = useSyncExternalStore(
    subscribePresentations,
    readPresentations,
    seedPresentationsIfEmpty,
  );

  const customers = useSyncExternalStore(
    subscribeCustomers,
    readCustomers,
    () => EMPTY_ARRAY,
  );

  const myMeetings = useMemo(
    () =>
      filterPresentations(meetings, {
        advisorId,
      }),
    [meetings, advisorId],
  );

  const todayMeetings = useMemo(() => {
    const today = new Date();
    return myMeetings.filter((m) => {
      const d = parseDateString(m.date);
      return d && isSameDay(d, today);
    });
  }, [myMeetings]);

  const myClients = useMemo(
    () => customers.filter((c) => c.assignedAdvisorId === advisorId),
    [customers, advisorId],
  );

  const computedStats = useMemo(() => {
    const total_clients = customers.length;
    const active_clients = customers.filter(c => c.dealStage && c.dealStage !== 'closed_won').length;
    const total_meetings = meetings.length;
    const active_meetings = meetings.filter(m => m.status === 'Live' || m.status === 'Scheduled').length;
    const completed_meetings = meetings.filter(m => m.status === 'Completed').length;

    const total_engagement = eventStats?.total_engagement ?? 0;
    const total_attendees = eventStats?.total_attendees ?? 0;

    return {
      total_clients: eventStats?.total_clients ?? total_clients,
      active_clients: eventStats?.active_clients ?? active_clients,
      total_meetings: eventStats?.total_meetings ?? total_meetings,
      active_meetings: eventStats?.active_meetings ?? active_meetings,
      completed_meetings: eventStats?.completed_meetings ?? completed_meetings,
      total_engagement,
      total_attendees,
    };
  }, [eventStats, customers, meetings]);

  const stats = [
    {
      label: "Client Portfolio",
      value: formatStatValue(computedStats.total_clients, statsLoading && !eventStats),
      subValue: `${formatStatValue(computedStats.active_clients, statsLoading && !eventStats)} Active Deals`,
      icon: RiGroupLine,
    },
    {
      label: "Total Presentations",
      value: formatStatValue(computedStats.total_meetings, statsLoading && !eventStats),
      subValue: (
        <span className="flex items-center gap-1.5">
          <span>{formatStatValue(computedStats.active_meetings, statsLoading && !eventStats)} Scheduled</span>
          <span className="text-zinc-300">&bull;</span>
          <span className="text-green-700 font-bold">{formatStatValue(computedStats.completed_meetings, statsLoading && !eventStats)} Completed</span>
        </span>
      ),
      icon: RiCalendarCheckLine,
    },
    {
      label: "Global Engagement",
      value: formatStatValue(computedStats.total_engagement, statsLoading && !eventStats),
      subValue: "Interactions logged",
      icon: RiLineChartLine,
    },
    {
      label: "Total Attendees",
      value: formatStatValue(computedStats.total_attendees, statsLoading && !eventStats),
      subValue: "Across all sessions",
      icon: RiSparkling2Line,
    },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-ink" suppressHydrationWarning>
            {greeting}, {advisorName.split(" ")[0]}<span className="text-gold">.</span>
          </h1>
          <p className="text-xs mt-2 sm:text-[15px] font-medium text-zinc-500 flex items-center gap-2" suppressHydrationWarning>
            {format(new Date(), "EEEE, d MMM")} <span className="text-zinc-300">&bull;</span>
            <span><strong className="text-ink font-semibold">{computedStats.active_clients || 0} hot leads</strong></span>
          </p>
          <div className="w-16 h-[2px] bg-gold mt-5" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
          <Link
              href="/meetings/new"
              className={cn(
                buttonVariants({ variant: "propley" }),
                "inline-flex h-12 !py-0 items-center justify-center gap-2 px-5 w-full sm:w-auto",
              )}
            >
              <RiAddLine className="w-4 h-4" />
              {PAGE.dashboard.newPresentation.cta}
            </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : stats.map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              key={stat.label}
              className="group relative flex flex-col justify-between gap-4 overflow-hidden rounded-xl border border-stone-alt bg-white p-5 transition-all hover:border-gold/30 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-zinc-500 transition-colors group-hover:text-gold">
                  {stat.label}
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-alt/50 text-gold transition-colors group-hover:bg-gold/10">
                  <stat.icon size={16} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-2xl font-bold tracking-tight text-ink">
                  {stat.value}
                </p>
                {stat.subValue && (
                  <div className="text-[11px] font-medium text-zinc-400">
                    {stat.subValue}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
      </div>

      {/* FEATURED PRESENTATION DECK (MANDAKE) */}
      <a
        href="https://mandake.vercel.app"
        target="_blank"
        rel="noreferrer"
        className="block bg-white border border-stone-alt rounded-xl overflow-hidden shadow-none! p-4 transition-all hover:border-gold/30 hover:shadow-sm group"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative border border-stone-alt rounded-lg overflow-hidden w-full h-36 sm:w-24 sm:h-16 shrink-0 bg-stone/25">
            <img
              src="/assets/images/arieal view.png"
              alt="Presentation Preview"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-1 items-center justify-between gap-4">
            <div>
              <h3 className="text-ink text-[15px] font-bold tracking-tight">
                Interactive Presentation Showcase
              </h3>
              <p className="text-zinc-500 text-[13px] font-medium mt-0.5">
                Live presentation slides for Mandake Light House
              </p>
            </div>
            <div className="shrink-0 text-zinc-400 group-hover:text-gold group-hover:bg-gold/10 transition-colors flex items-center justify-center w-8 h-8 rounded-lg bg-stone-alt/50">
              <RiArrowRightLine size={16} />
            </div>
          </div>
        </div>
      </a>



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PipelineChart />
        <div className="space-y-8">
          <LeadSourcesChart />
        </div>
        <div className="lg:col-span-2">
          <CitiesChart />
        </div>
      </div>



      {(!activitiesLoading && activities.length === 0) ? null : (
        <div className="mt-8">
          <div className="bg-ivory border border-stone-alt rounded-xl overflow-hidden mt-8">
            <div className="p-5 border-b border-stone-alt flex items-center gap-4 bg-white/50">
              <div>
                <h2 className="text-[17px] font-bold text-ink leading-tight">Re-engagement timeline</h2>
                <p className="text-[13px] text-zinc-500 font-medium mt-0.5">Recent signals & auto-nudges</p>
              </div>
            </div>
            <div className="p-5">
              {activitiesLoading ? (
                <ul className="space-y-0">
                  <ActivitySkeleton />
                  <ActivitySkeleton />
                  <ActivitySkeleton isLast />
                </ul>
              ) : (
                <ul className="relative space-y-2">
                  {activities.map((activity, idx) => {
                    const config = getTimelineConfig(activity.type, activity.title);
                    const Icon = config.icon;
                    return (
                      <motion.li
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.05 }}
                        key={idx}
                        className="relative pl-[52px] pb-6 last:pb-0"
                      >
                        {idx !== activities.length - 1 && (
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
                          <div className="text-[12px] text-zinc-400 font-medium shrink-0 sm:mt-0">
                            {formatActivityTime(activity.created_at)}
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
}
