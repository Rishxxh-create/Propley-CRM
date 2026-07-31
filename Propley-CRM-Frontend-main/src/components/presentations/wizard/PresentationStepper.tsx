'use client';

import { RiCalendarLine, RiCheckLine, RiMailLine, RiWhatsappLine } from 'react-icons/ri';
import { PAGE } from '@/lib/copy';
import { cn } from '@/lib/utils';

export type PresentationStep = 'schedule' | 'email' | 'whatsapp';

const STEP_ICONS = {
  schedule: RiCalendarLine,
  email: RiMailLine,
  whatsapp: RiWhatsappLine,
} as const;

const STEPS: {
  id: PresentationStep;
  label: string;
  description: string;
}[] = [
  {
    id: 'schedule',
    label: PAGE.schedule.steps.setup.label,
    description: PAGE.schedule.steps.setup.description,
  },
];

interface PresentationStepperProps {
  current: PresentationStep;
  completed: PresentationStep[];
  onStepSelect: (step: PresentationStep) => void;
}

export function PresentationStepper({
  current,
  completed,
  onStepSelect,
}: PresentationStepperProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <ol className="grid gap-4 border border-stone-alt bg-ivory p-4 md:grid-cols-1 md:gap-0 md:divide-x md:divide-stone-alt md:p-0">
      {STEPS.map((step, index) => {
        const Icon = STEP_ICONS[step.id];
        const isComplete = completed.includes(step.id);
        const isCurrent = step.id === current;
        const isReachable = index <= currentIndex || isComplete;
        const isWhatsapp = step.id === 'whatsapp';

        return (
          <li key={step.id} className="md:px-6 md:py-5">
            <button
              type="button"
              disabled={!isReachable}
              onClick={() => isReachable && onStepSelect(step.id)}
              className={cn(
                'flex w-full items-start gap-4 text-left transition-colors rounded-lg',
                isReachable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center border text-sm font-semibold transition-colors',
                  isCurrent && 'border-gold bg-gold/10 text-gold',
                  isComplete && !isCurrent && 'border-gold bg-gold text-ivory',
                  !isCurrent && !isComplete && 'border-stone-alt bg-stone text-zinc-500'
                )}
              >
                {isComplete && !isCurrent ? (
                  <RiCheckLine size={18} />
                ) : (
                  <Icon size={18} className={isWhatsapp && !isCurrent && !isComplete ? 'text-[#075E54]' : undefined} />
                )}
              </span>
              <span className="min-w-0 space-y-1">
                <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400">
                  Step {index + 1}
                </span>
                <span
                  className={cn(
                    'block text-sm font-semibold tracking-tight',
                    isCurrent ? 'text-ink' : 'text-zinc-600'
                  )}
                >
                  {step.label}
                </span>
                <span className="block text-xs font-medium leading-relaxed text-zinc-500">
                  {step.description}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
