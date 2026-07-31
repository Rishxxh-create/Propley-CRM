'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RiTableLine, RiCalendarLine } from 'react-icons/ri';
import { PAGE } from '@/lib/copy';
import { cn } from '@/lib/utils';

export function PresentationsViewTabs() {
  const pathname = usePathname();
  const isCalendar = pathname === '/meetings/calendar';

  return (
    <div className="flex h-10 border border-stone-alt" role="group" aria-label="Presentation view">
      <Link
        href="/meetings"
        className={cn(
          'flex h-full min-w-[5.5rem] items-center justify-center gap-2 px-4 text-xs font-semibold transition-colors',
          !isCalendar ? 'bg-gold text-ivory' : 'bg-ivory text-zinc-500 hover:bg-stone/50 hover:text-gold'
        )}
      >
        <RiTableLine className="text-sm" />
        <span>{PAGE.presentations.viewTable}</span>
      </Link>
      <Link
        href="/meetings/calendar"
        className={cn(
          'flex h-full min-w-[5.5rem] items-center justify-center border-l border-stone-alt gap-2 px-4 text-xs font-semibold transition-colors',
          isCalendar ? 'bg-gold text-ivory' : 'bg-ivory text-zinc-500 hover:bg-stone/50 hover:text-gold'
        )}
      >
        <RiCalendarLine className="text-sm" />
        <span>{PAGE.presentations.viewCalendar}</span>
      </Link>
    </div>
  );
}

