'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { EditCustomerModal } from '@/components/customers/EditCustomerModal';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { IconType } from 'react-icons';
import {
  RiArrowLeftLine,
  RiArrowRightSLine,
  RiCalendarEventLine,
  RiDeleteBinLine,
  RiTimeLine,
  RiUser3Line,
  RiStickyNoteLine,
} from 'react-icons/ri';
import type { Customer, StoredMeeting } from '@/lib/mock-data';
import { getAdvisorName } from '@/lib/mock-data';
import { ClientProfileHero } from '@/components/customers/ClientProfileHero';
import { ClientPresentationHistory } from '@/components/customers/ClientPresentationHistory';
import { ClientTimeline } from '@/components/customers/ClientTimeline';
import { DealStageSelector } from '@/components/customers/DealStageSelector';
import { ClientNotesCard } from '@/components/customers/ClientNotesCard';

import { PAGE } from '@/lib/copy';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { removeCustomer } from '@/lib/customers-store';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { getLeadSourceLabel } from '@/lib/lead-source-options';
import { useVoiceAgentStore } from '@/store/voice-agent-store';


export type ClientProfileSection =
  | 'overview'
  | 'activity'
  | 'presentations'
  | 'notes';

const SECTIONS: {
  id: ClientProfileSection;
  label: string;
  shortLabel: string;
  icon: IconType;
}[] = [
    {
      id: 'overview',
      label: PAGE.customers.profile.sections.overview,
      shortLabel: 'Overview',
      icon: RiUser3Line,
    },
    {
      id: 'activity',
      label: PAGE.customers.profile.sections.activity,
      shortLabel: 'Activity',
      icon: RiTimeLine,
    },
    {
      id: 'presentations',
      label: PAGE.customers.profile.sections.presentations,
      shortLabel: 'Sessions',
      icon: RiCalendarEventLine,
    },
    {
      id: 'notes',
      label: PAGE.customers.profile.sections.notes,
      shortLabel: 'Notes',
      icon: RiStickyNoteLine,
    },
  ];

const panelMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] as const },
};

interface ClientProfileViewProps {
  customer: Customer;
  meetings: StoredMeeting[];
  clientId: string;
  nextMeeting?: StoredMeeting;
}

