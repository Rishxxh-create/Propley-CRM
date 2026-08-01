'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { AdvisorOverview } from '@/components/dashboard/AdvisorOverview';
import { useLoadEventStats } from '@/store/hooks/useEventStats';

export default function Dashboard() {
  useLoadEventStats();

  return (
    <>
      <Script
      src="https://arvo-telephony-frontend-five.vercel.app/widget.js"
      data-public-key="pub_DrKNpNEoM84vaTf1-u6y7VPUJuhYmw0E"
      strategy="afterInteractive"
    />
      <DashboardLayout activePath="/">
      <div className="px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full">
        <AdvisorOverview />
      </div>
    </DashboardLayout>
    </>
  );
}
