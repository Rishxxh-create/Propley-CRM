'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  RiAddLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiFilter3Line,
  RiLockLine,
  RiPlayLine,
} from 'react-icons/ri';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { MeetingActionsMenu } from '@/components/presentations/MeetingActionsMenu';
import { MeetingMobileCard } from '@/components/presentations/MeetingMobileCard';
import {
  PresentationFiltersDrawer,
  countActiveFilters,
  normalizePresentationFilters,
} from '@/components/presentations/PresentationFiltersDrawer';
import WhatsAppShareModal from '@/components/presentations/WhatsAppShareModal';
import { DatePicker } from '@/components/presentations/DatePicker';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { TimeSelect } from '@/components/presentations/TimeSelect';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  downloadPresentationsCsv,
  filterPresentations,
  getParticipateLink,
  type PresentationFilters,
} from '@/lib/presentations-store';
import { rescheduleMeeting, cancelSchedule } from '@/lib/api/schedule';
import { createInstantMeeting } from '@/lib/api/meetings';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSelectedProject } from '@/store/selectors/projectsSelectors';
import { fetchMeetingsAllThunk, fetchSchedulesThunk } from '@/store/slices/meetingsThunks';
import {
  filtersFromSearchParams,
  filtersToSearchParams,
} from '@/lib/presentation-filters-url';
import { usePresentationsList } from '@/store/hooks/useMeetings';
import type { StoredMeeting } from '@/lib/mock-data';
import {
  formatMeetingDateLabel,
  parseIndianDateString,
} from '@/lib/date-format';
import { parseTimeValue, to24HourTime } from '@/lib/presentation-templates';
import { buildGoogleCalendarUrl, meetingCalendarFromSchedule } from '@/lib/calendar';
import { statusBadgeCn } from '@/lib/presentation-status';
import { toast } from '@/lib/toast';
import { PAGE } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { subscribeCobrowse } from '@/lib/cobrowse';
import {
  RiCalendarEventLine,
  RiCloseLine,
  RiCloseCircleLine,
  RiDownloadLine,
  RiTimeLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiSearchLine,
  RiCheckDoubleLine,
} from 'react-icons/ri';
import { Button } from '@/components/ui/button';

const cmsToolbarBtn =
  'inline-flex h-10 items-center justify-center gap-2 rounded-md border border-stone-alt bg-ivory px-4 text-xs font-semibold text-ink transition-colors hover:border-gold/50 hover:bg-stone/40';
const cmsToolbarBtnActive = 'border-gold bg-gold/10 text-gold hover:bg-gold/10';
const cmsPrimaryBtn =
  'inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-5 text-xs font-semibold text-ivory transition-colors hover:bg-gold';

function BulkActionsBar({
  selectedCount,
  onReschedule,
  onCancel,
  onExport,
  onDone,
}: {
  selectedCount: number;
  onReschedule: () => void;
  onCancel: () => void;
  onExport: () => void;
  onDone: () => void;
}) {
  const hasSelection = selectedCount > 0;

  return (
    <div
      className="sticky top-0 z-20 border border-gold/25 bg-stone/50 px-4 py-3 sm:px-5"
      role="region"
      aria-label="Bulk actions"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <span
            className={cn(
              'inline-flex h-9 shrink-0 items-center justify-center border px-3 text-xs font-semibold tabular-nums',
              hasSelection
                ? 'border-gold/40 bg-gold/10 text-gold'
                : 'border-stone-alt bg-ivory text-zinc-500'
            )}
          >
            {PAGE.presentations.bulk.selected(selectedCount)}
          </span>

          <div className="hidden h-8 w-px shrink-0 bg-stone-alt sm:block" aria-hidden />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasSelection}
              onClick={onReschedule}
              className="h-9 gap-2 rounded-lg border-stone-alt bg-ivory px-3 text-xs font-semibold enabled:hover:border-gold/50 enabled:hover:bg-stone"
            >
              <RiTimeLine size={15} className="text-gold" />
              {PAGE.presentations.bulk.reschedule}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasSelection}
              onClick={onCancel}
              className="h-9 gap-2 rounded-lg border-stone-alt bg-ivory px-3 text-xs font-semibold enabled:border-error/25 enabled:text-error enabled:hover:border-error/40 enabled:hover:bg-error-muted"
            >
              <RiCloseCircleLine size={15} />
              {PAGE.presentations.bulk.cancel}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasSelection}
              onClick={onExport}
              className="h-9 gap-2 rounded-lg border-stone-alt bg-ivory px-3 text-xs font-semibold enabled:hover:border-gold/50 enabled:hover:bg-stone"
            >
              <RiDownloadLine size={15} className="text-zinc-500" />
              {PAGE.presentations.bulk.export}
            </Button>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDone}
          className="h-9 w-full shrink-0 rounded-lg border-stone-alt bg-ivory px-5 text-xs font-semibold text-ink hover:border-gold/40 hover:bg-stone sm:w-auto"
        >
          {PAGE.presentations.bulk.done}
        </Button>
      </div>

      {!hasSelection && (
        <p className="mt-2 text-[10px] font-medium text-zinc-500">
          {PAGE.presentations.bulk.hint}
        </p>
      )}
    </div>
  );
}

