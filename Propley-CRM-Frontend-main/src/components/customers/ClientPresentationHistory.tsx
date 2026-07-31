'use client';

import Link from 'next/link';
import type { StoredMeeting } from '@/lib/mock-data';
import { PAGE } from '@/lib/copy';
import { statusBadgeCn } from '@/lib/presentation-status';
import { RiArrowRightLine } from 'react-icons/ri';
import { formatMeetingDateLabel } from '@/lib/date-format';

interface ClientPresentationHistoryProps {
  meetings: StoredMeeting[];
}

export function ClientPresentationHistory({ meetings }: ClientPresentationHistoryProps) {
  return (
    <section className="border border-stone-alt bg-ivory">
      <div className="border-b border-stone-alt px-6 py-4">
        <h2 className="text-sm font-semibold text-ink">{PAGE.customers.profile.history}</h2>
      </div>
      {meetings.length === 0 ? (
        <p className="px-6 py-8 text-sm font-medium text-zinc-500">
          {PAGE.customers.profile.noHistory}
        </p>
      ) : (
        <ul className="divide-y divide-stone-alt">
          {meetings.map((m) => (
            <li key={m.uuid} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-stone/20">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{m.property}</p>
                <p className="text-xs font-medium text-zinc-500">
                  {formatMeetingDateLabel(m.date)} · {m.time} · {m.salesMember}
                </p>
              </div>
              <span className={statusBadgeCn(m.status)}>{m.status}</span>
              {m.status === 'Completed' && (
                <Link
                  href={`/meetings/${m.uuid}/post-analysis`}
                  className="flex shrink-0 items-center gap-1 text-xs font-semibold text-gold hover:text-gold-hover"
                >
                  Summary
                  <RiArrowRightLine size={14} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
