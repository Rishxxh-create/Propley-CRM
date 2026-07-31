"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useLoadMeetingActivity,
  useMeetingActivity,
} from "@/store/hooks/useMeetings";
import { formatIndianDate, IN_DATETIME } from "@/lib/date-format";
import { parseISO, isValid } from "date-fns";
import {
  RiPulseLine,
  RiArrowLeftLine,
  RiUserLine,
  RiTimeLine,
  RiCalendarEventLine,
  RiDownloadLine,
  RiFileExcel2Line,
  RiFileList3Line,
} from "react-icons/ri";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect, useRef } from "react";
import { StoredMeeting } from "@/lib/mock-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as XLSX from "xlsx";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatActivityTime(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? formatIndianDate(d, IN_DATETIME) : iso;
}

/** Derive badge styling from event_id prefix */
function getScopeMeta(eventId: string | null | undefined): {
  label: string;
  className: string;
} {
  if (!eventId?.trim()) {
    return {
      label: "System",
      className: "bg-stone text-zinc-500 border-stone-alt",
    };
  }
  const prefix = eventId.split("_")[0];
  if (prefix === "moderator") {
    return {
      label: "Moderator",
      className: "bg-ink text-white border-ink",
    };
  }
  if (prefix === "participant") {
    return {
      label: "Participant",
      className: "bg-gold/10 text-gold border-gold/20",
    };
  }
  if (prefix === "slide") {
    return {
      label: "Slide",
      className: "bg-gold/10 text-gold border-gold/20",
    };
  }
  return {
    label: prefix,
    className: "bg-stone text-zinc-500 border-stone-alt",
  };
}

// ─── Skeleton Rows ───────────────────────────────────────────────────────────

function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b border-stone-alt last:border-0 bg-white">
          <td className="px-4 sm:px-6 py-4 sm:py-5">
            <Skeleton className="h-3 w-32 rounded-lg bg-zinc-200" />
          </td>
          <td className="px-4 sm:px-6 py-4 sm:py-5">
            <Skeleton className="h-4 w-48 rounded-lg bg-zinc-200 mb-2" />
            <Skeleton className="h-3 w-32 rounded-lg bg-zinc-100" />
          </td>
          <td className="hidden sm:table-cell px-4 sm:px-6 py-4 sm:py-5">
            <Skeleton className="h-4 w-32 rounded-lg bg-zinc-200 mb-2" />
            <Skeleton className="h-3 w-24 rounded-lg bg-zinc-100" />
          </td>
          <td className="px-4 sm:px-6 py-4 sm:py-5 text-right">
            <Skeleton className="h-5 w-20 rounded-lg bg-zinc-200 ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

function MobileSkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="px-4 py-5 space-y-3 bg-white">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-4 w-3/4 rounded-lg bg-zinc-200" />
            <Skeleton className="h-4 w-16 rounded-lg bg-zinc-200" />
          </div>
          <Skeleton className="h-3 w-1/2 rounded-lg bg-zinc-100" />
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-3 w-24 rounded-lg bg-zinc-100" />
            <Skeleton className="h-3 w-20 rounded-lg bg-zinc-100" />
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Mobile Event Card ───────────────────────────────────────────────────────

interface EventCardProps {
  event: ReturnType<typeof useMeetingActivity>["events"][number];
  idx: number;
}

