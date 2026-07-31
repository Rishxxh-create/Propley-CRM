'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  RiExternalLinkLine,
  RiFileCopyLine,
  RiLockLine,
  RiTimeLine,
  RiUser3Line,
  RiWhatsappLine,
} from 'react-icons/ri';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BrandLogo } from '@/components/BrandLogo';
import { formatMeetingDateLabel } from '@/lib/date-format';
import { MeetingActionsMenu } from '@/components/presentations/MeetingActionsMenu';
import type { StoredMeeting } from '@/lib/mock-data';
import { PAGE } from '@/lib/copy';
import { cn } from '@/lib/utils';

function statusBadgeClass(status: StoredMeeting['status']) {
  if (status === 'Canceled') return 'bg-red-50 text-red-600 border-red-100';
  if (status === 'Live') return 'bg-gold/10 text-gold border-gold/30';
  if (status === 'Completed') return 'bg-stone text-zinc-600 border-stone-alt';
  return 'bg-stone text-zinc-500 border-stone-alt';
}

function CopyLinkButton({ content }: { content: string }) {
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
  };

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        onClick={handleCopy}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-stone-alt bg-white text-gold transition-all hover:border-gold hover:bg-stone"
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

export interface MeetingMobileCardProps {
  meeting: StoredMeeting;
  index: number;
  participateLink: string;
  calendarUrl: string;
  isCanceled: boolean;
  onShare: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  onResendEmail: () => void;
  onResendWhatsApp: () => void;
  onCopyLink: () => void;
}

export function MeetingMobileCard({
  meeting,
  index,
  participateLink,
  calendarUrl,
  isCanceled,
  onShare,
  onReschedule,
  onCancel,
  onResendEmail,
  onResendWhatsApp,
  onCopyLink,
}: MeetingMobileCardProps) {
  const status = meeting.status ?? 'Live';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: 'easeOut' }}
    >
      <Card className="overflow-hidden pt-0! rounded-lg border-stone-alt bg-ivory shadow-none!">
        <div className="h-[3px] bg-gold" aria-hidden />
        <CardContent className="p-0">
          <div className="flex items-start justify-between gap-3 border-b border-stone-alt px-4 py-4 sm:px-5">
            <div className="min-w-0 flex-1 space-y-2">
              <span
                className={cn(
                  'inline-flex border px-2 py-0.5 text-[10px] font-semibold',
                  statusBadgeClass(status)
                )}
              >
                {status}
              </span>
              <div>
                <p
                  className={cn(
                    'text-base font-semibold leading-snug text-gold sm:text-lg',
                    isCanceled && 'text-zinc-400 line-through'
                  )}
                >
                  {meeting.property}
                </p>
                <p className="mt-0.5 text-xs font-medium text-zinc-500">{meeting.category}</p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                <RiUser3Line className="shrink-0 text-gold" size={14} />
                <span className="truncate">{meeting.salesMember}</span>
              </div>
            </div>
            <MeetingActionsMenu
              meeting={meeting}
              isCanceled={isCanceled}
              onReschedule={onReschedule}
              onCancel={onCancel}
              onShare={onShare}
              onResendEmail={onResendEmail}
              onResendWhatsApp={onResendWhatsApp}
              onCopyLink={onCopyLink}
              align="end"
            />
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-stone-alt bg-stone-alt sm:grid-cols-3">
            <div className="bg-ivory px-4 py-3 sm:px-5">
              <p className="text-[10px] font-semibold tracking-[0.1em] text-zinc-400 uppercase label-premium">
                Date
              </p>
              <p
                className={cn(
                  'mt-1 text-xs font-semibold text-ink',
                  isCanceled && 'text-zinc-400 line-through'
                )}
              >
                {formatMeetingDateLabel(meeting.date)}
              </p>
            </div>
            <div className="bg-ivory px-4 py-3 sm:px-5">
              <p className="text-[10px] font-semibold tracking-[0.1em] text-zinc-400 uppercase label-premium">
                Time
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-ink">
                <RiTimeLine className="shrink-0 text-gold" size={12} />
                {meeting.time}
              </p>
            </div>
            <div className="col-span-2 flex items-center bg-ivory px-4 py-3 sm:col-span-1 sm:px-5">
              {!isCanceled ? (
                <a
                  href={calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gold transition-colors hover:text-gold-hover"
                  title="Add to Google Calendar"
                >
                  <BrandLogo brand="googleCalendar" size={16} alt="Google Calendar" />
                  Add to calendar
                </a>
              ) : (
                <span className="text-[11px] font-medium text-zinc-400">Calendar unavailable</span>
              )}
            </div>
          </div>

          <div className="border-b border-stone-alt px-4 py-3 sm:px-5">
            <p className="text-[10px] font-semibold tracking-[0.1em] text-zinc-400 uppercase label-premium">
              Lead client
            </p>
            <p
              className={cn(
                'mt-1 text-sm font-semibold text-ink',
                isCanceled && 'text-zinc-400 line-through'
              )}
            >
              {meeting.client}
            </p>
          </div>

          <div className="space-y-2 p-4 sm:space-y-2.5 sm:p-5">
            <div className="flex gap-2">
              {!isCanceled ? (
                <Link href={`/moderator/${meeting.uuid}`} className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="group flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-ink bg-ink text-xs font-semibold text-white transition-all hover:border-gold hover:bg-gold"
                  >
                    <span>Enter Sales Portal</span>
                    <RiExternalLinkLine
                      size={14}
                      className="shrink-0 text-white transition-colors group-hover:text-white"
                    />
                  </button>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex h-11 min-w-0 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-stone-alt/60 bg-stone/40 text-xs font-semibold text-zinc-400"
                >
                  <RiLockLine size={14} className="shrink-0" />
                  <span>Portal locked</span>
                </button>
              )}
              <CopyLinkButton content={participateLink} />
            </div>

            {!isCanceled ? (
              <button
                type="button"
                onClick={onShare}
                className="group flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#075E54]/30 bg-white text-xs font-semibold text-[#075E54] transition-all hover:border-[#075E54] hover:bg-[#075E54] hover:text-white"
              >
                <RiWhatsappLine
                  size={16}
                  className="shrink-0 text-[#075E54] transition-colors group-hover:text-white"
                />
                Share invitation
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-stone-alt/50 bg-stone/20 text-xs font-semibold text-zinc-400"
              >
                <RiWhatsappLine size={16} className="shrink-0" />
                Invite locked
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
