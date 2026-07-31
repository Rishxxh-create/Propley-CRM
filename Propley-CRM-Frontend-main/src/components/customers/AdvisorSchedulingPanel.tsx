'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UniversalSelect } from '@/components/UniversalSelect';
import { ProfileInfoCallout } from '@/components/customers/ProfileInfoCallout';
import { TEAM_MEMBERS, type StoredMeeting } from '@/lib/mock-data';
import { updateCustomer } from '@/lib/customers-store';
import { getCurrentAdvisorName } from '@/lib/current-advisor';
import { toast } from '@/lib/toast';
import { PAGE } from '@/lib/copy';
import { statusBadgeCn } from '@/lib/presentation-status';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RiCalendarLine, RiExternalLinkLine, RiUserStarLine } from 'react-icons/ri';
import { formatMeetingDateLabel } from '@/lib/date-format';

interface AdvisorSchedulingPanelProps {
  customerId: string;
  assignedAdvisorId: string;
  meeting?: StoredMeeting;
  clientId: string;
  onUpdated?: () => void;
}

function StepMarker({ n }: { n: number }) {
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center border border-stone-alt bg-stone text-[10px] font-semibold tabular-nums text-ink"
      aria-hidden
    >
      {n}
    </span>
  );
}

export function AdvisorSchedulingPanel({
  customerId,
  assignedAdvisorId,
  meeting,
  clientId,
  onUpdated,
}: AdvisorSchedulingPanelProps) {
  const [advisorId, setAdvisorId] = useState(assignedAdvisorId);
  const hasAdvisorChanges = advisorId !== assignedAdvisorId;

  const advisorOptions = TEAM_MEMBERS.filter((m) =>
    ['advisor', 'consultant', 'admin', 'super_admin'].includes(m.role)
  ).map((m) => ({ id: m.id, name: m.name, subtitle: m.department }));

  const handleSaveAdvisor = async () => {
    try {
      await updateCustomer(customerId, { assignedAdvisorId: advisorId });
      const advisorName = TEAM_MEMBERS.find((m) => m.id === advisorId)?.name ?? 'Advisor';
      toast.advisorAssigned(advisorName);
      onUpdated?.();
    } catch {
      toast.error('Could not assign advisor');
    }
  };

  const portalHref =
    meeting && meeting.status !== 'Canceled' ? `/moderator/${meeting.uuid}` : '/meetings';

  return (
    <section className="max-w-4xl border border-stone-alt bg-ivory">
      <ol className="m-0 list-none divide-y divide-stone-alt p-0">
        {/* 1 — Assigned advisor */}
        <li className="p-6 sm:p-8">
          <div className="flex gap-4 sm:gap-5">
            <StepMarker n={1} />
            <div className="min-w-0 flex-1 space-y-5">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <RiUserStarLine className="text-gold" size={18} aria-hidden />
                  {PAGE.customers.profile.assignedAdvisor}
                </h3>
              </div>

              <ProfileInfoCallout title={PAGE.customers.profile.advisorInfo.title}>
                <p className="font-medium text-zinc-700">{PAGE.customers.profile.advisorInfo.what}</p>
                <p>
                  <span className="font-semibold text-ink">When you save: </span>
                  {PAGE.customers.profile.advisorInfo.onSave}
                </p>
              </ProfileInfoCallout>

              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                  Select consultant
                </p>
                <UniversalSelect
                  value={advisorId}
                  onChange={setAdvisorId}
                  options={advisorOptions}
                  placeholder="Select advisor"
                  enableSearch
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-stone-alt pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-zinc-600">
                  Last updated by{' '}
                  <span className="font-semibold text-ink">{getCurrentAdvisorName()}</span>
                </p>
                <Button
                  type="button"
                  variant="propley"
                  disabled={!hasAdvisorChanges}
                  onClick={handleSaveAdvisor}
                  className={cn('w-full sm:w-auto sm:min-w-[160px] !py-3 h-11')}
                >
                  {PAGE.customers.profile.saveAdvisor}
                </Button>
              </div>
            </div>
          </div>
        </li>

        {/* 2 — Next presentation */}
        <li className="p-6 sm:p-8">
          <div className="flex gap-4 sm:gap-5">
            <StepMarker n={2} />
            <div className="min-w-0 flex-1 space-y-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <RiCalendarLine className="text-gold" size={18} aria-hidden />
                {PAGE.customers.profile.nextPresentation}
              </h3>

              <ProfileInfoCallout title={PAGE.customers.profile.nextPresentationInfo.title}>
                <p className="font-medium text-zinc-700">
                  {PAGE.customers.profile.nextPresentationInfo.what}
                </p>
                <p>{PAGE.customers.profile.nextPresentationInfo.action}</p>
              </ProfileInfoCallout>

              {!meeting ? (
                <div className="space-y-4 border border-dashed border-stone-alt bg-stone/30 px-4 py-5">
                  <p className="text-sm font-medium text-zinc-600">{PAGE.customers.profile.noNext}</p>
                  <Link
                    href={`/meetings/new?client=${clientId}`}
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'inline-flex border-ink text-ink hover:bg-ink hover:text-ivory'
                    )}
                  >
                    {PAGE.customers.profile.scheduleCta}
                  </Link>
                </div>
              ) : (
                <>
                  <div
                    className={cn(
                      'space-y-3 border border-stone-alt bg-stone/30 px-4 py-4',
                      meeting.status === 'Live' && 'border-l-4 border-l-gold'
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-lg font-semibold leading-snug text-ink">{meeting.property}</p>
                      <span className={statusBadgeCn(meeting.status, 'shrink-0')}>
                        {meeting.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-zinc-700">
                      {formatMeetingDateLabel(meeting.date)} · {meeting.time}
                    </p>
                    {meeting.salesMember && (
                      <p className="text-xs font-medium text-zinc-600">
                        Host: <span className="text-ink">{meeting.salesMember}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    {meeting.status !== 'Canceled' && (
                      <Link
                        href={portalHref}
                        className={cn(
                          buttonVariants({ variant: 'propley' }),
                          'inline-flex flex-1 items-center justify-center gap-2 !py-3 h-11'
                        )}
                      >
                        {PAGE.presentations.salesPortal}
                        <RiExternalLinkLine size={14} aria-hidden />
                      </Link>
                    )}
                    <Link
                      href={`/meetings/new?client=${clientId}`}
                      className={cn(
                        buttonVariants({ variant: 'outline' }),
                        'inline-flex flex-1 items-center justify-center border-stone-alt text-ink hover:border-gold hover:bg-stone'
                      )}
                    >
                      {PAGE.customers.profile.scheduleCta}
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </li>
      </ol>
    </section>
  );
}
