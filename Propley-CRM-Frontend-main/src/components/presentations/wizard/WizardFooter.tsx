'use client';

import { RiArrowLeftLine, RiArrowRightLine } from 'react-icons/ri';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WizardFooterProps {
  stepLabel: string;
  backLabel?: string;
  nextLabel: string;
  onBack?: () => void;
  onNext?: () => void;
  submit?: boolean;
  className?: string;
}

export function WizardFooter({
  stepLabel,
  backLabel,
  nextLabel,
  onBack,
  onNext,
  submit,
  className,
}: WizardFooterProps) {
  return (
    <div
      className={cn(
        'space-y-4 border-t border-stone-alt bg-stone/20 px-6 py-6 md:px-10',
        className
      )}
    >
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-start">
        {onBack && backLabel && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="h-12 w-full rounded-lg border-stone-alt px-8 text-sm font-semibold hover:bg-stone sm:w-fit"
          >
            <RiArrowLeftLine size={16} />
            {backLabel}
          </Button>
        )}
        <Button
          type={submit ? 'submit' : 'button'}
          variant="propley"
          onClick={onNext}
          className="h-12 w-full rounded-lg px-8 text-sm font-semibold sm:w-fit"
        >
          {nextLabel}
          {!submit && <RiArrowRightLine size={16} />}
        </Button>
      </div>
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-400 sm:text-start">
        {stepLabel}
      </p>
    </div>
  );
}