function MobileEventCard({ event, idx }: EventCardProps) {
  const scope = getScopeMeta(event.event_id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.03, 0.45) }}
      className="border-b border-stone-alt px-4 py-4 hover:bg-stone/30 transition-colors"
    >
      {/* Top row: name + scope badge */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-[13px] font-semibold text-ink leading-tight">
          {event.name}
        </p>
        <span
          className={cn(
            "shrink-0 inline-flex items-center px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] uppercase border",
            scope.className,
          )}
        >
          {scope.label}
        </span>
      </div>

      {event.event_id ? (
        <p className="text-[10px] font-mono font-medium text-zinc-400 mb-2 tracking-tight">
          {event.event_id}
        </p>
      ) : null}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1">
          <RiTimeLine size={11} />
          {formatActivityTime(event.time)}
        </span>
        <span className="flex items-center gap-1">
          <RiUserLine size={11} />
          {event.user_name || "System Auto"}
          {event.user_mobile && (
            <span className="text-zinc-400 ml-1">{event.user_mobile}</span>
          )}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ActivityLogsPage() {
  const params = useParams();
  const meetingId = params?.id as string;

  useLoadMeetingActivity(meetingId);
  const { events, loading } = useMeetingActivity(meetingId);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const [visibleCount, setVisibleCount] = useState(15);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!observerTarget.current || loading || events.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < events.length && !isLoadingMore) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + 15, events.length));
            setIsLoadingMore(false);
          }, 800);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [loading, visibleCount, events.length, isLoadingMore]);

  const exportToCSV = () => {
    if (!events.length) return;
    const headers = ["Timestamp", "Action", "Identifier", "Participant Name", "Participant Mobile", "Scope"];
    const rows = events.map(e => [
      formatActivityTime(e.time),
      `"${(e.name ?? "Session activity").replace(/"/g, '""')}"`,
      e.event_id || "—",
      `"${(e.user_name || "System Auto").replace(/"/g, '""')}"`,
      e.user_mobile || "",
      getScopeMeta(e.event_id).label
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `activity_logs_${meetingId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsDownloadModalOpen(false);
  };

  const exportToXLSX = () => {
    if (!events.length) return;
    const data = events.map(e => ({
      Timestamp: formatActivityTime(e.time),
      Action: e.name ?? "Session activity",
      Identifier: e.event_id || "—",
      "Participant Name": e.user_name || "System Auto",
      "Participant Mobile": e.user_mobile || "",
      Scope: getScopeMeta(e.event_id).label
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Logs");
    XLSX.writeFile(workbook, `activity_logs_${meetingId}.xlsx`);
    setIsDownloadModalOpen(false);
  };

  // Load meeting info for breadcrumbs (only runs client-side)
  const meeting = useMemo<StoredMeeting | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    try {
      const stored = localStorage.getItem("propley_meetings");
      if (!stored) return undefined;
      const parsed = JSON.parse(stored) as StoredMeeting[];
      return parsed.find((m) => m.uuid === meetingId || m.id === meetingId);
    } catch {
      return undefined;
    }
  }, [meetingId]);

  const breadcrumbs = [
    { label: "Presentations", href: "/meetings" },
    {
      label: meeting?.client ?? "Post-analysis",
      href: `/meetings/${meetingId}/post-analysis`,
    },
    { label: "Activity Logs" },
  ];

  const isEmpty = !loading && events.length === 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader
            title="Activity Engine Logs"
            description="Comprehensive audit trail of meeting events and participant interactions."
            breadcrumbs={breadcrumbs}
          />
          <div className="flex items-center gap-2 self-start mt-2 sm:mt-0">
            <Link href={`/meetings/${meetingId}/post-analysis`} className="flex">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg border-stone-alt bg-white h-9 px-4 text-xs"
              >
                <RiArrowLeftLine className="mr-2" size={14} />
                Return to Analysis
              </Button>
            </Link>
            {!loading && events.length > 0 && (
              <Button
                variant="propley"
                size="sm"
                onClick={() => setIsDownloadModalOpen(true)}
                className="rounded-lg h-9 px-4 text-xs"
              >
                <RiDownloadLine className="mr-2" size={14} />
                Download Logs
              </Button>
            )}
          </div>
        </div>

        {/* ── Card ───────────────────────────────────────────────── */}
        <Card className="rounded-lg pt-0! border-stone-alt bg-white shadow-none! overflow-hidden">
          <CardContent className="p-0">
            {/* Card header */}
            <div className="flex items-center justify-between gap-2 border-b border-stone-alt bg-stone/20 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2">
                <RiPulseLine className="text-gold shrink-0" size={17} />
                <h2 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-zinc-500 leading-none">
                  Session Audit Trail
                </h2>
              </div>
              {!loading && (
                <span className="text-[10px] font-semibold tracking-widest uppercase text-zinc-400">
                  {events.length} Events
                </span>
              )}
            </div>

            {/* ── Loading skeleton ───────────────────────────────── */}
            {loading && (
              <>
                {/* Desktop skeleton table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-stone-alt bg-stone/5">
                        <TableHeadCell
                          icon={<RiTimeLine size={12} />}
                          label="Timestamp"
                        />
                        <TableHeadCell label="Action & Identifier" />
                        <TableHeadCell
                          icon={<RiUserLine size={12} />}
                          label="Participant"
                        />
                        <TableHeadCell label="Scope" right />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-alt">
                      <SkeletonRows />
                    </tbody>
                  </table>
                </div>

                {/* Mobile skeleton virtual cards */}
                <div className="sm:hidden divide-y divide-stone-alt">
                  <MobileSkeletonRows />
                </div>
              </>
            )}

            {/* ── Empty state ────────────────────────────────────── */}
            {isEmpty && (
              <div className="flex h-56 sm:h-64 flex-col items-center justify-center gap-3 px-4 text-center">
                <RiCalendarEventLine size={28} className="text-zinc-300" />
                <p className="text-sm font-semibold text-ink">
                  No activity recorded
                </p>
                <p className="text-xs text-zinc-400 max-w-60">
                  This session has no interaction events recorded yet.
                </p>
              </div>
            )}

            {/* ── Events ─────────────────────────────────────────── */}
            {!loading && events.length > 0 && (
              <>
                {/* Desktop table — hidden on mobile */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-stone-alt bg-stone/5">
                        <TableHeadCell
                          icon={<RiTimeLine size={12} />}
                          label="Timestamp"
                        />
                        <TableHeadCell label="Action & Identifier" />
                        <TableHeadCell
                          icon={<RiUserLine size={12} />}
                          label="Participant"
                        />
                        <TableHeadCell label="Scope" right />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-alt">
                      {events.slice(0, visibleCount).map((event, idx) => {
                        const scope = getScopeMeta(event.event_id);
                        return (
                          <motion.tr
                            key={event.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(idx * 0.02, 0.4) }}
                            className="hover:bg-stone/30 transition-colors group"
                          >
                            <td className="whitespace-nowrap px-6 py-5 text-[11px] font-medium text-zinc-400 tabular-nums">
                              {formatActivityTime(event.time)}
                            </td>
                            <td className="px-6 py-5 max-w-70">
                              <p className="text-[13px] font-semibold text-ink group-hover:text-gold transition-colors truncate">
                                {event.name}
                              </p>
                              {event.event_id ? (
                                <p className="text-[10px] font-medium text-zinc-400 mt-0.5 tracking-tight font-mono">
                                  {event.event_id}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-[13px] font-semibold text-ink">
                                  {event.user_name || "System Auto"}
                                </span>
                                {event.user_mobile && (
                                  <span className="text-[10px] font-medium text-zinc-400">
                                    {event.user_mobile}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <span
                                className={cn(
                                  "inline-flex items-center px-2.5 py-1 text-[9px] font-bold tracking-[0.12em] uppercase border",
                                  scope.className,
                                )}
                              >
                                {scope.label}
                              </span>
                            </td>
                          </motion.tr>
                        );
                      })}
                      {isLoadingMore && <SkeletonRows count={3} />}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list — visible only on mobile */}
                <div className="sm:hidden">
                  {events.slice(0, visibleCount).map((event, idx) => (
                    <MobileEventCard key={event.id} event={event} idx={idx} />
                  ))}
                  {isLoadingMore && (
                    <div className="divide-y divide-stone-alt">
                      <MobileSkeletonRows count={3} />
                    </div>
                  )}
                </div>
                
                {visibleCount < events.length && (
                  <div ref={observerTarget} className="h-4 w-full" />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDownloadModalOpen} onOpenChange={setIsDownloadModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Download Logs</DialogTitle>
            <DialogDescription>
              Select your preferred format to export the activity logs.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              variant="outline"
              className="w-full justify-start h-14 rounded-lg border-stone-alt hover:border-gold hover:bg-stone/50 px-4"
              onClick={exportToXLSX}
            >
              <div className="flex items-center gap-3">
                <RiFileExcel2Line size={20} className="text-zinc-500" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold text-ink">Download as XLSX</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Excel Spreadsheet (.xlsx)</span>
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-14 rounded-lg border-stone-alt hover:border-gold hover:bg-stone/50 px-4"
              onClick={exportToCSV}
            >
              <div className="flex items-center gap-3">
                <RiFileList3Line size={20} className="text-zinc-500" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold text-ink">Download as CSV</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Comma Separated Values (.csv)</span>
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// ─── Sub-component: Table Head Cell ─────────────────────────────────────────

function TableHeadCell({
  icon,
  label,
  right = false,
}: {
  icon?: React.ReactNode;
  label: string;
  right?: boolean;
}) {
  return (
    <th
      className={cn(
        "px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400",
        right && "text-right",
      )}
    >
      {icon ? (
        <div className="flex items-center gap-1.5">
          {icon}
          {label}
        </div>
      ) : (
        label
      )}
    </th>
  );
}
