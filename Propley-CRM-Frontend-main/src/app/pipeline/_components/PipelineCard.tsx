import { Draggable } from '@hello-pangea/dnd';
import Link from 'next/link';
import { RiPhoneLine, RiTimeLine, RiCalendarCheckLine, RiAddLine, RiInformationLine, RiWhatsappLine, RiArrowRightUpLine, RiMapPinLine, RiPhoneFill, RiEdit2Line } from 'react-icons/ri';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { BrandLogo } from '@/components/BrandLogo';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { brandLogoForLeadSource } from '@/lib/brand-logos';
import { getLeadSourceLabel } from '@/lib/lead-source-options';
import type { Customer } from '@/lib/mock-data';

interface PipelineCardProps {
  customer: Customer;
  index: number;
  onOpenNotes: (id: string) => void;
  onOpenInfo: (id: string) => void;
  onOpenEdit: (id: string) => void;
}

export function PipelineCard({ customer, index, onOpenNotes, onOpenInfo, onOpenEdit }: PipelineCardProps) {
  return (
    <Draggable key={customer.id} draggableId={customer.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
          className={`group relative flex flex-col bg-white border rounded-xl overflow-hidden transition-colors duration-200 shadow-none! ${snapshot.isDragging ? 'border-gold z-50' : 'border-black/10 hover:border-gold'
            }`}
        >

          <div
            onClick={() => onOpenInfo(customer.id)}
            className='bg-gradient-to-r from-warm-dark to-warm-darker w-full pt-3 pb-5 px-3 flex items-center relative overflow-hidden cursor-pointer group/header'
          >
            <div className="flex items-center gap-2.5 relative z-10 w-full">
              <div className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center bg-white/10 text-[12px] font-bold text-white border border-white/20 shadow-none! backdrop-blur-md">
                {customer.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[14px] text-white group-hover/header:text-gold-light transition-colors truncate block leading-tight tracking-tight">
                    {customer.name}
                  </span>
                  <Link
                    href={`/customers/${customer.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-white/40 hover:text-white transition-colors"
                    title="View Full Profile"
                  >
                    <RiArrowRightUpLine size={12} />
                  </Link>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-1 text-white/60 mt-0.5">
                    <RiPhoneLine size={10} className="shrink-0" />
                    <p className="text-[10px] tracking-wider font-medium">
                      {customer.phone.startsWith('+') ? customer.phone : `+${customer.phone}`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Subtle light orb in the background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
          </div>

          <div className='-mt-3 px-2 relative z-10'>
            <div className="flex bg-white rounded-lg border border-black/5 p-2 justify-between items-start mb-2">
              <div className="w-full flex items-center justify-between">

                <div className="flex items-center justify-between">
                  {customer.leadSource ? (() => {
                    const brand = brandLogoForLeadSource(customer.leadSource);
                    const isReferral = customer.leadSource.toLowerCase() === 'referral';

                    return (
                      <div className="flex items-center gap-2 bg-stone/50 px-1.5 py-0.5 rounded-md border border-stone-alt/50">
                        {brand ? (
                          <BrandLogo brand={brand} size={14} alt={customer.leadSource} />
                        ) : isReferral ? (
                          <div className="w-5 h-5 shrink-0 bg-[#A67C52] rounded-full flex items-center justify-center text-white">
                            <RiArrowRightUpLine size={12} />
                          </div>
                        ) : null}
                        <span className="text-[12px] font-medium text-zinc-500 capitalize">{getLeadSourceLabel(customer.leadSource) || customer.leadSource}</span>
                      </div>
                    );
                  })() : (
                    <div className="flex items-center gap-1 bg-stone/50 px-1.5 py-0.5 rounded-md border border-stone-alt/50">
                      <span className="text-[10px] font-medium text-zinc-600 capitalize">Direct</span>
                    </div>
                  )}

                  {customer.daysInStage !== undefined && (
                    <span className="text-[10px] font-medium text-zinc-400 flex items-center gap-0.5">
                      <RiTimeLine size={10} /> {customer.daysInStage}d
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-bold text-[15px] pr-2 text-ink tracking-wide relative z-10">
                    ₹{customer.dealValue ? customer.dealValue.toLocaleString('en-IN') : '00'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-1 mt-1 mb-2">
              {customer.city ? (
                <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-500">
                  <RiMapPinLine size={12} className="text-zinc-400" />
                  <span className="capitalize">{customer.city}</span>
                </div>
              ) : <div />}

              {customer.followUpDate && (
                <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-500">
                  <RiCalendarCheckLine size={12} className="text-zinc-400" />
                  <span>
                    {(() => {
                      try {
                        const d = new Date(customer.followUpDate);
                        if (isNaN(d.getTime())) return customer.followUpDate;
                        if (isToday(d)) return 'Active today';
                        if (isYesterday(d)) return 'Yesterday';
                        const diff = differenceInDays(new Date(), d);
                        if (diff === -1) return 'Tomorrow';
                        if (diff < -1) return `In ${Math.abs(diff)} days`;
                        if (diff > 0) return `${diff} days ago`;
                        return format(d, 'MMM d, yyyy');
                      } catch {
                        return customer.followUpDate;
                      }
                    })()}
                  </span>
                </div>
              )}
            </div>


            <div className="flex items-center justify-between py-4 px-1">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (customer.phone) {
                      const phone = customer.phone.replace(/\D/g, '');
                      window.open(`https://wa.me/${phone}`, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-green-800 text-white hover:bg-[#1DA851] transition-all duration-200 text-[10px] font-bold tracking-wide shadow-none!">
                  <RiWhatsappLine size={13} /> WhatsApp
                </button>

                <Tooltip>
                  <TooltipTrigger render={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (customer.phone) {
                          const phoneWithPlus = customer.phone.startsWith('+') ? customer.phone : `+${customer.phone}`;
                          window.location.href = `tel:${phoneWithPlus.replace(/\s+/g, '')}`;
                        }
                      }}
                      className="size-[28px] flex items-center justify-center border hover:bg-gold hover:text-white border-gold/10 text-gold bg-background/60 rounded-full transition-all duration-200"
                    />
                  }>
                    <RiPhoneFill size={14} />
                  </TooltipTrigger>
                  <TooltipContent side="top" className={"text-xs"}>Call Customer</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger render={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEdit(customer.id);
                      }}
                      className="size-[28px] flex items-center justify-center border border-gold/10 text-gold bg-background/60 rounded-full transition-all duration-200 hover:bg-gold hover:text-white"
                    />
                  }>
                    <RiEdit2Line size={14} />
                  </TooltipTrigger>
                  <TooltipContent side="top">Edit Customer</TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenNotes(customer.id);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 border rounded-full border-stone-alt bg-transparent text-zinc-600 hover:text-gold hover:border-gold hover:bg-stone/50 transition-all duration-200 text-[10px] font-bold tracking-wide">
                  <RiAddLine size={12} /> Note
                </button>
              </div>
            </div>


          </div>
        </div>
      )}
    </Draggable>
  );
}
