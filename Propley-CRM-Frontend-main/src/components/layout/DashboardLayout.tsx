'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import NewMeetingModal from '@/components/presentations/NewMeetingModal';
import { motion } from 'framer-motion';
import AuthGuard from '@/components/auth/AuthGuard';
import { hydrateCustomers } from '@/lib/customers-store';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  useEffect(() => {
    hydrateCustomers().catch(() => { });
  }, []);
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewMeetingModalOpen, setIsNewMeetingModalOpen] = useState(false);



  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background font-sans">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <div className="@container/dashboard flex min-w-0 flex-1 flex-col">
          <TopBar onToggleSidebar={() => setIsSidebarOpen(true)} />

          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-stone/40 [scrollbar-gutter:stable]">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
              className="mx-auto w-full min-w-0"
            >
              {children}
            </motion.div>
          </main>
        </div>

        <NewMeetingModal
          isOpen={isNewMeetingModalOpen}
          onClose={() => setIsNewMeetingModalOpen(false)}
        />
      </div>
    </AuthGuard>
  );
}
