'use client';

import { BrandLogo } from '@/components/BrandLogo';
import { RiCalendarEventLine, RiDownloadLine } from 'react-icons/ri';
import {
  buildGoogleCalendarUrl,
  downloadIcsFile,
  meetingCalendarFromSchedule,
} from '@/lib/calendar';
import { cn } from '@/lib/utils';

export interface MeetingScheduleSource {
  date?: Date;
  time24: string;
  project: string;
  clientName: string;
  sessionLink?: string;
}

interface AddToCalendarActionsProps {
  schedule: MeetingScheduleSource;
  variant?: 'email' | 'panel';
  className?: string;
}

export function AddToCalendarActions({
  schedule,
  variant = 'panel',
  className,
}: AddToCalendarActionsProps) {
  const calendarInput = meetingCalendarFromSchedule(schedule);

  if (!calendarInput) {
    return (
      <p className={cn('text-xs font-medium text-zinc-500', className)}>
        Set session date and preferred time in step one to enable calendar invites.
      </p>
    );
  }

  const googleUrl = buildGoogleCalendarUrl(calendarInput);

  const handleDownloadIcs = () => {
    downloadIcsFile(calendarInput);
  };

  if (variant === 'email') {
    return (
      <div className={cn('space-y-3', className)}>
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#5f6368]">
          Add to calendar
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 border border-[#dadce0] bg-white px-4 py-2.5 text-xs font-semibold text-[#202124] no-underline transition-colors hover:border-gold hover:text-gold"
          >
            <BrandLogo brand="googleCalendar" size={18} alt="Google Calendar" />
            Add to Google Calendar
          </a>
          <button
            type="button"
            onClick={handleDownloadIcs}
            className="inline-flex items-center justify-center gap-2 border border-[#dadce0] bg-[#f8f9fa] px-4 py-2.5 text-xs font-semibold text-[#202124] transition-colors hover:border-gold hover:text-gold"
          >
            <RiDownloadLine size={14} />
            Download .ics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'space-y-3 border border-stone-alt bg-stone/30 p-4',
        className
      )}
    >
      <p className="flex items-center gap-2 text-xs font-semibold text-ink">
        <RiCalendarEventLine className="text-gold" size={16} />
        Calendar invite
      </p>
      <p className="text-xs font-medium leading-relaxed text-zinc-500">
        Clients can add this session to Google Calendar or any calendar app (.ics).
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-ink px-4 py-2.5 text-xs font-semibold text-ivory transition-colors hover:bg-gold"
        >
          <BrandLogo brand="googleCalendar" size={18} alt="Google Calendar" />
          Add to Google Calendar
        </a>
        <button
          type="button"
          onClick={handleDownloadIcs}
          className="inline-flex items-center justify-center gap-2 border border-stone-alt bg-ivory px-4 py-2.5 text-xs font-semibold text-ink transition-colors hover:border-gold"
        >
          <RiDownloadLine size={14} />
          Download .ics file
        </button>
      </div>
    </div>
  );
}
