'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { RiCalendarLine } from 'react-icons/ri';
import { Calendar } from '@/components/ui/calendar';
import { formatIndianDate, IN_LOCALE } from '@/lib/date-format';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
}

function stopDrawerCapture(event: React.SyntheticEvent) {
  event.stopPropagation();
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  className,
  disabled,
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    const updatePlacement = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // 360px is a rough estimate for the height of the calendar + padding.
      if (spaceBelow < 360 && spaceAbove > spaceBelow) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }
    };
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [open]);

  return (
    <div 
      className={cn("relative w-full", className)} 
      ref={containerRef}
      data-vaul-no-drag
      onPointerDown={stopDrawerCapture}
      onTouchStart={stopDrawerCapture}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
        className={cn(
          'flex h-12 w-full items-center justify-between border-b border-stone-alt bg-transparent text-left text-sm font-semibold outline-none transition-colors hover:border-gold focus-visible:border-gold disabled:cursor-not-allowed disabled:opacity-50',
          !value ? 'text-zinc-400' : 'text-ink'
        )}
      >
        <span>{value ? formatIndianDate(value) : placeholder}</span>
        <RiCalendarLine className="shrink-0 text-gold" size={16} />
      </button>
      
      {open && (
        <div 
          data-slot="popover-content"
          className={cn(
            "absolute left-0 z-[1100] rounded-lg border border-stone-alt bg-popover p-0 shadow-2xl animate-in fade-in-0 zoom-in-95",
            placement === 'top' ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top"
          )}
        >
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => {
              onChange(d);
              close();
            }}
            locale={IN_LOCALE}
            disabled={minDate ? { before: new Date(new Date(minDate).setHours(0, 0, 0, 0)) } : disabled}
            initialFocus
            className="rounded-lg font-sans"
          />
        </div>
      )}
    </div>
  );
}