function CopyButton({ content }: { content: string }) {
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    toast.copied();
  };
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        onClick={handleCopy}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-stone-alt bg-white text-gold transition-all hover:border-gold hover:bg-stone"
      >
        <RiFileCopyLine size={16} />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="z-[1100] border-none bg-ink px-3 py-1.5 text-xs font-semibold text-white"
      >
        {PAGE.presentations.copyClientLink}
      </TooltipContent>
    </Tooltip>
  );
}

export function PresentationsRegistry() {
  const router = useRouter();

  type PendingAction = 'start' | 'reschedule' | 'bulkReschedule' | 'cancel' | 'bulkCancel';
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const handleStartNow = useCallback(async () => {
    if (pendingAction) return;
    setPendingAction('start');
    try {
      const meeting = await createInstantMeeting({ meeting_for: 'Instant Presentation' });
      if (meeting?.uuid) {
        router.push(`/moderator/${meeting.uuid}`);
        return;
      }
      toast.error('Could not start the presentation.');
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(message || 'Could not start the presentation.');
    } finally {
      setPendingAction(null);
    }
  }, [router, pendingAction]);
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams]
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [highlightUuid, setHighlightUuid] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const PAGE_SIZE = 10;

  const dispatch = useAppDispatch();
  const selectedProject = useAppSelector(selectSelectedProject);
  const defaultProjectName = selectedProject?.name || 'The Ivory Pavilion';
  const { list: meetingsList, loading } = usePresentationsList();

  useEffect(() => {
    return subscribeCobrowse((detail) => {
      if (detail.action === 'presentation-created' && typeof detail.payload?.uuid === 'string') {
        setHighlightUuid(detail.payload.uuid);
        void dispatch(fetchMeetingsAllThunk({ force: true }));
        window.setTimeout(() => setHighlightUuid(null), 4000);
      }
    });
  }, [dispatch]);

  const applyFilters = useCallback(
    (next: PresentationFilters) => {
      const params = filtersToSearchParams(next, searchParams);
      const q = params.toString();
      router.replace(q ? `/meetings?${q}` : '/meetings', { scroll: false });
    },
    [router, searchParams]
  );

  const filtered = useMemo(
    () => {
      let result = filterPresentations(meetingsList, filters);
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        result = result.filter(m =>
          (m.client && m.client.toLowerCase().includes(q)) ||
          (m.property && m.property.toLowerCase().includes(q))
        );
      }
      return result;
    },
    [meetingsList, filters, searchQuery]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchQuery]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedMeetings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [whatsappMode, setWhatsappMode] = useState<'share' | 'resend'>('share');
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reschedulingMeeting, setReschedulingMeeting] = useState<StoredMeeting | null>(null);
  const [bulkRescheduleOpen, setBulkRescheduleOpen] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({
    date: undefined as Date | undefined,
    time: '',
  });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelingUuid, setCancelingUuid] = useState<string | null>(null);
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState({
    link: '',
    client: '',
    clientName: '',
    property: '',
    date: '',
    time: '',
  });

  const getGoogleCalendarUrl = (meeting: StoredMeeting) => {
    let parsedDate: Date | undefined;
    if (meeting.date) {
      parsedDate = parseIndianDateString(meeting.date) ?? undefined;
    }
    const schedule = {
      date: parsedDate,
      time24: meeting.time || '10:00',
      project: meeting.property || 'The Ivory Pavilion',
      clientName: meeting.client || 'Client',
      sessionLink: getParticipateLink(meeting.uuid),
    };
    const input = meetingCalendarFromSchedule(schedule);
    return input ? buildGoogleCalendarUrl(input) : '#';
  };

  const handleOpenShare = (meeting: StoredMeeting) => {
    const isParticipantCount = meeting.client.toLowerCase().includes('participant');
    const clientName = isParticipantCount ? meeting.property : (meeting.clientName || meeting.client);
    const projectName = isParticipantCount ? defaultProjectName : meeting.property;

    setSelectedMeeting({
      link: getParticipateLink(meeting.uuid),
      client: clientName,
      clientName: clientName,
      property: projectName,
      date: meeting.date,
      time: meeting.time,
    });
    setWhatsappMode('share');
    setShareModalOpen(true);
  };

  const handleOpenReschedule = (meeting: StoredMeeting) => {
    setReschedulingMeeting(meeting);
    const timeParts = parseTimeValue(meeting.time || '10:00');
    setRescheduleData({
      date: parseIndianDateString(meeting.date) ?? new Date(),
      time: to24HourTime(timeParts.hour12, timeParts.minute, timeParts.period),
    });
    setRescheduleOpen(true);
  };

  const handleUpdateReschedule = async () => {
    if (!reschedulingMeeting || !rescheduleData.date || pendingAction) return;
    setPendingAction('reschedule');
    try {
      const timeParts = rescheduleData.time.split(':');
      const apiDate = new Date(rescheduleData.date);
      apiDate.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10));

      await rescheduleMeeting(reschedulingMeeting.id || reschedulingMeeting.uuid, {
        start_time: apiDate.toISOString(),
      });

      toast.presentationRescheduled();
      setRescheduleOpen(false);
      void dispatch(fetchMeetingsAllThunk({ force: true }));
      router.push(
        `/meetings/${reschedulingMeeting.uuid}/resend?type=email&mode=reschedule`
      );
    } catch {
      toast.error('Failed to reschedule presentation');
    } finally {
      setPendingAction(null);
    }
  };

  const handleBulkReschedule = async () => {
    if (!rescheduleData.date || selected.size === 0 || pendingAction) return;
    setPendingAction('bulkReschedule');
    try {
      const timeParts = rescheduleData.time.split(':');
      const apiDate = new Date(rescheduleData.date);
      apiDate.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10));

      const selectedMeetings = meetingsList.filter((m) => selected.has(m.uuid));
      await Promise.all(
        selectedMeetings.map((m) =>
          rescheduleMeeting(m.id || m.uuid, { start_time: apiDate.toISOString() })
        )
      );

      toast.bulkRescheduled(selected.size);
      setBulkRescheduleOpen(false);
      setSelected(new Set());
      void dispatch(fetchMeetingsAllThunk({ force: true }));
    } catch {
      toast.error('Failed to reschedule some presentations');
    } finally {
      setPendingAction(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelingUuid || pendingAction) return;
    setPendingAction('cancel');
    try {
      const meeting = meetingsList.find((m) => m.uuid === cancelingUuid);
      if (meeting) {
        await cancelSchedule(meeting.id || meeting.uuid);
        toast.presentationCanceled();
        void dispatch(fetchMeetingsAllThunk({ force: true }));
      }
      setCancelOpen(false);
      setCancelingUuid(null);
    } catch {
      toast.error('Failed to cancel presentation');
    } finally {
      setPendingAction(null);
    }
  };

  const handleBulkCancel = async () => {
    if (selected.size === 0 || pendingAction) return;
    setPendingAction('bulkCancel');
    try {
      const selectedMeetings = meetingsList.filter((m) => selected.has(m.uuid));
      await Promise.all(selectedMeetings.map((m) => cancelSchedule(m.id || m.uuid)));

      toast.bulkCanceled(selected.size);
      setSelected(new Set());
      void dispatch(fetchMeetingsAllThunk({ force: true }));
      setBulkCancelOpen(false);
    } catch {
      toast.error('Failed to cancel some presentations');
    } finally {
      setPendingAction(null);
    }
  };

  const toggleSelect = (uuid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((m) => m.uuid)));
    }
  };

  const clearFilters = () => {
    applyFilters({ status: 'all', datePreset: 'all' });
  };

  const handleStatusTabClick = useCallback(
    (label: 'Live' | 'Scheduled' | 'Completed' | 'Canceled') => {
      const nextStatus = filters.status === label ? 'all' : label;
      applyFilters({ ...filters, status: nextStatus });
    },
    [applyFilters, filters]
  );

  const isEmpty = meetingsList.length === 0;
  const isFilteredEmpty = !isEmpty && filtered.length === 0;
  const activeFilterCount = countActiveFilters(filters);

  const statusCounts = useMemo(() => {
    const counts = { Live: 0, Scheduled: 0, Completed: 0, Canceled: 0 };
    for (const m of meetingsList) {
      if (m.status in counts) counts[m.status as keyof typeof counts]++;
    }
    return counts;
  }, [meetingsList]);

