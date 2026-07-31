'use client';

import { useState, useEffect, useSyncExternalStore, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { RiAddLine, RiSearchLine, RiMailLine, RiPhoneLine, RiMapPinLine, RiTimeLine, RiInformationLine, RiCalendarCheckLine, RiFocus3Line, RiArrowRightUpLine } from 'react-icons/ri';
import { format } from 'date-fns';
import { readCustomers, subscribeCustomers, isCustomersHydrated, DEAL_STAGES, updateCustomer } from '@/lib/customers-store';
import { PAGE } from '@/lib/copy';
import { dealStageBadgeClass } from '@/components/customers/deal-stage-utils';
import AddCustomerModal from '@/components/customers/AddCustomerModal';
import CustomerNotesDrawer from '@/components/customers/CustomerNotesDrawer';
import CustomerInfoDrawer from '@/components/customers/CustomerInfoDrawer';
import { Customer, DealStage } from '@/lib/mock-data';
import { toast } from 'sonner';
import { TOAST } from '@/lib/copy';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

import { EditCustomerModal } from '@/components/customers/EditCustomerModal';
import { BrandLogo } from '@/components/BrandLogo';
import { brandLogoForLeadSource } from '@/lib/brand-logos';
import { resolveLeadSourceId } from '@/lib/lead-source-options';
import { AutoTaggedSources } from './_components/AutoTaggedSources';
import { PipelineCard } from './_components/PipelineCard';

function PipelineColumn({
  stage,
  title,
  customers,
  onOpenNotes,
  onOpenInfo,
  onOpenEdit,
}: {
  stage: DealStage;
  title: string;
  customers: Customer[];
  onOpenNotes: (id: string) => void;
  onOpenInfo: (id: string) => void;
  onOpenEdit: (id: string) => void;
}) {
  const dotColorMap: Record<DealStage, string> = {
    inquiry: 'bg-zinc-400',
    vsv_scheduled: 'bg-blue-500',
    vsv_done: 'bg-emerald-500',
    offer: 'bg-amber-500',
    negotiation: 'bg-orange-500',
    closed_won: 'bg-success',
    closed_lost: 'bg-red-500',
  };

  const totalValue = customers.reduce((sum, c) => sum + (c.dealValue || 0), 0);

  return (
    <Droppable droppableId={stage}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`flex flex-col min-w-[300px] flex-1 px-3 py-4 h-[calc(100vh-220px)] transition-all duration-200 rounded-[14px] ${snapshot.isDraggingOver
            ? 'bg-stone/50 border-2 border-dashed border-gold/60'
            : 'bg-stone border border-black/10'
            }`}
        >
          <div className="flex items-center justify-between mb-4 px-1 pb-3 border-b border-stone-alt">
            <div className='flex items-center gap-2'>
              <div className={`size-2 rounded-full flex items-center justify-center ${dotColorMap[stage] || 'bg-black'}`}></div>
              <h3 className="text-[11px] font-bold tracking-widest text-ink uppercase">
                {title.toLowerCase().includes('virtual site visit') ? (
                  <Tooltip>
                    <TooltipTrigger className="cursor-help">
                      {title.replace(/Virtual Site Visit/i, 'VSV')}
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Virtual Site Visit
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  title
                )}
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[14px] font-semibold text-zinc-500">
                ₹{totalValue.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] font-medium text-ivory bg-gradient-to-b from-warm-dark to-warm-darker border border-stone-alt/20 px-1.5 py-0.5 shadow-sm rounded-full size-[20px] flex items-center justify-center">
                {
                  String(
                    customers.length
                  ).padStart(2, '0')
                }
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-none">
            {customers.map((customer, index) => (
              <PipelineCard
                key={customer.id}
                customer={customer}
                index={index}
                onOpenNotes={onOpenNotes}
                onOpenInfo={onOpenInfo}
                onOpenEdit={onOpenEdit}
              />
            ))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
}

const EMPTY_ARRAY: Customer[] = [];

function PipelineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeNotesId, setActiveNotesId] = useState<string | null>(null);
  const [activeInfoId, setActiveInfoId] = useState<string | null>(null);
  const [activeEditId, setActiveEditId] = useState<string | null>(null);

  const isClient = useSyncExternalStore(() => () => { }, () => true, () => false);
  const allCustomers = useSyncExternalStore(subscribeCustomers, readCustomers, () => EMPTY_ARRAY);
  const isHydrated = useSyncExternalStore(subscribeCustomers, isCustomersHydrated, () => false);

  const [columns, setColumns] = useState<Record<DealStage, Customer[]>>({
    inquiry: [], vsv_scheduled: [], vsv_done: [], offer: [], negotiation: [], closed_won: [], closed_lost: []
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  useEffect(() => {
    const sourceParam = searchParams.get('source');
    if (!sourceParam) {
      setSourceFilter(null);
      return;
    }
    const normalized = resolveLeadSourceId(sourceParam) || sourceParam.toLowerCase();
    setSourceFilter(normalized);
  }, [searchParams]);

  const handleSelectSource = useCallback(
    (source: string | null) => {
      setSourceFilter(source);
      const params = new URLSearchParams(searchParams.toString());
      if (source) params.set('source', source);
      else params.delete('source');
      const q = params.toString();
      router.replace(q ? `/pipeline?${q}` : '/pipeline', { scroll: false });
    },
    [router, searchParams]
  );

  const totalOpenDealsValue = allCustomers
    .filter(c => c.dealStage !== 'closed_won' && c.dealStage !== 'closed_lost')
    .reduce((sum, c) => sum + (c.dealValue || 0), 0);

  const formatDealValue = (val: number): string => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(0)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  useEffect(() => {
    if (isHydrated) {
      const newColumns: Record<DealStage, Customer[]> = {
        inquiry: [], vsv_scheduled: [], vsv_done: [], offer: [], negotiation: [], closed_won: [], closed_lost: []
      };
      const q = searchQuery.trim().toLowerCase();
      allCustomers.forEach(c => {
        if (q && !c.name.toLowerCase().includes(q) && !(c.phone || '').includes(q)) {
          return;
        }
        if (sourceFilter && (!c.leadSource || c.leadSource.toLowerCase() !== sourceFilter)) {
          return;
        }
        newColumns[(c.dealStage || 'inquiry') as DealStage].push(c);
      });
      queueMicrotask(() => {
        setColumns(newColumns);
      });
    }
  }, [allCustomers, isHydrated, searchQuery, sourceFilter]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    const sourceStage = source.droppableId as DealStage;
    const destStage = destination.droppableId as DealStage;

    if (sourceStage === destStage && source.index === destination.index) return;

    // Optimistic local update for smooth animation
    const newColumns = { ...columns };
    const sourceList = [...newColumns[sourceStage]];
    const destList = sourceStage === destStage ? sourceList : [...newColumns[destStage]];

    const [movedCustomer] = sourceList.splice(source.index, 1);
    const updatedCustomer = { ...movedCustomer, dealStage: destStage };
    destList.splice(destination.index, 0, updatedCustomer);

    newColumns[sourceStage] = sourceList;
    newColumns[destStage] = destList;
    setColumns(newColumns);

    if (sourceStage !== destStage) {
      updateCustomer(draggableId, { dealStage: destStage }).then(() => {
        toast.success(TOAST.dealStageUpdated(PAGE.customers.dealStages[destStage]));
      });
    }
  };

  return (
    <DashboardLayout activePath="/pipeline">
      <div className="px-8 pt-8 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center py-2 justify-between pb-4 border-b border-stone-alt/60 gap-4 flex-wrap">
          <div className='flex flex-col gap-1'>
            <h2 className="text-xl font-semibold text-ink">Pipeline</h2>
            <p className='text-ink/60 text-sm'>
              <strong className='font-bold'>
                {formatDealValue(totalOpenDealsValue)}</strong> in open deals.
            </p>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <div className="relative w-48 sm:w-64 bg-white">
              <RiSearchLine className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-stone/20 border border-stone-alt focus:outline-none focus:border-gold transition-colors placeholder:text-zinc-400"
              />
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-ink px-4 text-[10px] font-bold uppercase tracking-widest text-white shadow-md hover:bg-gold shrink-0 transition-all duration-200"
            >
              <RiAddLine size={14} />
              {PAGE.customers.addCta}
            </Button>
          </div>
        </div>
        <div>
          <AutoTaggedSources
            customers={allCustomers}
            selectedSource={sourceFilter}
            onSelectSource={handleSelectSource}
            loading={!isHydrated}
          />
        </div>
      </div>

      <div className="space-y-8 px-8 pb-8 max-w-[1400px] mx-auto w-full h-full flex flex-col pt-4">

        {isClient && !isHydrated && (
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
            {DEAL_STAGES.map((stage) => (
              <div key={stage} className="flex flex-col min-w-[300px] flex-1 px-3 py-4 h-[calc(100vh-220px)] bg-stone border border-black/10 rounded-[14px]">
                <div className="flex items-center justify-between mb-4 px-1 pb-3 border-b border-stone-alt">
                  <div className="h-4 w-24 bg-stone-alt/50 animate-pulse rounded-sm" />
                  <div className="h-4 w-6 bg-stone-alt/50 animate-pulse rounded-sm" />
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white p-3 border border-stone-alt rounded-xl h-28 animate-pulse flex flex-col justify-between shadow-sm">
                      <div className="h-4 w-1/2 bg-stone-alt/40 rounded-sm" />
                      <div className="h-8 w-full bg-stone-alt/20 mt-4 rounded-sm" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {isClient && isHydrated && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
              {DEAL_STAGES.map((stage) => (
                <PipelineColumn
                  key={stage}
                  stage={stage}
                  title={PAGE.customers.dealStages[stage]}
                  customers={columns[stage] || []}
                  onOpenNotes={setActiveNotesId}
                  onOpenInfo={setActiveInfoId}
                  onOpenEdit={setActiveEditId}
                />
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      <AddCustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <CustomerNotesDrawer
        isOpen={!!activeNotesId}
        onClose={() => setActiveNotesId(null)}
        customerId={activeNotesId}
        customerName={allCustomers.find(c => c.id === activeNotesId)?.name || ''}
      />

      {activeInfoId && (
        <CustomerInfoDrawer
          isOpen={!!activeInfoId}
          onClose={() => setActiveInfoId(null)}
          customer={allCustomers.find(c => c.id === activeInfoId) || null}
        />
      )}

      {activeEditId && allCustomers.find((c) => c.id === activeEditId) && (
        <EditCustomerModal
          customer={allCustomers.find((c) => c.id === activeEditId)!}
          isOpen={!!activeEditId}
          onClose={() => setActiveEditId(null)}
        />
      )}
    </DashboardLayout>
  );
}

export default function PipelinePage() {
  return (
    <Suspense fallback={null}>
      <PipelineContent />
    </Suspense>
  );
}
