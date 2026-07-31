'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { RiArrowDownSLine, RiCheckLine } from 'react-icons/ri';
import { parseTimeValue, to24HourTime, type TimePeriod } from '@/lib/presentation-templates';
import { cn } from '@/lib/utils';

interface TimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  minuteStep?: 5 | 15 | 30;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

const triggerClass =
  'flex h-12 w-full items-center justify-between gap-2 border-b border-stone-alt bg-transparent px-0 text-sm font-semibold text-ink transition-colors hover:border-gold focus-visible:border-gold outline-none';

const subLabelClass = 'text-xs font-medium text-zinc-400';

function stopDrawerCapture(event: React.SyntheticEvent) {
  event.stopPropagation();
}

type OpenField = 'hour' | 'minute' | 'period' | null;

function InlineTimeDropdown({
  label,
  displayValue,
  options,
  isOpen,
  onOpen,
  onClose,
  onPick,
  listId,
}: {
  label: string;
  displayValue: string;
  options: { value: string; label: string }[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onPick: (value: string) => void;
  listId: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen, onClose]);

  return (
    <div
      ref={rootRef}
      className="relative min-w-0 space-y-2"
      data-vaul-no-drag
      onPointerDown={stopDrawerCapture}
      onTouchStart={stopDrawerCapture}
    >
      <span className={subLabelClass}>{label}</span>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => (isOpen ? onClose() : onOpen())}
        className={triggerClass}
      >
        <span>{displayValue}</span>
        <RiArrowDownSLine className="shrink-0 text-gold" size={16} aria-hidden />
      </button>
      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 z-[1100] max-h-48 overflow-y-auto overscroll-contain border border-stone-alt bg-ivory shadow-2xl custom-scrollbar"
        >
          {options.map((option) => {
            const selected = option.value === displayValue;
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-vaul-no-drag
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onPick(option.value)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:bg-stone',
                    selected && 'bg-stone text-gold'
                  )}
                >
                  <span>{option.label}</span>
                  <RiCheckLine
                    className={cn('h-4 w-4 shrink-0 text-gold', !selected && 'opacity-0')}
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function TimeSelect({
  value,
  onChange,
  className,
  minuteStep = 15,
}: TimeSelectProps) {
  const hourListId = useId();
  const minuteListId = useId();
  const periodListId = useId();
  const [openField, setOpenField] = useState<OpenField>(null);

  const parts = useMemo(() => parseTimeValue(value), [value]);

  const minutes = useMemo(() => {
    const list: number[] = [];
    for (let m = 0; m < 60; m += minuteStep) {
      list.push(m);
    }
    if (!list.includes(parts.minute)) {
      list.push(parts.minute);
      list.sort((a, b) => a - b);
    }
    return list;
  }, [minuteStep, parts.minute]);

  const minuteValue = String(parts.minute).padStart(2, '0');

  const update = useCallback(
    (patch: Partial<typeof parts>) => {
      const next = { ...parts, ...patch };
      onChange(to24HourTime(next.hour12, next.minute, next.period));
    },
    [onChange, parts]
  );

  const close = useCallback(() => setOpenField(null), []);

  const hourOptions = useMemo(
    () => HOURS.map((hour) => ({ value: String(hour), label: String(hour) })),
    []
  );

  const minuteOptions = useMemo(
    () =>
      minutes.map((minute) => {
        const padded = String(minute).padStart(2, '0');
        return { value: padded, label: padded };
      }),
    [minutes]
  );

  const periodOptions = useMemo(
    () =>
      (['AM', 'PM'] as TimePeriod[]).map((period) => ({
        value: period,
        label: period,
      })),
    []
  );

  return (
    <div
      className={cn('grid grid-cols-[1fr_1fr_5.5rem] gap-4 sm:gap-6', className)}
      data-vaul-no-drag
      onPointerDown={stopDrawerCapture}
      onTouchStart={stopDrawerCapture}
    >
      <InlineTimeDropdown
        label="Hour"
        displayValue={String(parts.hour12)}
        options={hourOptions}
        isOpen={openField === 'hour'}
        onOpen={() => setOpenField('hour')}
        onClose={close}
        onPick={(next) => {
          update({ hour12: Number(next) });
          close();
        }}
        listId={hourListId}
      />
      <InlineTimeDropdown
        label="Minute"
        displayValue={minuteValue}
        options={minuteOptions}
        isOpen={openField === 'minute'}
        onOpen={() => setOpenField('minute')}
        onClose={close}
        onPick={(next) => {
          update({ minute: Number(next) });
          close();
        }}
        listId={minuteListId}
      />
      <InlineTimeDropdown
        label="Period"
        displayValue={parts.period}
        options={periodOptions}
        isOpen={openField === 'period'}
        onOpen={() => setOpenField('period')}
        onClose={close}
        onPick={(next) => {
          update({ period: next as TimePeriod });
          close();
        }}
        listId={periodListId}
      />
    </div>
  );
}
