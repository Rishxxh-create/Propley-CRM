'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RiCloseLine, RiDownload2Line, RiTimeLine, RiUserLine, RiMouseLine, RiEyeLine, RiPlayLine, RiPauseLine, RiFileTextLine, RiCursorLine, RiMapPinLine } from 'react-icons/ri';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Participant } from '@/hooks/use-moderator-session';
import { VisitorsPanel, type VisitorsPanelProps } from './VisitorsPanel';
import { MeetingNotesTab } from '@/app/meetings/[id]/post-analysis/_components/MeetingNotesTab';
import { fetchMeetingActivityPaginated } from '@/lib/api/events';
import type { MeetingActivityEvent } from '@/lib/api/types/events';

type DrawerType = 'analytics' | 'script' | 'visitors' | 'notes' | null;

interface DrawersProps {
  activeDrawer: DrawerType;
  setActiveDrawer: (drawer: DrawerType) => void;
  participants?: Participant[];
  remoteStreams?: unknown[];
  muteUser?: (targetSocketId: string) => void;
  requestUnmute?: (targetSocketId: string) => void;
  muteAll?: () => void;
  meetingUuid?: string;
}

export function Drawers({
  activeDrawer,
  setActiveDrawer,
  participants = [],
  remoteStreams = [],
  muteUser,
  requestUnmute,
  muteAll,
  meetingUuid,
}: DrawersProps) {
  const [activityFeed, setActivityFeed] = useState<MeetingActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [filterEvent, setFilterEvent] = useState('all');
  const [filterClient, setFilterClient] = useState('all');

  useEffect(() => {
    if (activeDrawer !== 'analytics' || !meetingUuid) return;

    let mounted = true;

    const fetchPage = async () => {
      if (page === 1) setIsLoading(true);
      else setIsFetchingMore(true);

      try {
        const { data, pagination } = await fetchMeetingActivityPaginated(meetingUuid, page, 15);
        if (!mounted) return;

        // Filter out redundant 'slide_enter' events
        const filtered = data.filter(e => e.event_id !== 'slide_enter');

        setActivityFeed(prev => page === 1 ? filtered : [...prev, ...filtered]);
        setHasMore(pagination.page < pagination.totalPages);
      } catch (err) {
        console.error('Failed to load meeting activity', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
          setIsFetchingMore(false);
        }
      }
    };

    fetchPage();

    let interval: NodeJS.Timeout | null = null;
    if (page === 1) {
      interval = setInterval(fetchPage, 60000); // Background polling for new events (page 1)
    }

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [activeDrawer, meetingUuid, page]);

  useEffect(() => {
    // Reset state when drawer changes
    if (activeDrawer === 'analytics') {
      setPage(1);
      setActivityFeed([]);
      setHasMore(true);
    }
  }, [activeDrawer, meetingUuid]);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const [elementRef, setElementRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (isLoading || isFetchingMore) return;

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });

    if (elementRef) observer.observe(elementRef);

    return () => {
      if (elementRef) observer.unobserve(elementRef);
    };
  }, [isLoading, isFetchingMore, hasMore, elementRef]);

  const formatTime = (timeStr: string) => {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    return format(d, 'hh:mm:ss a');
  };

  const formatDateLabel = (timeStr: string) => {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return '';
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'dd MMM yyyy');
  };

  const formatActionName = (name: string, eventId: string) => {
    if (name.startsWith('Viewed ')) return name;

    let formattedName = name;

    const replacements: Record<string, string> = {
      'slide_click on ': 'Clicked on ',
      'cta_click on ': 'Clicked CTA on ',
      'pdf_open on ': 'Opened PDF on ',
      'pdf_close on ': 'Closed PDF on ',
      'video_play on ': 'Played video on ',
      'video_pause on ': 'Paused video on ',
      'slide_enter on ': 'Entered ',
      'slide_view on ': 'Viewed ',
      'reserve_plot on ': 'Reserved plot on ',
    };

    for (const [key, value] of Object.entries(replacements)) {
      if (formattedName.startsWith(key)) {
        formattedName = formattedName.replace(key, value);
        break;
      }
    }

    formattedName = formattedName.replace(/-/g, ' ');
    return formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
  };

  const getEventIcon = (eventId: string) => {
    const iconClass = 'w-3.5 h-3.5';
    switch (eventId) {
      case 'slide_view': return <RiEyeLine className={iconClass} />;
      case 'slide_click': return <RiCursorLine className={iconClass} />;
      case 'slide_enter': return <RiMouseLine className={iconClass} />;
      case 'video_play': return <RiPlayLine className={iconClass} />;
      case 'video_pause': return <RiPauseLine className={iconClass} />;
      case 'pdf_open': case 'pdf_close': return <RiFileTextLine className={iconClass} />;
      case 'reserve_plot': return <RiMapPinLine className={iconClass} />;
      default: return <RiMouseLine className={iconClass} />;
    }
  };

  // Keys to hide from meta badges
  const HIDDEN_META_KEYS = new Set(['actor', 'pathname']);

  const META_LABELS: Record<string, string> = {
    bua: 'BUA (sq ft)',
    sqm: 'Area (sqm)',
    area: 'Area (sq ft)',
    gatNo: 'Gat No.',
    action: 'Action',
    plotId: 'Plot ID',
    status: 'Status',
    text: 'Text',
    tagName: 'Tag',
    timestamp: 'Time',
  };

  const formatMetaValue = (key: string, value: unknown): string => {
    // Format numeric timestamps as readable dates
    if (key === 'timestamp') {
      const num = typeof value === 'number' ? value : Number(value);
      if (!isNaN(num) && num > 1e12) {
        return format(new Date(num), 'dd MMM yyyy, hh:mm a');
      }
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    const str = String(value);
    return str.replace(/_/g, ' ').replace(/-/g, ' ');
  };

  const formatMeta = (meta: Record<string, unknown> | undefined) => {
    if (!meta || Object.keys(meta).length === 0) return null;
    const entries = Object.entries(meta).filter(
      ([key, value]) => value !== undefined && value !== null && typeof value !== 'object' && !HIDDEN_META_KEYS.has(key)
    );
    if (entries.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {entries.map(([key, value]) => (
          <span
            key={key}
            className="inline-flex items-center gap-1 px-2 py-0.5 border border-stone-alt bg-stone text-[9px] font-medium text-zinc-500"
          >
            <span className="text-zinc-400">{META_LABELS[key] || key}:</span>
            <span className="text-ink font-semibold capitalize">{formatMetaValue(key, value)}</span>
          </span>
        ))}
      </div>
    );
  };

  // Derive unique event types and client names for filters
  const uniqueEventTypes = Array.from(new Set(activityFeed.map(e => e.event_id))).filter(Boolean);
  const uniqueClients = Array.from(
    new Map(activityFeed.filter(e => e.user_name && e.user_name !== 'Advisor').map(e => [e.user_name!, e])).values()
  );

  const EVENT_TYPE_LABELS: Record<string, string> = {
    slide_view: 'Slide View',
    slide_click: 'Slide Click',
    slide_enter: 'Slide Enter',
    video_play: 'Video Play',
    video_pause: 'Video Pause',
    pdf_open: 'PDF Open',
    pdf_close: 'PDF Close',
    reserve_plot: 'Reserve Plot',
    cta_click: 'CTA Click',
  };

  // Apply filters
  const filteredFeed = activityFeed.filter(event => {
    if (filterEvent !== 'all' && event.event_id !== filterEvent) return false;
    if (filterClient !== 'all' && event.user_name !== filterClient) return false;
    return true;
  });

  // Group events by date
  const groupedEvents = filteredFeed.reduce<{ label: string; events: MeetingActivityEvent[] }[]>((groups, event) => {
    const label = formatDateLabel(event.time);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.events.push(event);
    } else {
      groups.push({ label, events: [event] });
    }
    return groups;
  }, []);

  // We only handle analytics, visitors and notes here. 'script' is handled as an overlay in TheaterView.
  if (activeDrawer === 'script' || !activeDrawer) return null;

  const selectItemClass = "text-[10px] font-semibold py-2.5 px-3 focus:bg-gold focus:!text-white data-[state=checked]:bg-gold data-[state=checked]:!text-white cursor-pointer rounded-lg transition-all";

  return (
    <AnimatePresence>
      <motion.div
        key="drawer-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setActiveDrawer(null)}
        className="fixed inset-0 bg-black/70 md:bg-black/60 md:backdrop-blur-md z-[999]"
      />
      <motion.aside
        key="drawer-aside"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed top-0 right-0 bottom-0 bg-ivory text-ink z-[1000] flex flex-col shadow-2xl",
          activeDrawer === 'analytics' ? "w-full sm:w-[800px]" : "w-full sm:w-[450px]"
        )}
      >
        {/* DRAWER HEADER */}
        <div className="p-6 md:p-10 pb-4 md:pb-6 flex items-center justify-between border-b border-stone-alt shrink-0">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {activeDrawer === 'analytics' ? 'Session Insights' : activeDrawer === 'notes' ? 'Session Notes' : 'Session Visitors'}
            </h2>
            <p className="text-[10px] md:text-xs text-zinc-500 font-medium">
              {activeDrawer === 'analytics' ? 'Real-time engagement telemetry.' : activeDrawer === 'notes' ? 'Manage live session notes and client requirements.' : 'Active participants in this engine.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveDrawer(null)}
              className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center hover:bg-stone transition-colors"
            >
              <RiCloseLine className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        {/* DRAWER CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 pt-4 md:pt-6">
          {activeDrawer === 'analytics' && (
            <div className="space-y-6">
              {/* Feed Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-[10px] font-semibold tracking-[0.12em] text-zinc-400 uppercase">Interaction Feed</h3>
                <div className="flex items-center gap-3">
                  <Select value={filterEvent} onValueChange={(v) => setFilterEvent(v ?? 'all')}>
                    <SelectTrigger className="w-fit h-auto bg-transparent border border-stone-alt px-2.5 py-1.5 text-[9px] font-semibold text-zinc-500 focus:ring-0 hover:border-gold hover:text-gold transition-colors gap-1.5 shadow-none">
                      <SelectValue placeholder="All Events" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10 text-zinc-400 rounded-lg p-1">
                      <SelectItem value="all" className={selectItemClass}>All Events</SelectItem>
                      {uniqueEventTypes.map(type => (
                        <SelectItem key={type} value={type} className={selectItemClass}>
                          {EVENT_TYPE_LABELS[type] || type.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterClient} onValueChange={(v) => setFilterClient(v ?? 'all')}>
                    <SelectTrigger className="w-fit h-auto bg-transparent border border-stone-alt px-2.5 py-1.5 text-[9px] font-semibold text-zinc-500 focus:ring-0 hover:border-gold hover:text-gold transition-colors gap-1.5 shadow-none">
                      <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10 text-zinc-400 rounded-lg p-1">
                      <SelectItem value="all" className={selectItemClass}>All Clients</SelectItem>
                      {uniqueClients.map(client => (
                        <SelectItem key={client.user_name!} value={client.user_name!} className={selectItemClass}>
                          {client.user_name}{client.user_mobile ? ` · ${client.user_mobile}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Feed Content */}
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse border border-stone-alt p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 bg-stone-alt shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-3/4 bg-stone-alt" />
                          <div className="h-2.5 w-1/2 bg-stone-alt" />
                        </div>
                        <div className="h-2.5 w-16 bg-stone-alt" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activityFeed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <RiMouseLine className="w-8 h-8 text-zinc-300 mb-3" />
                  <p className="text-xs font-medium text-zinc-500">No interaction data available yet.</p>
                  <p className="text-[10px] text-zinc-400 mt-1">Events will appear here in real-time.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedEvents.map((group) => (
                    <div key={group.label}>
                      {/* Date Separator */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[9px] font-semibold tracking-[0.1em] text-zinc-400 uppercase whitespace-nowrap">{group.label}</span>
                        <div className="flex-1 h-px bg-stone-alt" />
                      </div>

                      {/* Event Cards */}
                      <div className="space-y-2">
                        {group.events.map((event) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="group border border-stone-alt hover:border-gold/30 bg-white hover:bg-stone/30 transition-all p-3 sm:p-4"
                          >
                            <div className="flex items-start gap-3">
                              {/* Event Icon */}
                              <div className="w-7 h-7 shrink-0 bg-stone border border-stone-alt flex items-center justify-center text-zinc-400 group-hover:text-gold group-hover:border-gold/30 transition-colors">
                                {getEventIcon(event.event_id)}
                              </div>

                              {/* Event Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3">
                                  {/* Action + Client */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] sm:text-xs font-semibold text-ink leading-tight truncate">
                                      {formatActionName(event.name, event.event_id)}
                                    </p>
                                    {(event.user_name || event.user_mobile) && (
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <RiUserLine className="w-3 h-3 text-zinc-400 shrink-0" />
                                        <span className="text-[10px] font-medium text-zinc-500 truncate">
                                          {event.user_name || 'Client'}
                                        </span>
                                        {event.user_mobile && (
                                          <>
                                            <span className="text-zinc-300">·</span>
                                            <span className="text-[10px] text-zinc-400 font-normal">
                                              {event.user_mobile}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Time */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <RiTimeLine className="w-3 h-3 text-zinc-400" />
                                    <span className="text-[10px] font-medium text-zinc-400 tabular-nums whitespace-nowrap">
                                      {formatTime(event.time)}
                                    </span>
                                  </div>
                                </div>

                                {/* Meta Badges */}
                                {formatMeta(event.meta)}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Infinite Scroll Trigger */}
                  {hasMore && (
                    <div ref={setElementRef}>
                      {isFetchingMore ? (
                        <div className="space-y-2 pt-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse border border-stone-alt p-3 sm:p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-7 h-7 bg-stone-alt shrink-0" />
                                <div className="flex-1 space-y-2">
                                  <div className="h-3 w-3/5 bg-stone-alt" />
                                  <div className="h-2.5 w-2/5 bg-stone-alt" />
                                </div>
                                <div className="h-2.5 w-14 bg-stone-alt shrink-0" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {!hasMore && activityFeed.length > 0 && (
                    <div className="flex items-center justify-center py-4">
                      <span className="text-[9px] font-medium text-zinc-400 tracking-wide uppercase">End of activity log</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeDrawer === 'notes' && meetingUuid && (
            <MeetingNotesTab meetingUuid={meetingUuid} cardPadding="p-0" flat />
          )}

          {activeDrawer === 'visitors' && (
            <VisitorsPanel
              participants={participants}
              remoteStreams={remoteStreams as VisitorsPanelProps['remoteStreams']}
              muteUser={muteUser}
              requestUnmute={requestUnmute}
              muteAll={muteAll}
            />
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
