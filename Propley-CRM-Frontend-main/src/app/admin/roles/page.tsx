'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  RiCheckLine,
  RiEditLine,
  RiDeleteBinLine,
  RiAddLine,
  RiCloseLine,
  RiShieldUserLine,
  RiFileList3Line,
} from 'react-icons/ri';
import { ACCESS_ROLES, PLATFORM_PERMISSIONS, type RoleDefinition } from '@/lib/roles';
import { ADMIN_ROUTE_META } from '@/lib/navigation';
import { ADMIN_BREADCRUMBS } from '../_components/admin-shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerTitle,
} from '@/components/ui/drawer';

const meta = ADMIN_ROUTE_META['/admin/roles'];

function readStoredRoles(): RoleDefinition[] {
  if (typeof window === 'undefined') return ACCESS_ROLES;
  try {
    const saved = localStorage.getItem('propley_roles');
    if (saved) return JSON.parse(saved) as RoleDefinition[];
  } catch {
    /* invalid JSON — use defaults */
  }
  return ACCESS_ROLES;
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<RoleDefinition[]>(readStoredRoles);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);

  const [formData, setFormData] = useState({
    id: '',
    label: '',
    description: '',
    permissions: [] as string[],
  });

  const saveRoles = (newRoles: RoleDefinition[]) => {
    setRoles(newRoles);
    localStorage.setItem('propley_roles', JSON.stringify(newRoles));
  };

  const handleAddRole = () => {
    setEditingRole(null);
    setFormData({
      id: '',
      label: '',
      description: '',
      permissions: [],
    });
    setIsDrawerOpen(true);
  };

  const handleEditRole = (role: RoleDefinition) => {
    setEditingRole(role);
    setFormData({
      id: role.id,
      label: role.label,
      description: role.description,
      permissions: role.permissions,
    });
    setIsDrawerOpen(true);
  };

  const handleDeleteRole = (roleId: string) => {
    if (confirm('Are you sure you want to delete this role policy? This action cannot be undone.')) {
      const filtered = roles.filter((r) => r.id !== roleId);
      saveRoles(filtered);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label.trim()) return;

    if (editingRole) {
      // Edit mode
      const updated = roles.map((r) =>
        r.id === editingRole.id
          ? {
              ...r,
              label: formData.label,
              description: formData.description,
              permissions: formData.permissions,
            }
          : r
      );
      saveRoles(updated);
    } else {
      // Add mode
      const safeId =
        formData.label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '') || `role_${Date.now()}`;
      const newRole: RoleDefinition = {
        id: safeId,
        label: formData.label,
        description: formData.description,
        permissions: formData.permissions,
      };
      saveRoles([...roles, newRole]);
    }
    setIsDrawerOpen(false);
  };

  const togglePermission = (perm: string) => {
    if (formData.permissions.includes(perm)) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter((p) => p !== perm),
      });
    } else {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, perm],
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PageHeader
          title={meta.title}
          description={meta.description}
          breadcrumbs={[...ADMIN_BREADCRUMBS, { label: meta.title }]}
        >
          <Button variant="propley" onClick={handleAddRole}>
            <RiAddLine size={16} className="mr-2" /> Add Custom Role
          </Button>
        </PageHeader>

        <motion.div
          className="grid gap-5 md:grid-cols-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
        >
          {roles.map((role, i) => (
            <motion.article
              key={role.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              className="border border-stone-alt bg-ivory p-6 transition-colors hover:border-gold/30 flex flex-col justify-between"
            >
              <div>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-lg font-semibold text-ink">{role.label}</h2>
                      <span className="shrink-0 border border-stone-alt bg-stone px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">
                        {role.id.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-zinc-500 leading-relaxed">{role.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEditRole(role)}
                      className="p-1.5 text-zinc-400 hover:text-gold hover:bg-stone transition-all rounded-lg border border-transparent hover:border-stone-alt cursor-pointer"
                      title="Edit Role"
                    >
                      <RiEditLine size={16} />
                    </button>
                    {role.id !== 'super_admin' && (
                      <button
                        onClick={() => handleDeleteRole(role.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50/50 transition-all rounded-lg border border-transparent hover:border-red-100 cursor-pointer"
                        title="Delete Role"
                      >
                        <RiDeleteBinLine size={16} />
                      </button>
                    )}
                  </div>
                </div>
                <ul className="space-y-2 border-t border-stone-alt pt-4">
                  {role.permissions.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs font-medium text-zinc-600">
                      <RiCheckLine className="mt-0.5 shrink-0 text-gold" size={14} />
                      {p}
                    </li>
                  ))}
                  {role.permissions.length === 0 && (
                    <li className="text-xs text-zinc-400 font-medium italic">No permissions assigned.</li>
                  )}
                </ul>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} direction="right">
        <DrawerContent className="h-full rounded-lg border-s border-stone-alt bg-white sm:w-[500px] flex flex-col overflow-hidden">
          {/* FIXED HEADER */}
          <div className="p-8 border-b border-stone-alt flex items-start justify-between shrink-0">
            <div>
              <DrawerTitle className="text-lg font-semibold text-ink tracking-tight">
                {editingRole ? 'Edit Role Policy' : 'Create Custom Role'}
              </DrawerTitle>
              <p className="mt-1.5 text-xs font-medium text-zinc-500 max-w-sm leading-relaxed">
                Configure specific permissions for this user access tier.
              </p>
            </div>
            <DrawerClose className="p-1.5 text-zinc-400 hover:text-ink hover:bg-stone transition-all rounded-lg cursor-pointer">
              <RiCloseLine size={20} />
            </DrawerClose>
          </div>

          {/* SCROLLABLE FORM */}
          <form onSubmit={handleSubmit} id="role-policy-form" className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <RiShieldUserLine size={14} className="text-gold" />
                Role Title / Label
              </Label>
              <Input
                placeholder="e.g. Regional Manager"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                required
              />
            </div>

            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <RiFileList3Line size={14} className="text-gold" />
                Description
              </Label>
              <textarea
                className="w-full min-h-[80px] p-4 bg-transparent border-b border-stone-alt text-sm font-semibold placeholder:text-zinc-400 focus:border-gold outline-none transition-colors resize-none"
                placeholder="Brief summary of this role's purpose and tier level..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="space-y-4">
              <Label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Policy Permissions
              </Label>
              <div className="space-y-3">
                {PLATFORM_PERMISSIONS.map((perm) => {
                  const hasPerm = formData.permissions.includes(perm);
                  return (
                    <label
                      key={perm}
                      className="flex items-start gap-3 cursor-pointer p-3 border border-stone-alt hover:border-gold/30 bg-stone/30 select-none transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={hasPerm}
                        onChange={() => togglePermission(perm)}
                        className="mt-0.5 rounded-lg border-stone-alt text-gold focus:ring-gold"
                      />
                      <span className="text-xs font-medium text-zinc-700 leading-snug">{perm}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </form>

          {/* FIXED FOOTER */}
          <div className="p-8 border-t border-stone-alt bg-stone/20 flex gap-4 shrink-0">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1 rounded-lg py-6 text-xs font-semibold">
                Cancel
              </Button>
            </DrawerClose>
            <Button
              type="submit"
              form="role-policy-form"
              variant="propley"
              className="flex-1 rounded-lg py-6 text-xs font-semibold"
            >
              Save Policy
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </DashboardLayout>
  );
}
