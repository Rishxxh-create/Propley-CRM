'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { isSameDay, isToday } from 'date-fns';
import {
  formatIndianDate,
  IN_DAY_MONTH_YEAR,
  IN_WEEKDAY_SHORT,
} from '@/lib/date-format';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarEventLine,
  RiExternalLinkLine,
  RiGroupLine,
  RiUser3Line,
} from 'react-icons/ri';
import type { StoredMeeting } from '@/lib/mock-data';
import {
  CALENDAR_HOURS,
  type CalendarViewMode,
  formatCalendarTitle,
  getVisibleRange,
  isCurrentMonth,
  meetingStartAt,
  meetingsForDay,
  navigateCursor,
} from '@/lib/presentation-calendar-utils';
import { statusBadgeCn, statusCalendarClass } from '@/lib/presentation-status';
import { PAGE } from '@/lib/copy';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface PresentationGoogleCalendarProps {
  meetings: StoredMeeting[];
}

export function PresentationGoogleCalendar({ meetings: initialMeetings }: PresentationGoogleCalendarProps) {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<CalendarViewMode>('month');
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [hideCompleted, setHideCompleted] = useState(true);

  const meetings = useMemo(() => {
    if (hideCompleted) return initialMeetings.filter(m => m.status !== 'Completed');
    return initialMeetings;
  }, [initialMeetings, hideCompleted]);

  const { days } = useMemo(() => getVisibleRange(cursor, view), [cursor, view]);

  const goToday = () => {
    const now = new Date();
    setCursor(now);
    setSelectedDay(now);
  };

  const eventHref = (m: StoredMeeting) =>
    m.status === 'Canceled' ? '/meetings' : `/moderator/${m.uuid}`;

  const formatHourLabel = (hour: number) =>
    hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;

  const dayEventBlock = (m: StoredMeeting) => (
    <Link
      key={m.uuid}
      href={eventHref(m)}
      className={cn(
        'group grid w-full grid-cols-1 overflow-hidden border border-stone-alt transition-all hover:border-gold/40 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch rounded-xl bg-ivory',
        m.status === 'Completed' ? 'bg-gradient-to-br from-emerald-600/5 to-transparent' : 'bg-gradient-to-br from-gold/5 to-transparent',
        m.status === 'Canceled' && 'opacity-50'
      )}
      title={`${m.property}${m.client !== '—' ? ` · ${m.client}` : ''}`}
    >

      <div className="flex min-w-0 flex-col justify-center gap-2 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-[13px] font-semibold leading-snug text-ink">{m.property !== '—' ? m.property : 'Presentation'}</p>
          <span className={statusBadgeCn(m.status, 'shrink-0 rounded-md')}>{m.status}</span>
        </div>
        {m.client && m.client !== '—' && (
          <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium leading-none text-zinc-600">
            <RiUser3Line size={13} className="shrink-0 text-gold" aria-hidden />
            <span className="truncate">{m.client}</span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {m.time && (
            <span className="text-[11px] font-medium tabular-nums text-zinc-500">{m.time}</span>
          )}
          {m.clientCount && m.clientCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500">
              <RiGroupLine size={12} className="text-gold/70" aria-hidden />
              {m.clientCount} participant{m.clientCount === 1 ? '' : 's'}
            </span>
          )}
          {m.salesMember && m.salesMember !== '—' && (
            <span className="text-[11px] font-medium text-zinc-400">{m.salesMember}</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-stone-alt px-4 py-3 sm:border-t-0 sm:border-l sm:px-5 sm:py-4">
        {m.status !== 'Canceled' ? (
          <span className="inline-flex h-9 shrink-0 items-center gap-1.5 border border-stone-alt bg-white px-3 text-[10px] font-semibold text-ink transition-colors group-hover:bg-ink group-hover:text-ivory rounded-md">
            {PAGE.presentations.salesPortal}
            <RiExternalLinkLine size={12} className="shrink-0" />
          </span>
        ) : (
          <span className="hidden h-9 sm:block" aria-hidden />
        )}
      </div>
    </Link>
  );

  const eventBlock = (m: StoredMeeting, compact?: boolean) => (
    <Link
      key={m.uuid}
      href={eventHref(m)}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'flex flex-col text-left transition-all border border-stone-alt hover:border-gold/40 rounded-md overflow-hidden bg-ivory',
        m.status === 'Completed' ? 'bg-gradient-to-br from-emerald-600/5 to-transparent' : 'bg-gradient-to-br from-gold/5 to-transparent',
        m.status === 'Canceled' && 'opacity-50',
        compact ? 'mb-1' : 'mb-2'
      )}
      title={[m.property !== '—' ? m.property : '', m.client !== '—' ? m.client : '', m.time].filter(Boolean).join(' · ')}
    >
      <div className={cn("px-2.5 py-1.5", compact && "px-1.5 py-1")}>
        <div className="flex items-center justify-between gap-1">
          <p className="truncate text-[10px] font-semibold leading-tight text-ink">
            {m.property !== '—' ? m.property : 'Presentation'}
          </p>
          {m.time && (
            <span className="shrink-0 text-[9px] font-medium tabular-nums text-zinc-400">
              {m.time}
            </span>
          )}
        </div>
        {m.client && m.client !== '—' && (
          <p className="truncate text-[9px] font-medium text-zinc-500 mt-0.5">{m.client}</p>
        )}
        {!compact && m.salesMember && m.salesMember !== '—' && (
          <p className="mt-0.5 truncate text-[9px] font-medium text-zinc-400">
            {m.salesMember}
          </p>
        )}
      </div>
    </Link>
  );

  return (
    <div className="overflow-hidden border border-stone-alt bg-ivory rounded-xl">
      {/* Google-style toolbar */}
      <div className="flex flex-col gap-4 border-b border-stone-alt bg-stone/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="border border-stone-alt bg-ivory px-4 py-2 text-xs font-semibold text-ink hover:border-gold/40 rounded-md transition-colors"
          >
            {PAGE.calendar.today}
          </button>
          <div className="flex border border-stone-alt rounded-md overflow-hidden">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => setCursor(navigateCursor(cursor, view, -1))}
              className="flex h-9 w-9 items-center justify-center bg-ivory text-ink hover:bg-stone transition-colors"
            >
              <RiArrowLeftSLine size={18} />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => setCursor(navigateCursor(cursor, view, 1))}
              className="flex h-9 w-9 items-center justify-center border-l border-stone-alt bg-ivory text-ink hover:bg-stone transition-colors"
            >
              <RiArrowRightSLine size={18} />
            </button>
          </div>
          <h2 className="min-w-[140px] text-sm font-semibold text-ink sm:text-base ml-2">
            {formatCalendarTitle(cursor, view)}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-zinc-600 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={hideCompleted} 
              onChange={(e) => setHideCompleted(e.target.checked)} 
              className="accent-gold h-3.5 w-3.5 rounded-lg border-stone-alt"
            />
            Hide Completed
          </label>
          <div className="flex border border-stone-alt rounded-md overflow-hidden">
          {(['day', 'week', 'month'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={cn(
                'px-4 py-2 text-xs font-semibold capitalize transition-colors',
                view === mode
                  ? 'bg-ink text-ivory'
                  : 'bg-ivory text-zinc-500 hover:bg-stone hover:text-ink'
              )}
            >
              {PAGE.calendar.views[mode]}
            </button>
          ))}
          </div>
        </div>
      </div>

      {view === 'month' && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-7 border-b border-stone-alt bg-stone/20">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="border-r border-stone-alt py-2 text-center text-[10px] font-semibold tracking-wide text-zinc-500 last:border-r-0"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid min-w-[720px] grid-cols-7">
            {days.map((day) => {
              const dayMeetings = meetingsForDay(meetings, day);
              const inMonth = isCurrentMonth(day, cursor);
              const selected = isSameDay(day, selectedDay);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'min-h-[112px] border-b border-r border-stone-alt p-1.5 text-left transition-colors last:border-r-0',
                    !inMonth && 'bg-stone/40',
                    selected && 'bg-gold/5 ring-1 ring-inset ring-gold/30',
                    isToday(day) && !selected && 'bg-stone/30'
                  )}
                >
                  <span
                    className={cn(
                      'mb-1 inline-flex h-7 w-7 items-center justify-center text-xs font-semibold',
                      isToday(day) && 'bg-gold text-ivory',
                      !isToday(day) && inMonth && 'text-ink',
                      !inMonth && 'text-zinc-400'
                    )}
                  >
                    {formatIndianDate(day, 'd')}
                  </span>
                  <div className="space-y-0.5">
                    {dayMeetings.slice(0, 3).map((m) => eventBlock(m, true))}
                    {dayMeetings.length > 3 && (
                      <p className="px-1 text-[9px] font-semibold text-zinc-500">
                        +{dayMeetings.length - 3} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === 'week' && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[800px] grid-cols-[56px_repeat(7,1fr)] border-b border-stone-alt">
            <div />
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  'border-l border-stone-alt px-2 py-2 text-center',
                  isToday(day) && 'bg-gold/10'
                )}
              >
                <p className="text-[10px] font-semibold text-zinc-500">
                  {formatIndianDate(day, IN_WEEKDAY_SHORT)}
                </p>
                <p className={cn('text-lg font-semibold', isToday(day) ? 'text-gold' : 'text-ink')}>
                  {formatIndianDate(day, 'd')}
                </p>
              </div>
            ))}
          </div>
          <div className="grid min-w-[800px] grid-cols-[56px_repeat(7,1fr)]">
            {CALENDAR_HOURS.map((hour) => (
              <div key={hour} className="contents">
                <div className="border-b border-stone-alt pr-2 pt-1 text-right text-[10px] font-medium text-zinc-400">
                  {formatHourLabel(hour)}
                </div>
                {days.map((day) => {
                  const slotMeetings = meetingsForDay(meetings, day).filter((m) => {
                    const start = meetingStartAt(m);
                    return start && start.getHours() === hour;
                  });
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className="relative min-h-[52px] border-b border-l border-stone-alt bg-ivory p-0.5"
                    >
                      {slotMeetings.map((m) => eventBlock(m, true))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'day' && (
        <div className="overflow-x-auto">
          {meetingsForDay(meetings, cursor).length === 0 && (
            <p className="border-b border-stone-alt bg-stone/20 px-6 py-8 text-center text-sm font-medium text-zinc-500">
              {PAGE.calendar.none}
            </p>
          )}
          <div className="grid min-w-full grid-cols-[64px_minmax(0,1fr)]">
            {CALENDAR_HOURS.map((hour) => {
              const slotMeetings = meetingsForDay(meetings, cursor).filter((m) => {
                const start = meetingStartAt(m);
                return start && start.getHours() === hour;
              });
              const isNow = isToday(cursor) && new Date().getHours() === hour;
              return (
                <div key={hour} className="contents">
                  <div
                    className={cn(
                      'relative border-b border-stone-alt py-3 pr-3 text-right text-[11px] font-medium tabular-nums',
                      isNow ? 'bg-gold/10 text-gold' : 'text-zinc-400'
                    )}
                  >
                    {formatHourLabel(hour)}
                  </div>
                  <div
                    className={cn(
                      'relative border-b border-l border-stone-alt bg-ivory px-3 py-2',
                      isNow && 'bg-gold/[0.03]',
                      slotMeetings.length === 0 && 'min-h-[52px]'
                    )}
                  >
                    {slotMeetings.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {slotMeetings.map((m) => dayEventBlock(m))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected day agenda (month/week) */}
      {view !== 'day' && (
        <div className="border-t border-stone-alt bg-stone/20 px-6 py-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <RiCalendarEventLine className="text-gold" size={16} />
            {PAGE.calendar.dayList} — {formatIndianDate(selectedDay, IN_DAY_MONTH_YEAR)}
          </h3>
          {meetingsForDay(meetings, selectedDay).length === 0 ? (
            <p className="text-sm font-medium text-zinc-500">{PAGE.calendar.none}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {meetingsForDay(meetings, selectedDay).map((m) => (
                <li key={m.uuid}>
                  <Link
                    href={eventHref(m)}
                    className={cn(
                      'group flex flex-col border border-stone-alt transition-colors hover:border-gold/30 rounded-xl overflow-hidden bg-ivory',
                      m.status === 'Completed' ? 'bg-gradient-to-br from-emerald-600/5 to-transparent' : 'bg-gradient-to-br from-gold/5 to-transparent',
                      m.status === 'Canceled' && 'opacity-50'
                    )}
                  >
                    <div className="px-4 py-3.5 space-y-2">
                      {/* Title + status */}
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-[13px] font-semibold leading-snug text-ink">{m.property !== '—' ? m.property : 'Presentation'}</p>
                        <span className={statusBadgeCn(m.status, 'shrink-0 rounded-md')}>{m.status}</span>
                      </div>

                      {/* Info pills */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-zinc-500">
                        {m.clientCount && m.clientCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-zinc-600">
                            <RiGroupLine size={12} className="text-gold/70" aria-hidden />
                            {m.clientCount} participant{m.clientCount === 1 ? '' : 's'}
                          </span>
                        )}
                        {m.time && (
                          <span className="tabular-nums">{m.time}</span>
                        )}
                      </div>

                      {/* Advisor */}
                      {m.salesMember && m.salesMember !== '—' && (
                        <p className="text-[10px] font-medium text-zinc-400">
                          {m.salesMember}
                          {m.category ? ` · ${m.category}` : ''}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