function PresentationsSkeleton() {
  return (
    <motion.div className="space-y-6 p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="border border-stone-alt bg-ivory rounded-xl overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-stone-alt px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="h-3 w-24 bg-stone-alt/60 animate-pulse rounded" />
            <div className="h-8 w-48 bg-stone-alt/60 animate-pulse rounded" />
            <div className="h-4 w-32 bg-stone-alt/60 animate-pulse rounded" />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 lg:gap-4">
            <div className="h-10 w-full sm:w-[240px] bg-stone-alt/60 animate-pulse rounded-lg" />
            <div className="flex gap-2">
              <div className="h-10 w-[90px] bg-stone-alt/60 animate-pulse rounded-md" />
              <div className="h-10 w-[100px] bg-stone-alt/60 animate-pulse rounded-md" />
              <div className="h-10 w-[140px] bg-stone-alt/60 animate-pulse rounded-md" />
            </div>
          </div>
        </div>
        <div className="bg-stone/20 px-6 py-4">
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[30px] w-24 bg-stone-alt/60 animate-pulse rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Table Skeleton */}
      <Card className="hidden py-0! overflow-hidden shadow-none! rounded-xl border border-stone-alt bg-gradient-to-b from-white to-stone/30 @2xl/dashboard:block">
        <CardContent className="p-0">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow className="border-b border-stone-alt bg-gradient-to-r from-stone/40 via-stone/10 to-stone/40">
                <TableHead className="h-11 w-16 px-5" />
                <TableHead className="h-11 px-5"><div className="h-3 w-16 bg-stone-alt/80 animate-pulse rounded" /></TableHead>
                <TableHead className="h-11 px-5"><div className="h-3 w-20 bg-stone-alt/80 animate-pulse rounded" /></TableHead>
                <TableHead className="h-11 px-5"><div className="h-3 w-24 bg-stone-alt/80 animate-pulse rounded" /></TableHead>
                <TableHead className="h-11 px-5"><div className="h-3 w-20 bg-stone-alt/80 animate-pulse rounded" /></TableHead>
                <TableHead className="h-11 px-5"><div className="h-3 w-24 bg-stone-alt/80 animate-pulse rounded" /></TableHead>
                <TableHead className="h-11 px-5"><div className="h-3 w-24 bg-stone-alt/80 animate-pulse rounded" /></TableHead>
                <TableHead className="h-11 w-14 px-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, idx) => (
                <TableRow key={idx} className="border-b border-stone-alt/80">
                  <TableCell className="px-5 py-4"><div className="h-4 w-6 bg-stone-alt/50 animate-pulse rounded" /></TableCell>
                  <TableCell className="px-5 py-4"><div className="h-6 w-20 bg-stone-alt/50 animate-pulse rounded-full" /></TableCell>
                  <TableCell className="px-5 py-4"><div className="h-4 w-32 bg-stone-alt/50 animate-pulse rounded" /></TableCell>
                  <TableCell className="px-5 py-4"><div className="h-4 w-40 bg-stone-alt/50 animate-pulse rounded" /></TableCell>
                  <TableCell className="px-5 py-4"><div className="h-4 w-28 bg-stone-alt/50 animate-pulse rounded" /></TableCell>
                  <TableCell className="px-5 py-4"><div className="h-11 w-[140px] bg-stone-alt/50 animate-pulse rounded-md" /></TableCell>
                  <TableCell className="px-5 py-4">
                    <div className="space-y-2">
                      <div className="h-4 w-24 bg-stone-alt/50 animate-pulse rounded" />
                      <div className="h-3 w-16 bg-stone-alt/50 animate-pulse rounded" />
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right"><div className="h-8 w-8 bg-stone-alt/50 animate-pulse rounded ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Mobile Cards Skeleton */}
      <div className="grid gap-4 @2xl/dashboard:hidden">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="rounded-xl border border-stone-alt bg-white p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <div className="h-6 w-20 bg-stone-alt/50 animate-pulse rounded-full" />
                <div className="h-5 w-40 bg-stone-alt/50 animate-pulse rounded" />
              </div>
              <div className="h-8 w-8 bg-stone-alt/50 animate-pulse rounded" />
            </div>
            <div className="space-y-2">
               <div className="h-4 w-32 bg-stone-alt/50 animate-pulse rounded" />
               <div className="h-4 w-24 bg-stone-alt/50 animate-pulse rounded" />
            </div>
            <div className="h-11 w-full bg-stone-alt/50 animate-pulse rounded-md mt-4" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

  if (loading) {
    return (
      <DashboardLayout activePath="/meetings">
        <div className="px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full">
          <PresentationsSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePath="/meetings">
      <motion.div className="space-y-6 px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full">
        <div className="border border-stone-alt bg-ivory rounded-xl overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-stone-alt px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-zinc-400">
                {PAGE.presentations.cmsLabel}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink @lg/dashboard:text-3xl">
                {PAGE.presentations.title}
                <span className="text-gold">.</span>
              </h1>
              <p className="mt-1 text-sm font-medium text-zinc-500">
                {PAGE.presentations.registryCount(filtered.length)}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 lg:gap-4">
              <div className="relative w-full sm:w-[240px] group flex-1">
                <RiSearchLine className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-400 group-focus-within:text-gold" />
                <Input
                  type="text"
                  placeholder="Search presentations..."
                  className="h-10 pl-9 w-full rounded-lg border-stone-alt bg-transparent focus-visible:border-gold"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className={cn(cmsToolbarBtn, activeFilterCount > 0 && cmsToolbarBtnActive)}
                >
                  <RiFilter3Line size={16} />
                  {PAGE.presentations.filters.open}
                  {activeFilterCount > 0 && (
                    <span className="min-w-[1.125rem] bg-gold px-1.5 py-0.5 text-center text-[10px] font-semibold text-ivory">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <Link href="/meetings/new" className={cn(cmsToolbarBtn, 'shrink-0')}>
                  <RiAddLine size={16} />
                  {PAGE.presentations.newCta}
                </Link>
              </div>
            </div>
          </div>
          <div className="bg-stone/20 px-6 py-4 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-3 min-w-max">
              {(
                [
                  ['Live', statusCounts.Live, RiPlayLine, 'bg-gold/10 border-gold/40 text-gold-hover', 'bg-gold/5 border-gold/20 text-gold hover:border-gold/40 hover:bg-gold/10'],
                  ['Scheduled', statusCounts.Scheduled, RiCalendarEventLine, 'bg-stone-alt border-zinc-300 text-ink', 'bg-white border-stone-alt text-zinc-600 hover:border-zinc-300 hover:bg-stone/50'],
                  ['Completed', statusCounts.Completed, RiCheckDoubleLine, 'bg-success/10 border-success/40 text-success', 'bg-success/5 border-success/20 text-success/80 hover:border-success/40 hover:bg-success/10'],
                  ['Canceled', statusCounts.Canceled, RiCloseCircleLine, 'bg-error/10 border-error/40 text-error', 'bg-error/5 border-error/20 text-error/80 hover:border-error/40 hover:bg-error/10'],
                ] as const
              ).map(([label, count, Icon, activeStyle, inactiveStyle]) => {
                const isSelected = filters.status === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleStatusTabClick(label)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs transition-all',
                      isSelected ? activeStyle : inactiveStyle
                    )}
                  >
                    <Icon size={14} className={cn(isSelected ? '' : 'opacity-70')} />
                    <span className="font-medium">{label}</span>
                    <span className="font-bold">
                      {String(count).padStart(2, '0')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <PresentationFiltersDrawer
          key={
            filtersOpen
              ? `open-${JSON.stringify(normalizePresentationFilters(filters))}`
              : 'closed'
          }
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          filters={filters}
          onApply={applyFilters}
        />

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 border border-stone-alt bg-stone/30 px-4 py-3">
            <span className="text-[10px] font-semibold tracking-[0.12em] text-zinc-500">
              {PAGE.presentations.filters.activeLabel}
            </span>
            {filters.status && filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-stone-alt bg-white rounded-full text-[10px] font-semibold text-ink/80 transition-colors hover:border-gold/40">
                {filters.status}
                <button
                  type="button"
                  aria-label="Remove status filter"
                  onClick={() => applyFilters({ ...filters, status: 'all' })}
                  className="text-zinc-400 hover:text-ink"
                >
                  <RiCloseLine size={12} />
                </button>
              </span>
            )}
            {filters.advisorName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-stone-alt bg-white rounded-full text-[10px] font-semibold text-ink/80 transition-colors hover:border-gold/40">
                {filters.advisorName}
                <button
                  type="button"
                  aria-label="Remove advisor filter"
                  onClick={() =>
                    applyFilters({ ...filters, advisorName: undefined, advisorId: undefined })
                  }
                  className="text-zinc-400 hover:text-ink"
                >
                  <RiCloseLine size={12} />
                </button>
              </span>
            )}
            {filters.project && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-stone-alt bg-white rounded-full text-[10px] font-semibold text-ink/80 transition-colors hover:border-gold/40">
                {filters.project}
                <button
                  type="button"
                  aria-label="Remove project filter"
                  onClick={() => applyFilters({ ...filters, project: undefined })}
                  className="text-zinc-400 hover:text-ink"
                >
                  <RiCloseLine size={12} />
                </button>
              </span>
            )}
            {filters.datePreset && filters.datePreset !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-gold/30 bg-gold/10 rounded-full text-[10px] font-semibold text-gold transition-colors hover:bg-gold/20">
                {filters.datePreset === 'today' && PAGE.presentations.filters.today}
                {filters.datePreset === 'week' && PAGE.presentations.filters.week}
                {filters.datePreset === 'month' && PAGE.presentations.filters.month}
                <button
                  type="button"
                  aria-label="Remove date filter"
                  onClick={() => applyFilters({ ...filters, datePreset: 'all' })}
                  className="text-gold/70 hover:text-gold"
                >
                  <RiCloseLine size={12} />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-[10px] font-semibold text-gold hover:text-gold-hover"
            >
              {PAGE.presentations.empty.clearFilters}
            </button>
          </div>
        )}

        {bulkMode && (
          <BulkActionsBar
            selectedCount={selected.size}
            onReschedule={() => setBulkRescheduleOpen(true)}
            onCancel={() => setBulkCancelOpen(true)}
            onExport={() =>
              downloadPresentationsCsv(filtered.filter((m) => selected.has(m.uuid)))
            }
            onDone={() => {
              setBulkMode(false);
              setSelected(new Set());
            }}
          />
        )}

        {isEmpty && (
          <EmptyState
            title={PAGE.presentations.empty.title}
            description={PAGE.presentations.empty.description}
            actionLabel={pendingAction === 'start' ? 'Starting…' : 'Start presentation'}
            onAction={handleStartNow}
            actionDisabled={pendingAction === 'start'}
            icon={<RiCalendarEventLine size={28} />}
          />
        )}

        {isFilteredEmpty && (
          <EmptyState
            title={PAGE.presentations.empty.filtered}
            description={PAGE.presentations.empty.filteredHint}
            actionLabel={PAGE.presentations.empty.clearFilters}
            onAction={clearFilters}
          />
        )}

        {!isEmpty && !isFilteredEmpty && (
          <>
            <Card className="hidden py-0! overflow-hidden shadow-none! rounded-xl border border-stone-alt bg-gradient-to-b from-white to-stone/30 @2xl/dashboard:block">
              <CardContent className="p-0">
                <Table className="min-w-[1100px]">
                  <TableHeader>
                    <TableRow className="border-b border-stone-alt bg-gradient-to-r from-stone/40 via-stone/10 to-stone/40 hover:bg-transparent">
                      {bulkMode && (
                        <TableHead className="h-11 w-12 px-3">
                          <Checkbox
                            checked={selected.size === filtered.length && filtered.length > 0}
                            onCheckedChange={toggleAll}
                          />
                        </TableHead>
                      )}
                      <TableHead className="h-11 px-5 text-xs font-semibold text-zinc-500">#</TableHead>
                      <TableHead className="h-11 px-5 text-xs font-semibold text-zinc-500">
                        {PAGE.presentations.columns.status}
                      </TableHead>
                      <TableHead className="h-11 px-5 text-xs font-semibold text-zinc-500">
                        {PAGE.presentations.columns.advisor}
                      </TableHead>
                      <TableHead className="h-11 px-5 text-xs font-semibold text-zinc-500">
                        {PAGE.presentations.columns.project}
                      </TableHead>
                      <TableHead className="h-11 px-5 text-xs font-semibold text-zinc-500">
                        {PAGE.presentations.columns.client}
                      </TableHead>
                      <TableHead className="h-11 px-5 text-xs font-semibold text-zinc-500">
                        {PAGE.presentations.columns.accessShare}
                      </TableHead>
                      <TableHead className="h-11 px-5 text-xs font-semibold text-zinc-500">
                        {PAGE.presentations.columns.scheduled}
                      </TableHead>
                      <TableHead className="h-11 w-14 px-5 text-right text-xs font-semibold text-zinc-500">
                        {PAGE.presentations.columns.actions}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMeetings.map((meeting, idx) => {
                      const pLink = getParticipateLink(meeting.uuid);
                      const isCanceled = meeting.status === 'Canceled';
                      const globalIdx = (currentPage - 1) * PAGE_SIZE + idx + 1;
                      return (
                        <TableRow
                          key={meeting.uuid}
                          className={cn(
                            'border-b border-stone-alt/80 transition-all hover:bg-gradient-to-r hover:from-stone/30 hover:to-white',
                            highlightUuid === meeting.uuid &&
                            'bg-gold/10 ring-1 ring-inset ring-gold/40'
                          )}
                        >
                          {bulkMode && (
                            <TableCell className="px-3 py-4">
                              <Checkbox
                                checked={selected.has(meeting.uuid)}
                                onCheckedChange={() => toggleSelect(meeting.uuid)}
                              />
                            </TableCell>
                          )}
                          <TableCell className="px-5 py-4 text-xs font-semibold text-zinc-400">
                            {String(globalIdx).padStart(2, '0')}
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <span className={statusBadgeCn(meeting.status)}>{meeting.status}</span>
                          </TableCell>
                          <TableCell className="px-5 py-4 text-xs font-semibold text-ink">
                            {meeting.salesMember}
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <p className={cn('text-sm font-semibold text-gold', isCanceled && 'line-through text-zinc-400')}>
                              {meeting.property}
                            </p>
                          </TableCell>
                          <TableCell className={cn('px-5 py-4 text-sm font-semibold', isCanceled && 'text-zinc-400 line-through')}>
                            {meeting.client}
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <div className="flex max-w-[260px] items-center gap-2">
                              {!isCanceled ? (
                                <Link href={`/moderator/${meeting.uuid}`} className="min-w-0 flex-1">
                                  <button
                                    type="button"
                                    className="flex h-11 w-full items-center justify-between gap-2 rounded-md border border-stone-alt bg-stone px-3 text-xs font-semibold text-ink transition-all hover:border-gold hover:bg-gold hover:text-white"
                                  >
                                    <span className="truncate">{PAGE.presentations.salesPortal}</span>
                                    <RiExternalLinkLine size={14} className="shrink-0" />
                                  </button>
                                </Link>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger
                                    type="button"
                                    aria-disabled
                                    className="flex h-11 min-w-0 flex-1 cursor-not-allowed items-center justify-between gap-2 rounded-md border border-stone-alt/60 bg-stone/40 px-3 text-xs font-semibold text-zinc-400"
                                  >
                                    <span className="truncate">{PAGE.presentations.portalLocked}</span>
                                    <RiLockLine size={14} className="shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="z-[1100] max-w-xs border-none bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                                  >
                                    {PAGE.presentations.cancel.description}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <CopyButton content={pLink} />
                            </div>
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <p className="text-xs font-semibold text-ink">
                              {formatMeetingDateLabel(meeting.date)}
                            </p>
                            <p className="text-xs text-zinc-500">{meeting.time}</p>
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <MeetingActionsMenu
                              meeting={meeting}
                              isCanceled={isCanceled}
                              onReschedule={() => handleOpenReschedule(meeting)}
                              onCancel={() => {
                                setCancelingUuid(meeting.uuid);
                                setCancelOpen(true);
                              }}
                              onShare={() => handleOpenShare(meeting)}
                              onResendEmail={() => router.push(`/meetings/${meeting.uuid}/resend?type=email`)}
                              onResendWhatsApp={() => router.push(`/meetings/${meeting.uuid}/resend?type=whatsapp`)}
                              onCopyLink={() => {
                                navigator.clipboard.writeText(pLink);
                                toast.copied();
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-stone-alt bg-stone/5 px-5 py-3">
                    <span className="text-xs font-medium text-zinc-500">
                      Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} entries
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                        className="h-8 gap-1 rounded-lg border-stone-alt bg-ivory pl-2 pr-3 text-xs font-semibold hover:border-gold/50"
                      >
                        <RiArrowLeftSLine size={16} />
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        className="h-8 gap-1 rounded-lg border-stone-alt bg-ivory pl-3 pr-2 text-xs font-semibold hover:border-gold/50"
                      >
                        Next
                        <RiArrowRightSLine size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4 @2xl/dashboard:hidden">
              {paginatedMeetings.map((meeting, idx) => (
                <MeetingMobileCard
                  key={meeting.uuid}
                  meeting={meeting}
                  index={idx}
                  participateLink={getParticipateLink(meeting.uuid)}
                  calendarUrl={getGoogleCalendarUrl(meeting)}
                  isCanceled={meeting.status === 'Canceled'}
                  onShare={() => handleOpenShare(meeting)}
                  onReschedule={() => handleOpenReschedule(meeting)}
                  onCancel={() => {
                    setCancelingUuid(meeting.uuid);
                    setCancelOpen(true);
                  }}
                  onResendEmail={() => router.push(`/meetings/${meeting.uuid}/resend?type=email`)}
                  onResendWhatsApp={() => router.push(`/meetings/${meeting.uuid}/resend?type=whatsapp`)}
                  onCopyLink={() => {
                    navigator.clipboard.writeText(getParticipateLink(meeting.uuid));
                    toast.copied();
                  }}
                />
              ))}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border border-stone-alt bg-ivory px-4 py-3 rounded-xl mt-4">
                  <span className="text-[10px] font-medium text-zinc-500">
                    {currentPage} / {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="h-7 gap-1 rounded-lg border-stone-alt pl-1.5 pr-2.5 text-[10px] font-semibold"
                    >
                      <RiArrowLeftSLine size={14} />
                      Prev
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="h-7 gap-1 rounded-lg border-stone-alt pl-2.5 pr-1.5 text-[10px] font-semibold"
                    >
                      Next
                      <RiArrowRightSLine size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>

      <WhatsAppShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        link={selectedMeeting.link}
        clientName={selectedMeeting.clientName || selectedMeeting.client}
        projectName={selectedMeeting.property}
        mode={whatsappMode}
      />

      <Drawer
        open={rescheduleOpen}
        onOpenChange={(open) => {
          if (!pendingAction) setRescheduleOpen(open);
        }}
        direction="right"
        modal={false}
      >
        <DrawerContent className="flex h-full flex-col justify-between overflow-hidden rounded-lg border-s border-stone-alt bg-white outline-none sm:w-[500px]">
          <div className="shrink-0 border-b border-stone-alt p-8">
            <DrawerTitle className="text-2xl font-semibold tracking-tight text-ink">
              {PAGE.presentations.reschedule.title}
            </DrawerTitle>
          </div>
          <div className="flex-1 space-y-8 overflow-y-auto p-8 custom-scrollbar">
            <div className="space-y-4">
              <Label>{PAGE.presentations.reschedule.date}</Label>
              <DatePicker
                value={rescheduleData.date}
                onChange={(date) => setRescheduleData({ ...rescheduleData, date })}
              />
            </div>
            <div className="space-y-4">
              <Label>{PAGE.presentations.reschedule.time}</Label>
              <TimeSelect
                value={rescheduleData.time}
                onChange={(time) =>
                  setRescheduleData((prev) => ({ ...prev, time }))
                }
              />
            </div>
          </div>
          <div className="flex shrink-0 gap-4 border-t border-stone-alt bg-stone/20 p-8">
            <button
              type="button"
              disabled={pendingAction === 'reschedule'}
              onClick={() => setRescheduleOpen(false)}
              className="flex-1 border border-stone-alt py-4 text-xs font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pendingAction === 'reschedule'}
              onClick={handleUpdateReschedule}
              className="flex-1 bg-ink py-4 text-xs font-semibold text-white hover:bg-gold disabled:opacity-60"
            >
              {pendingAction === 'reschedule' ? 'Updating…' : PAGE.presentations.reschedule.submit}
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={bulkRescheduleOpen}
        onOpenChange={(open) => {
          if (!pendingAction) setBulkRescheduleOpen(open);
        }}
        direction="right"
        modal={false}
      >
        <DrawerContent className="flex h-full flex-col rounded-lg border-s border-stone-alt bg-white sm:w-[500px]">
          <div className="border-b border-stone-alt p-8">
            <DrawerTitle className="text-xl font-semibold text-ink">
              {PAGE.presentations.bulk.reschedule}
            </DrawerTitle>
          </div>
          <div className="space-y-8 p-8">
            <DatePicker
              value={rescheduleData.date}
              onChange={(date) => setRescheduleData({ ...rescheduleData, date })}
            />
            <TimeSelect
              value={rescheduleData.time}
              onChange={(time) =>
                setRescheduleData((prev) => ({ ...prev, time }))
              }
            />
          </div>
          <div className="border-t border-stone-alt p-8">
            <button
              type="button"
              disabled={pendingAction === 'bulkReschedule'}
              onClick={handleBulkReschedule}
              className="w-full bg-ink py-4 text-xs font-semibold text-white hover:bg-gold disabled:opacity-60"
            >
              {pendingAction === 'bulkReschedule'
                ? 'Updating…'
                : PAGE.presentations.reschedule.submit}
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => {
          if (!pendingAction) setCancelOpen(open);
        }}
      >
        <DialogContent className="max-w-md rounded-lg border border-stone-alt bg-ivory p-8">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold uppercase tracking-[0.15em] text-red-600">
              {PAGE.presentations.cancel.title}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium leading-relaxed text-zinc-500">
              {PAGE.presentations.cancel.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3">
            <button
              type="button"
              disabled={pendingAction === 'cancel'}
              onClick={() => setCancelOpen(false)}
              className="flex-1 border border-stone-alt py-3 text-xs font-semibold disabled:opacity-50"
            >
              {PAGE.presentations.cancel.keep}
            </button>
            <button
              type="button"
              disabled={pendingAction === 'cancel'}
              onClick={handleConfirmCancel}
              className="flex-1 bg-red-600 py-3 text-xs font-semibold text-white disabled:opacity-60"
            >
              {pendingAction === 'cancel' ? 'Canceling…' : PAGE.presentations.cancel.confirm}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkCancelOpen}
        onOpenChange={(open) => {
          if (!pendingAction) setBulkCancelOpen(open);
        }}
      >
        <DialogContent className="max-w-md rounded-lg border border-stone-alt bg-ivory p-8">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-red-600">
              {PAGE.presentations.bulk.confirmCancel}
            </DialogTitle>
          </DialogHeader>
          <DialogFooter className="mt-6 flex gap-3">
            <button
              type="button"
              disabled={pendingAction === 'bulkCancel'}
              onClick={() => setBulkCancelOpen(false)}
              className="flex-1 border border-stone-alt py-3 text-xs font-semibold disabled:opacity-50"
            >
              {PAGE.presentations.cancel.keep}
            </button>
            <button
              type="button"
              disabled={pendingAction === 'bulkCancel'}
              onClick={handleBulkCancel}
              className="flex-1 bg-red-600 py-3 text-xs font-semibold text-white disabled:opacity-60"
            >
              {pendingAction === 'bulkCancel' ? 'Canceling…' : PAGE.presentations.cancel.confirm}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
