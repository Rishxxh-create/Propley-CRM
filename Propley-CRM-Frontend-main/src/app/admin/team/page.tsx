'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import TeamMemberDrawer, { type TeamMemberFormData } from '@/components/admin/TeamMemberDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RiAddLine, RiSearchLine, RiTeamLine } from 'react-icons/ri';
import { useAdmin } from '../_components/AdminProvider';
import { TeamAccessTable } from '../_components/TeamAccessTable';
import { ADMIN_BREADCRUMBS } from '../_components/admin-shared';
import { ADMIN_ROUTE_META } from '@/lib/navigation';
import type { TeamMember } from '@/lib/mock-data';
import { formatIndianDate } from '@/lib/date-format';
import { getRoleLabel } from '@/lib/roles';

const meta = ADMIN_ROUTE_META['/admin/team'];

export default function AdminTeamPage() {
  const { teamMembers, setTeamMembers } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add');
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return teamMembers;
    return teamMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q) ||
        getRoleLabel(m.role).toLowerCase().includes(q)
    );
  }, [teamMembers, searchQuery]);

  const handleSave = (data: TeamMemberFormData) => {
    if (drawerMode === 'edit' && data.id) {
      setTeamMembers((prev) =>
        prev.map((m) =>
          m.id === data.id
            ? { ...m, name: data.name, email: data.email, phone: data.phone, role: data.role, department: data.department, status: data.status }
            : m
        )
      );
      return;
    }
    setTeamMembers((prev) => [
      {
        id: `tm-${Date.now()}`,
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        department: data.department || 'General',
        status: data.status,
        joinedAt: formatIndianDate(new Date()),
        lastActive: data.status === 'invited' ? 'Pending acceptance' : 'Just now',
      },
      ...prev,
    ]);
  };

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-8 px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <PageHeader
          title={meta.title}
          description={meta.description}
          breadcrumbs={[...ADMIN_BREADCRUMBS, { label: meta.title }]}
        >
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative group w-full sm:w-56">
              <RiSearchLine className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-gold z-10" size={16} />
              <Input
                placeholder="Search team..."
                className="pl-7 h-11 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="propley"
              className="h-11 px-6"
              onClick={() => {
                setDrawerMode('add');
                setEditingMember(null);
                setDrawerOpen(true);
              }}
            >
              <RiAddLine size={16} />
              Add Member
            </Button>
          </div>
        </PageHeader>

        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          {[
            { label: 'Total Members', value: teamMembers.length },
            { label: 'Active', value: teamMembers.filter((m) => m.status === 'active').length },
            { label: 'Invited', value: teamMembers.filter((m) => m.status === 'invited').length },
            { label: 'Advisors', value: teamMembers.filter((m) => m.role === 'advisor').length },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              className="border border-stone-alt bg-ivory p-5 transition-colors hover:border-gold/25"
            >
              <div className="flex items-center gap-2 text-zinc-500 mb-2">
                <RiTeamLine size={14} className="text-gold" />
                <span className="text-[10px] font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="text-2xl font-semibold text-ink tabular-nums">{stat.value}</p>
            </motion.div>
          ))}
        </motion.div>

        <TeamAccessTable
          members={filtered}
          onEdit={(m) => {
            setDrawerMode('edit');
            setEditingMember(m);
            setDrawerOpen(true);
          }}
        />
      </motion.div>

      <TeamMemberDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={drawerMode}
        initialData={editingMember}
        onSave={handleSave}
      />
    </DashboardLayout>
  );
}
