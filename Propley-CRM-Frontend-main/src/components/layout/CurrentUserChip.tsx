'use client';

import { APP } from '@/lib/copy';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export function CurrentUserChip({ showRole = true }: { showRole?: boolean }) {
  const user = useAppSelector(selectAuthUser);
  const name = user?.name?.trim() || 'Consultant';
  const initial = name.charAt(0).toUpperCase() || 'C';

  return (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-stone-alt bg-stone text-sm font-semibold text-gold">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-ink">{name}</p>
        {showRole && (
          <p className="text-[10px] font-medium text-gold">{APP.consultantRole}</p>
        )}
      </div>
    </>
  );
}

export function CurrentUserAvatar() {
  const user = useAppSelector(selectAuthUser);
  const name = user?.name?.trim() || 'Consultant';
  const initial = name.charAt(0).toUpperCase() || 'C';

  return (
    <div className="flex h-9 w-9 items-center justify-center border border-stone-alt bg-stone text-sm font-semibold text-gold">
      {initial}
    </div>
  );
}
