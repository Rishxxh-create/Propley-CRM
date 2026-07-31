'use client';

import { formatIndianDate } from '@/lib/date-format';
import {
  RiBuilding4Line,
  RiCalendarLine,
  RiCheckboxCircleLine,
  RiFileList3Line,
  RiMailLine,
  RiTimeLine,
  RiUser3Line,
  RiWhatsappLine,
} from 'react-icons/ri';
import { formatSessionTime } from '@/lib/presentation-templates';
import { PAGE } from '@/lib/copy';

interface ReservationSummaryProps {
  project: string;
  clientLabel: string;
  date?: Date;
  time: string;
}

export function ReservationSummary({
  project,
  clientLabel,
  date,
  time,
}: ReservationSummaryProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2 border-b border-stone-alt pb-4">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
          <RiFileList3Line size={14} />
          {PAGE.schedule.summary.title}
        </p>
        <h3 className="text-sm font-semibold tracking-tight text-ink">{PAGE.schedule.sections.target}</h3>
      </div>

      <dl className="space-y-5">
        <div className="space-y-1">
          <dt className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <RiBuilding4Line size={13} className="text-gold" />
            {PAGE.schedule.summary.project}
          </dt>
          <dd className="text-lg font-semibold tracking-tight text-ink">
            {project || PAGE.schedule.summary.untitledProject}
          </dd>
        </div>
        <div className="space-y-1 border-t border-stone-alt/70 pt-4">
          <dt className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <RiUser3Line size={13} className="text-gold" />
            {PAGE.schedule.summary.client}
          </dt>
          <dd className="text-sm font-semibold text-gold">
            {clientLabel || PAGE.schedule.summary.newProspect}
          </dd>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-stone-alt/70 pt-4">
          <div className="space-y-1">
            <dt className="text-xs font-medium text-zinc-500">Session date</dt>
            <dd className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <RiCalendarLine className="text-gold" size={14} />
              {date ? formatIndianDate(date) : 'Select date'}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium text-zinc-500">Preferred time</dt>
            <dd className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <RiTimeLine className="text-gold" size={14} />
              {formatSessionTime(time)}
            </dd>
          </div>
        </div>
      </dl>

      <div className="space-y-3 border-t border-stone-alt/70 pt-5">
        <p className="text-xs font-medium text-zinc-500">{PAGE.schedule.summary.channels}</p>
        <p className="text-[11px] font-medium leading-relaxed text-zinc-400">
          Sent automatically when you schedule — the client receives the invite and the
          session is added to the calendar.
        </p>
        <div className="flex items-center gap-3 text-sm font-medium text-zinc-600">
          <RiCheckboxCircleLine className="shrink-0 text-gold" size={18} />
          <RiMailLine size={14} className="shrink-0 text-gold" />
          {PAGE.schedule.summary.emailOn}
        </div>
        <div className="flex items-center gap-3 text-sm font-medium text-zinc-600">
          <RiCheckboxCircleLine className="shrink-0 text-gold" size={18} />
          <RiWhatsappLine size={14} className="shrink-0 text-[#075E54]" />
          {PAGE.schedule.summary.whatsappOn}
        </div>
      </div>
    </div>
  );
}
