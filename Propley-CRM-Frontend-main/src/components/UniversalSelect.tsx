'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseLine,
  RiSearchLine,
} from 'react-icons/ri';
import { BrandLogo } from '@/components/BrandLogo';
import type { BrandLogoKey } from '@/lib/brand-logos';
import { cn } from '@/lib/utils';

export interface SelectOption {
  id: string;
  name: string;
  subtitle?: string;
  brand?: BrandLogoKey;
}

interface UniversalSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  enableSearch?: boolean;
  className?: string;
}

function stopDrawerCapture(event: React.SyntheticEvent) {
  event.stopPropagation();
}

export function UniversalSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found.',
  enableSearch = true,
  className,
}: UniversalSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(q) ||
        (option.subtitle && option.subtitle.toLowerCase().includes(q)) ||
        option.id.toLowerCase().includes(q)
    );
  }, [options, query]);

  const selected = options.find((option) => option.id === value);
  const hasValue = Boolean(value);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const clearSelection = useCallback(
    (event?: React.SyntheticEvent) => {
      event?.preventDefault();
      event?.stopPropagation();
      onChange('');
      setQuery('');
      setOpen(false);
    },
    [onChange]
  );

  const handleCloseIcon = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (hasValue) {
        clearSelection(event);
      } else {
        close();
      }
    },
    [hasValue, clearSelection, close]
  );

  const openPanel = () => {
    setQuery(enableSearch ? (selected?.name ?? '') : '');
    setOpen(true);
  };

  useEffect(() => {
    if (!open || !enableSearch) return;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, enableSearch]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  useEffect(() => {
    if (!open || !rootRef.current) return;
    const updatePlacement = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // 224px is max-h-56 (the dropdown's max height). Add some buffer.
      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
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
  }, [open, filtered.length]);

  const pick = (optionId: string) => {
    onChange(optionId);
    close();
  };

  const triggerClass = cn(
    'flex h-12 w-full items-center border border-stone-alt px-4 text-left text-sm font-semibold outline-none transition-colors hover:border-gold rounded-lg bg-transparent',
    !hasValue ? 'text-zinc-400' : 'text-ink'
  );

  return (
    <div
      ref={rootRef}
      className={cn('relative w-full space-y-0', className)}
      data-vaul-no-drag
      onPointerDown={stopDrawerCapture}
      onTouchStart={stopDrawerCapture}
    >
      {!open ? (
        <div className={triggerClass}>
          <button
            type="button"
            onClick={openPanel}
            aria-expanded={false}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            className="flex min-w-0 flex-1 items-center gap-2 truncate text-left"
          >
            {selected?.brand && (
              <BrandLogo brand={selected.brand} size={18} alt="" />
            )}
            <span className="truncate">{hasValue ? (selected?.name ?? value) : placeholder}</span>
          </button>
          {hasValue && (
            <button
              type="button"
              aria-label="Clear selection"
              onPointerDown={(event) => event.preventDefault()}
              onClick={clearSelection}
              className="shrink-0 p-1 text-zinc-400 transition-colors hover:text-ink"
            >
              <RiCloseLine size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={openPanel}
            aria-label="Open options"
            className="shrink-0 p-1 text-zinc-400 transition-colors hover:text-ink"
          >
            <RiArrowDownSLine size={18} />
          </button>
        </div>
      ) : (
        <>
          <div className="relative border border-stone-alt rounded-lg overflow-hidden bg-ivory focus-within:border-gold">
            {enableSearch ? (
              <>
                <RiSearchLine
                  className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-400"
                  size={16}
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  type="text"
                  data-vaul-no-drag
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      if (hasValue) clearSelection();
                      else close();
                      return;
                    }
                    if (event.key === 'Enter' && filtered[0]) {
                      event.preventDefault();
                      pick(filtered[0].id);
                    }
                  }}
                  placeholder={searchPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  aria-controls={listboxId}
                  aria-expanded
                  aria-autocomplete="list"
                  role="combobox"
                  className="flex h-12 w-full bg-transparent pl-10 pr-10 text-sm font-semibold text-ink outline-none placeholder:font-normal placeholder:text-zinc-400"
                />
              </>
            ) : (
              <div className="flex h-12 w-full items-center gap-2 bg-transparent pl-4 pr-10 text-sm font-semibold text-ink select-none">
                {selected?.brand && <BrandLogo brand={selected.brand} size={18} alt="" />}
                <span className="truncate">{hasValue ? (selected?.name ?? value) : placeholder}</span>
              </div>
            )}
            <button
              type="button"
              aria-label={hasValue ? 'Clear selection' : 'Close dropdown'}
              onPointerDown={(event) => event.preventDefault()}
              onClick={handleCloseIcon}
              className="absolute right-0 top-1/2 z-20 -translate-y-1/2 p-1 text-zinc-400 transition-colors hover:text-ink"
            >
              <RiCloseLine size={18} />
            </button>
          </div>

          <ul
            id={listboxId}
            role="listbox"
            aria-label="Options"
            className={cn(
              "absolute left-0 right-0 z-[1100] max-h-56 overflow-y-auto overscroll-contain border border-stone-alt bg-ivory shadow-2xl custom-scrollbar",
              placement === 'top' ? "bottom-[100%] border-b" : "top-[100%] border-t-0"
            )}
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm font-medium text-zinc-500">
                {emptyMessage}
              </li>
            ) : (
              filtered.map((option) => {
                const isSelected =
                  option.id === '' ? !hasValue : value === option.id;
                return (
                  <li key={option.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-vaul-no-drag
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pick(option.id)}
                      className={cn(
                        'flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-stone',
                        isSelected && 'bg-stone'
                      )}
                    >
                      <span className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-ink">
                        <span className="flex min-w-0 items-center gap-2">
                          {option.brand && (
                            <BrandLogo brand={option.brand} size={18} alt="" />
                          )}
                          <span className="truncate">{option.name}</span>
                        </span>
                        <RiCheckLine
                          className={cn(
                            'h-4 w-4 shrink-0 text-gold',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      </span>
                      {option.subtitle && (
                        <span className="text-xs font-medium text-zinc-500">
                          {option.subtitle}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </>
      )}
    </div>
  );
}
