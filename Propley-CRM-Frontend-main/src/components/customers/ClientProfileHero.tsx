'use client';

import type { Customer } from '@/lib/mock-data';
import { PAGE } from '@/lib/copy';
import { RiMailLine, RiMapPinLine, RiPhoneLine, RiShareLine, RiPencilLine } from 'react-icons/ri';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { dealStageBadgeClass } from '@/components/customers/deal-stage-utils';
import { getLeadSourceBrand, getLeadSourceLabel } from '@/lib/lead-source-options';

interface ClientProfileHeroProps {
  customer: Customer;
  onEdit?: () => void;
}

export function ClientProfileHero({ customer, onEdit }: ClientProfileHeroProps) {
  const stage = customer.dealStage ?? 'inquiry';
  const leadSourceLabel = getLeadSourceLabel(customer.leadSource);
  const leadSourceBrand = getLeadSourceBrand(customer.leadSource);

  return (
    <header className="border border-stone-alt rounded-xl bg-ivory p-4 sm:p-6 @lg/profile:p-8 shadow-none!">
      <div className="flex flex-col gap-5 @lg/profile:flex-col @lg/profile:items-start @lg/profile:justify-between @lg/profile:gap-6">
        <div className='flex flex-row items-start justify-between w-full flex-wrap'>
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <div className="flex h-14 w-14 shrink-0 rounded-xl items-center justify-center border-none bg-gradient-to-br from-warm-dark to-warm-darker text-lg font-semibold text-white shadow-none! sm:h-16 sm:w-16 sm:text-xl">
              {customer.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-ink break-words sm:text-3xl @lg/profile:text-4xl">
                {customer.name}
              </h2>
              <div className='flex flex-row items-center gap-2 flex-wrap'>
                <span
                  className={`inline-flex border px-2 py-1 text-[10px] font-semibold ${dealStageBadgeClass(stage)}`}
                >
                  {PAGE.customers.dealStages[stage]}
                </span>
              </div>
            </div>
          </div>
          {onEdit && (
            <div className='w-full max-w-max'>
              <Button
                type="button"
                variant="outline"
                onClick={onEdit}
                className="w-full gap-2 @lg/profile:w-auto"
              >
                <RiPencilLine size={16} className="text-gold" />
                {PAGE.customers.profile.editCta}
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 mt-2 border-t border-stone-alt w-full text-xs font-medium text-zinc-600">
          <div className="flex items-center gap-1.5" title="Email">
            <RiMailLine className="text-zinc-400" size={14} aria-hidden />
            <span className="truncate max-w-[200px]">{customer.email}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Phone">
            <RiPhoneLine className="text-zinc-400" size={14} aria-hidden />
            <span>{customer.phone}</span>
          </div>
          {customer.city && customer.city !== '—' && (
            <div className="flex items-center gap-1.5" title="Location">
              <RiMapPinLine className="text-zinc-400" size={14} aria-hidden />
              <span>{customer.city}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5" title="Lead Source">
            <RiShareLine className="text-zinc-400" size={14} aria-hidden />
            {leadSourceLabel ? (
              <span className="flex items-center gap-1.5">
                {leadSourceBrand && <BrandLogo brand={leadSourceBrand} size={12} />}
                {leadSourceLabel}
              </span>
            ) : (
              <span className="text-zinc-400">{PAGE.customers.profile.leadSourceEmpty}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
