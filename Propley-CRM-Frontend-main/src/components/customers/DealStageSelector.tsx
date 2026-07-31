'use client';

import type { Customer, DealStage } from '@/lib/mock-data';
import { DEAL_STAGES, updateCustomer } from '@/lib/customers-store';
import { toast } from '@/lib/toast';
import { PAGE } from '@/lib/copy';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { RiCheckLine, RiLoader4Line } from 'react-icons/ri';

const activeClasses: Record<DealStage, string> = {
  inquiry: 'border-zinc-400 shadow-[inset_3px_0_0_0] shadow-zinc-400 bg-zinc-50/50',
  vsv_scheduled: 'border-blue-500 shadow-[inset_3px_0_0_0] shadow-blue-500 bg-blue-50/50',
  vsv_done: 'border-emerald-500 shadow-[inset_3px_0_0_0] shadow-emerald-500 bg-emerald-50/50',
  offer: 'border-amber-500 shadow-[inset_3px_0_0_0] shadow-amber-500 bg-amber-50/50',
  negotiation: 'border-orange-500 shadow-[inset_3px_0_0_0] shadow-orange-500 bg-orange-50/50',
  closed_won: 'border-emerald-600 shadow-[inset_3px_0_0_0] shadow-emerald-600 bg-emerald-50/50',
  closed_lost: 'border-red-500 shadow-[inset_3px_0_0_0] shadow-red-500 bg-red-50/50',
};

const activeIconClasses: Record<DealStage, string> = {
  inquiry: 'bg-zinc-400 text-white',
  vsv_scheduled: 'bg-blue-500 text-white',
  vsv_done: 'bg-emerald-500 text-white',
  offer: 'bg-amber-500 text-white',
  negotiation: 'bg-orange-500 text-white',
  closed_won: 'bg-emerald-600 text-white',
  closed_lost: 'bg-red-500 text-white',
};

const activeTextClasses: Record<DealStage, string> = {
  inquiry: 'text-zinc-600',
  vsv_scheduled: 'text-blue-600',
  vsv_done: 'text-emerald-600',
  offer: 'text-amber-600',
  negotiation: 'text-orange-600',
  closed_won: 'text-emerald-700',
  closed_lost: 'text-red-600',
};

const progressBgClasses: Record<DealStage, string> = {
  inquiry: 'bg-zinc-400',
  vsv_scheduled: 'bg-blue-500',
  vsv_done: 'bg-emerald-500',
  offer: 'bg-amber-500',
  negotiation: 'bg-orange-500',
  closed_won: 'bg-emerald-600',
  closed_lost: 'bg-red-500',
};

interface DealStageSelectorProps {
  customer: Customer;
  onUpdated?: () => void;
}

export function DealStageSelector({ customer, onUpdated }: DealStageSelectorProps) {
  const current = customer.dealStage ?? 'inquiry';
  const currentIndex = DEAL_STAGES.indexOf(current);
  const progressPct = ((currentIndex + 1) / DEAL_STAGES.length) * 100;

  const [updatingStage, setUpdatingStage] = useState<DealStage | null>(null);

  const setStage = async (stage: DealStage) => {
    setUpdatingStage(stage);
    try {
      await updateCustomer(customer.id, { dealStage: stage });
      toast.dealStageUpdated(PAGE.customers.dealStages[stage]);
      onUpdated?.();
    } catch {
      toast.error('Could not update deal stage');
    } finally {
      setUpdatingStage(null);
    }
  };

  return (
    <section className="border border-stone-alt rounded-xl bg-ivory p-4 sm:p-6 shadow-none!">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-sm font-semibold text-ink">{PAGE.customers.profile.pipeline}</h2>
        <p className="text-xs font-medium text-zinc-600">
          {PAGE.customers.profile.currentStage}:{' '}
          <span className="font-semibold text-ink">{PAGE.customers.dealStages[current]}</span>
        </p>
      </div>

      <div
        className="mb-5 h-[3px] bg-stone-alt"
        role="progressbar"
        aria-valuenow={currentIndex + 1}
        aria-valuemin={1}
        aria-valuemax={DEAL_STAGES.length}
        aria-label={PAGE.customers.profile.pipeline}
      >
        <div
          className={cn("h-full transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]", progressBgClasses[current])}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <ol className="grid min-w-[min(100%,36rem)] grid-cols-2 gap-2 @md/profile:min-w-0 @md/profile:grid-cols-4">
          {DEAL_STAGES.map((stage, i) => {
            const isActive = stage === current;
            const isPast = i < currentIndex;

            const isUpdating = updatingStage === stage;

            return (
              <li key={stage} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setStage(stage)}
                  disabled={!!updatingStage}
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'group relative flex w-full cursor-pointer items-center gap-3 border rounded-lg px-4 py-3.5 text-left transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
                    isActive && activeClasses[stage],
                    isPast && 'border-stone-alt bg-white hover:border-stone-alt/60',
                    !isActive && !isPast && 'border-stone-alt bg-white hover:border-stone-alt/60 hover:bg-stone/60',
                    updatingStage && !isUpdating && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 rounded-md items-center justify-center text-[11px] font-semibold tabular-nums transition-colors',
                      isActive && activeIconClasses[stage],
                      isPast && 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-none!',
                      !isPast && !isActive && 'border border-stone-alt bg-white text-zinc-500 group-hover:border-stone-alt/60 group-hover:text-ink'
                    )}
                    aria-hidden
                  >
                    {isUpdating ? (
                      <RiLoader4Line size={14} className="animate-spin" />
                    ) : isPast ? (
                      <RiCheckLine size={14} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block text-xs font-semibold leading-tight',
                        isActive ? 'text-ink' : isPast ? 'text-ink' : 'text-zinc-600 group-hover:text-ink'
                      )}
                    >
                      {PAGE.customers.dealStages[stage]}
                    </span>
                    {isActive && (
                      <span className={cn("mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.12em]", activeTextClasses[stage])}>
                        Current stage
                      </span>
                    )}
                    {isPast && (
                      <span className="mt-0.5 block text-[9px] font-medium text-zinc-400">
                        Completed
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