export function ClientProfileView({
  customer,
  meetings,
  clientId,
  nextMeeting,
}: ClientProfileViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const rawQuerySection = searchParams.get('tab') as ClientProfileSection;
  const activeSection = SECTIONS.some((s) => s.id === rawQuerySection) ? rawQuerySection : 'overview';
  const rawSectionStore = useVoiceAgentStore((s) => s.clientProfileState.activeSection);

  const activeSectionRef = useRef(activeSection);
  activeSectionRef.current = activeSection;

  useEffect(() => {
    if (rawSectionStore && SECTIONS.some((s) => s.id === rawSectionStore) && rawSectionStore !== activeSectionRef.current) {
      const params = new URLSearchParams(window.location.search);
      if (rawSectionStore === 'overview') {
        params.delete('tab');
      } else {
        params.set('tab', rawSectionStore);
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [rawSectionStore, pathname, router]);

  useEffect(() => {
    if (activeSection !== useVoiceAgentStore.getState().clientProfileState.activeSection) {
      useVoiceAgentStore.getState().setClientProfileState({ activeSection });
    }
  }, [activeSection]);

  const setActiveSection = (section: ClientProfileSection) => {
    const params = new URLSearchParams(searchParams.toString());
    if (section === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', section);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await removeCustomer(customer.id);
      toast.success('Client deleted');
      router.push('/customers');
    } catch {
      toast.error('Could not delete client');
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const stage = customer.dealStage ?? 'inquiry';
  const stageLabel = PAGE.customers.dealStages[stage];
  const advisorName = getAdvisorName(customer.assignedAdvisorId);
  const leadSourceLabel = getLeadSourceLabel(customer.leadSource);

  const activeMeta = SECTIONS.find((s) => s.id === activeSection)!;

  const navButtons = (compact?: boolean) =>
    SECTIONS.map((section) => {
      const Icon = section.icon;
      const isActive = activeSection === section.id;
      return (
        <button
          key={section.id}
          type="button"
          onClick={() => setActiveSection(section.id)}
          className={cn(
            compact
              ? 'flex shrink-0 items-center gap-2 border px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer'
              : 'flex w-full cursor-pointer items-center justify-between border-l-2 px-3 py-3 text-left text-xs font-semibold transition-all',
            compact
              ? isActive
                ? 'border-ink bg-ink text-ivory'
                : 'border-stone-alt bg-ivory text-zinc-500 hover:border-gold hover:text-ink'
              : isActive
                ? 'border-gold bg-stone/50 text-ink'
                : 'border-transparent text-zinc-500 hover:bg-stone/20 hover:text-ink'
          )}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <Icon
              size={14}
              className={cn(
                compact ? (isActive ? 'text-ivory' : 'text-zinc-400') : isActive ? 'text-gold' : 'text-zinc-400'
              )}
            />
            <span className={compact ? undefined : undefined}>
              {compact ? (
                <>
                  <span className="sm:hidden">{section.shortLabel}</span>
                  <span className="hidden sm:inline">{section.label}</span>
                </>
              ) : (
                section.label
              )}
            </span>
          </div>
          {!compact && (
            <RiArrowRightSLine
              size={14}
              className={cn(
                'text-zinc-400 transition-transform',
                isActive && 'translate-x-0.5 text-gold'
              )}
            />
          )}
        </button>
      );
    });

  return (
    <>
      <EditCustomerModal
        customer={customer}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
      />
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-lg border-stone-alt bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-ink">
              Delete client
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-zinc-600">
              This permanently removes {customer.name} from the CRM. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              type="button"
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              Cancel
            </DialogClose>
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <RiDeleteBinLine size={16} />
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="@container/profile w-full min-w-0 pb-24 md:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="client-profile-shell flex min-w-0 w-full flex-col gap-6 sm:gap-8 @4xl/profile:flex-row @4xl/profile:items-start"
        >
          {/* Desktop sub-sidebar — only when profile column is wide (voice panel shrinks main area) */}
          <aside className="client-profile-desktop-nav z-10 hidden w-64 max-w-[18rem] shrink-0 self-start space-y-6 border border-stone-alt rounded-xl bg-ivory p-5 @4xl/profile:sticky @4xl/profile:top-6 @4xl/profile:block @4xl/profile:p-6 shadow-none!">
            <Link
              href="/customers"
              className="group flex items-center gap-3 rounded-lg border border-stone-alt bg-stone/20 px-4 py-3 text-xs font-semibold text-ink transition-all hover:bg-stone/50"
            >
              <RiArrowLeftLine className="text-gold transition-transform group-hover:-translate-x-0.5" />
              {PAGE.customers.profile.back}
            </Link>

            <div className="h-px bg-stone-alt" aria-hidden />

            <nav className="space-y-1">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                {PAGE.customers.profile.navMenu}
              </p>
              {navButtons(false)}
            </nav>
          </aside>

          {/* Compact nav: back link, context strip, horizontal section tabs */}
          <div className="client-profile-compact-nav w-full min-w-0 space-y-4 @4xl/profile:hidden">
            <Link
              href="/customers"
              className="group inline-flex w-full items-center justify-center gap-3 rounded-lg border border-stone-alt bg-ivory px-4 py-3 text-xs font-semibold text-ink transition-all hover:bg-stone/30 sm:w-auto sm:justify-start"
            >
              <RiArrowLeftLine className="text-gold transition-transform group-hover:-translate-x-0.5" />
              {PAGE.customers.profile.back}
            </Link>

            <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {navButtons(true)}
            </div>
          </div>

          {/* Main panel */}
          <div className="min-w-0 w-full flex-1 space-y-5 overflow-x-hidden sm:space-y-8">
            <div className="border-b border-stone-alt pb-4 sm:pb-6">
              <div className="space-y-1.5 sm:space-y-2">
                <h1 className="text-lg font-semibold tracking-tight text-ink sm:text-xl @lg/profile:text-2xl">
                  {activeMeta.label}
                  <span className="text-gold">.</span>
                </h1>
                <p className="text-xs font-medium leading-relaxed text-zinc-600">
                  {PAGE.customers.profile.sectionBlurb[activeSection]}
                </p>
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-600">
                  {customer.name} · {stageLabel}
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeSection === 'overview' && (
                <motion.div key="overview" {...panelMotion} className="space-y-6 sm:space-y-8">
                  <ClientProfileHero customer={customer} onEdit={() => setEditOpen(true)} />
                  <DealStageSelector customer={customer} />
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/meetings/new?client=${clientId}`}
                      className={cn(buttonVariants({ variant: 'propley' }), 'gap-2')}
                    >
                      <RiCalendarEventLine size={16} />
                      {PAGE.customers.profile.scheduleCta}
                    </Link>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setDeleteOpen(true)}
                      className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <RiDeleteBinLine size={16} />
                      Delete client
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeSection === 'activity' && (
                <motion.div key="activity" {...panelMotion}>
                  <ClientTimeline customer={customer} />
                </motion.div>
              )}

              {activeSection === 'presentations' && (
                <motion.div key="presentations" {...panelMotion}>
                  <ClientPresentationHistory meetings={meetings} />
                </motion.div>
              )}

              {activeSection === 'notes' && (
                <motion.div key="notes" {...panelMotion}>
                  <ClientNotesCard clientId={clientId} />
                </motion.div>
              )}


            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </>
  );
}
