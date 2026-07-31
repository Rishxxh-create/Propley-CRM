'use client';

import { parseISO, isValid } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { formatIndianDate, IN_DATETIME } from '@/lib/date-format';
import {
  useLoadMeetingActivity,
  useMeetingActivity,
} from '@/store/hooks/useMeetings';
import { cn } from '@/lib/utils';
import { RiPulseLine } from 'react-icons/ri';

type MeetingActivityLogProps = {
  meetingUuid: string;
  className?: string;
};

function formatActivityTime(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? formatIndianDate(d, IN_DATETIME) : iso;
}

export function MeetingActivityLog({ meetingUuid, className }: MeetingActivityLogProps) {
  const { events, loading } = useMeetingActivity(meetingUuid);

  return (
    <Card className={cn('rounded-lg border-stone-alt bg-white pt-0! shadow-none!', className)}>
      <CardContent className="space-y-4 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 border-b border-stone-alt pb-4">
          <RiPulseLine className="text-gold" size={18} />
          <h2 className="text-sm font-semibold text-ink">Meeting activity log</h2>
        </div>

        {loading && (
          <p className="text-xs font-medium text-zinc-500">Loading session events…</p>
        )}

        {!loading && events.length === 0 && (
          <p className="text-xs font-medium text-zinc-500">No activity recorded for this session.</p>
        )}

        {!loading && events.length > 0 && (
          <ul className="max-h-[420px] space-y-0 overflow-y-auto border border-stone-alt divide-y divide-stone-alt">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-ink">{event.name}</p>
                  {event.user_name && (
                    <p className="text-[10px] font-medium text-zinc-500">
                      {event.user_name}
                      {event.user_mobile ? ` · ${event.user_mobile}` : ''}
                    </p>
                  )}
                </div>
                <time
                  dateTime={event.time}
                  className="shrink-0 text-[10px] font-medium text-zinc-400"
                >
                  {formatActivityTime(event.time)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
