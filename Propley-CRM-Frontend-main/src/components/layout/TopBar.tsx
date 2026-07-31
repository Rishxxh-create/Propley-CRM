'use client';

import { usePathname } from 'next/navigation';
import { RiMenu2Line } from 'react-icons/ri';
import { APP, NAV, getPageTitle } from '@/lib/copy';
import { CurrentUserChip } from '@/components/layout/CurrentUserChip';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export default function TopBar({ onToggleSidebar }: TopBarProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const isAdmin = pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-30 flex h-[64px] shrink-0 items-center justify-between border-b border-stone-alt bg-ivory/95 px-5 backdrop-blur-sm md:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          className="p-2 text-ink transition-colors hover:bg-stone lg:hidden"
          onClick={onToggleSidebar}
          aria-label="Open navigation"
        >
          <RiMenu2Line size={22} />
        </button>
        <div className="min-w-0">
          {isAdmin && (
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gold">
              {NAV.sections.admin}
            </p>
          )}
          <h2 className="truncate text-sm font-semibold text-ink md:text-base">{title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 border border-stone-alt bg-stone/50 px-3 py-1.5 sm:flex">
          <span className="h-1.5 w-1.5 bg-gold" />
          <span className="text-[10px] font-semibold text-zinc-600">{APP.statusOnline}</span>
        </div>
        <div className="flex items-center gap-3 border-l border-stone-alt pl-4">
          <CurrentUserChip />
        </div>
      </div>
    </header>
  );
}
