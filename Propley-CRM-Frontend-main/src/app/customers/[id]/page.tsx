'use client';

import { use, useSyncExternalStore, Suspense } from 'react';
import { notFound } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ClientProfileView } from '@/components/customers/ClientProfileView';
import {
  getCustomerByIdFromStore,
  isCustomersHydrated,
  subscribeCustomers,
} from '@/lib/customers-store';
import {
  getPresentationsByClientId,
  subscribePresentations,
} from '@/lib/presentations-store';
import type { StoredMeeting } from '@/lib/mock-data';

function findNextMeeting(clientId: string): StoredMeeting | undefined {
  const meetings = getPresentationsByClientId(clientId);
  const upcoming = meetings.filter(
    (m) => m.status === 'Scheduled' || m.status === 'Live'
  );
  return upcoming[0];
}

function ClientProfileSkeleton() {
  return (
    <div className="@container/profile w-full min-w-0 pb-24 md:pb-28">
      <div className="client-profile-shell flex min-w-0 w-full flex-col gap-6 sm:gap-8 @4xl/profile:flex-row @4xl/profile:items-start">
        
        {/* Desktop sub-sidebar skeleton */}
        <aside className="client-profile-desktop-nav z-10 hidden w-64 max-w-[18rem] shrink-0 self-start space-y-6 border border-stone-alt bg-ivory p-5 @4xl/profile:sticky @4xl/profile:top-6 @4xl/profile:block @4xl/profile:p-6">
          <div className="h-10 w-full bg-stone-alt/40 animate-pulse" />
          <div className="h-px bg-stone-alt" />
          <nav className="space-y-3">
            <div className="h-3 w-16 bg-stone-alt/50 animate-pulse mb-4" />
            <div className="h-10 w-full bg-stone-alt/30 animate-pulse" />
            <div className="h-10 w-full bg-stone-alt/20 animate-pulse" />
            <div className="h-10 w-full bg-stone-alt/20 animate-pulse" />
          </nav>
        </aside>

        {/* Compact nav skeleton */}
        <div className="client-profile-compact-nav w-full min-w-0 space-y-4 @4xl/profile:hidden">
          <div className="h-10 w-32 bg-stone-alt/40 animate-pulse" />
          <div className="flex gap-2 overflow-x-hidden pb-1">
            <div className="h-9 w-24 bg-stone-alt/30 animate-pulse border border-stone-alt/50" />
            <div className="h-9 w-24 bg-stone-alt/20 animate-pulse border border-stone-alt/50" />
            <div className="h-9 w-24 bg-stone-alt/20 animate-pulse border border-stone-alt/50" />
          </div>
        </div>

        {/* Main panel skeleton */}
        <div className="min-w-0 w-full flex-1 space-y-5 overflow-x-hidden sm:space-y-8">
          <div className="border-b border-stone-alt pb-4 sm:pb-6 space-y-3">
            <div className="h-6 w-48 bg-stone-alt/50 animate-pulse" />
            <div className="h-4 w-64 bg-stone-alt/30 animate-pulse" />
            <div className="h-3 w-32 bg-stone-alt/20 animate-pulse mt-2" />
          </div>

          <div className="space-y-6 sm:space-y-8">
             {/* Hero Skeleton */}
             <div className="border border-stone-alt bg-ivory p-6">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 bg-stone-alt/40 animate-pulse" />
                  <div className="space-y-2 flex-1">
                     <div className="h-5 w-40 bg-stone-alt/50 animate-pulse" />
                     <div className="h-4 w-32 bg-stone-alt/30 animate-pulse" />
                     <div className="h-4 w-48 bg-stone-alt/30 animate-pulse mt-2" />
                  </div>
                </div>
             </div>
             
             {/* Deal Stage Skeleton */}
             <div className="border border-stone-alt bg-ivory p-6">
                 <div className="h-4 w-24 bg-stone-alt/40 animate-pulse mb-4" />
                 <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                       <div key={i} className="h-10 flex-1 bg-stone-alt/20 animate-pulse" />
                    ))}
                 </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const EMPTY_ARRAY: any[] = [];

export default function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const customer = useSyncExternalStore(
    subscribeCustomers,
    () => getCustomerByIdFromStore(id),
    () => getCustomerByIdFromStore(id)
  );

  const hydrated = useSyncExternalStore(
    subscribeCustomers,
    isCustomersHydrated,
    () => false
  );

  const meetings = useSyncExternalStore(
    subscribePresentations,
    () => getPresentationsByClientId(id),
    () => EMPTY_ARRAY
  );

  if (!customer) {
    if (hydrated) {
      notFound();
    }
    return (
      <DashboardLayout activePath="/customers">
        <div className="px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full">
          <ClientProfileSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  const nextMeeting = findNextMeeting(id);

  return (
    <DashboardLayout activePath="/customers">
      <div className="px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full">
        <Suspense fallback={<ClientProfileSkeleton />}>
          <ClientProfileView
            customer={customer}
            meetings={meetings}
            clientId={id}
            nextMeeting={nextMeeting}
          />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
