'use client';

import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { ACCESS_ROLES, PLATFORM_PERMISSIONS } from '@/lib/roles';
import { ADMIN_ROUTE_META } from '@/lib/navigation';
import { ADMIN_BREADCRUMBS } from '../_components/admin-shared';
import { RiCheckboxFill, RiCheckboxBlankLine } from 'react-icons/ri';

const meta = ADMIN_ROUTE_META['/admin/permissions'];

export default function AdminPermissionsPage() {
  return (
    <DashboardLayout>
      <motion.div className="space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <PageHeader
          title={meta.title}
          description={meta.description}
          breadcrumbs={[...ADMIN_BREADCRUMBS, { label: meta.title }]}
        />

        <motion.div
          className="overflow-x-auto border border-stone-alt bg-ivory"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-stone-alt bg-stone/40">
                <th className="px-5 py-4 font-semibold text-zinc-500">Permission</th>
                {ACCESS_ROLES.map((role) => (
                  <th key={role.id} className="px-4 py-4 font-semibold text-zinc-500 text-center">
                    {role.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLATFORM_PERMISSIONS.map((perm, i) => (
                <tr
                  key={perm}
                  className="border-b border-stone-alt/70 transition-colors hover:bg-stone/25"
                  style={{ animation: `fadeUp 0.35s ease ${i * 0.03}s both` }}
                >
                  <td className="px-5 py-3.5 font-medium text-ink">{perm}</td>
                  {ACCESS_ROLES.map((role) => {
                    const has = role.permissions.includes(perm);
                    return (
                      <td key={role.id} className="px-4 py-3.5 text-center">
                        <div className="flex justify-center" title={has ? 'Granted' : '—'}>
                          {has ? (
                            <RiCheckboxFill className="text-gold" size={16} />
                          ) : (
                            <RiCheckboxBlankLine className="text-zinc-200" size={16} />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
