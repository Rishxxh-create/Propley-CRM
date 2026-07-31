'use client';

import { useMemo, useState } from 'react';
import {
  RiCloseLine,
  RiUser3Line,
  RiMailLine,
  RiPhoneLine,
  RiBuildingLine,
  RiShieldUserLine,
  RiArrowRightLine,
  RiCheckLine,
} from 'react-icons/ri';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { UniversalSelect } from '@/components/UniversalSelect';
import { ACCESS_ROLES, type AccessRole, type RoleDefinition } from '@/lib/roles';
import type { TeamMember, TeamMemberStatus } from '@/lib/mock-data';

export interface TeamMemberFormData {
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: AccessRole;
  department: string;
  status: TeamMemberStatus;
}

interface TeamMemberDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initialData?: TeamMember | null;
  onSave: (data: TeamMemberFormData) => void;
}

const EMPTY_FORM: TeamMemberFormData = {
  name: '',
  email: '',
  phone: '',
  role: 'consultant',
  department: '',
  status: 'invited',
};

const STATUS_OPTIONS: { value: TeamMemberStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'suspended', label: 'Suspended' },
];

function FormField({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <Label className="flex items-center gap-2">
        <Icon size={14} className="text-gold" />
        {label}
      </Label>
      {children}
    </div>
  );
}

function PermissionsPreview({ permissions }: { permissions: string[] }) {
  return (
    <div className="p-6 bg-stone border-l-2 border-gold/40 space-y-4">
      <h4 className="text-sm font-semibold text-ink">Role Permissions</h4>
      <ul className="space-y-2">
        {permissions.map((permission) => (
          <li key={permission} className="flex items-start gap-2 text-xs text-zinc-600 font-medium">
            <RiCheckLine size={14} className="text-gold shrink-0 mt-0.5" />
            {permission}
          </li>
        ))}
      </ul>
    </div>
  );
}

function readAvailableRoles(): RoleDefinition[] {
  if (typeof window === 'undefined') return ACCESS_ROLES;
  try {
    const saved = localStorage.getItem('propley_roles');
    if (saved) return JSON.parse(saved) as RoleDefinition[];
  } catch {
    // ignore
  }
  return ACCESS_ROLES;
}

function buildInitialForm(
  mode: 'add' | 'edit',
  initialData?: TeamMember | null
): TeamMemberFormData {
  if (mode === 'edit' && initialData) {
    return {
      id: initialData.id,
      name: initialData.name,
      email: initialData.email,
      phone: initialData.phone,
      role: initialData.role,
      department: initialData.department,
      status: initialData.status,
    };
  }
  return EMPTY_FORM;
}

function TeamMemberDrawerForm({
  mode,
  initialData,
  availableRoles,
  onSave,
  onClose,
}: {
  mode: 'add' | 'edit';
  initialData?: TeamMember | null;
  availableRoles: RoleDefinition[];
  onSave: (data: TeamMemberFormData) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<TeamMemberFormData>(() =>
    buildInitialForm(mode, initialData)
  );
  const [isSaving, setIsSaving] = useState(false);

  const selectedRole = availableRoles.find((r) => r.id === formData.role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    onSave(formData);
    setIsSaving(false);
    onClose();
  };

  return (
    <>
      <DrawerClose asChild>
        <button
          type="button"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center transition-colors text-zinc-400 hover:text-ink z-50 group"
        >
          <RiCloseLine size={24} className="group-hover:scale-110 transition-transform" />
        </button>
      </DrawerClose>

      <DrawerHeader className="p-8 pb-6 shrink-0">
          <DrawerTitle className="text-3xl font-semibold text-ink tracking-tight leading-[0.9]">
            {mode === 'add' ? 'Add Team Member' : 'Edit Access'}
          </DrawerTitle>
          <p className="text-zinc-500 text-xs font-medium mt-2">
            {mode === 'add'
              ? 'Invite a consultant or advisor and assign their platform role.'
              : 'Update role permissions and account status for this member.'}
          </p>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <form id="team-member-form" onSubmit={handleSubmit} className="p-8 py-1 space-y-10">
            <FormField icon={RiUser3Line} label="Full Name">
              <Input
                placeholder="Consultant or advisor name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </FormField>

            <FormField icon={RiMailLine} label="Work Email">
              <Input
                type="email"
                placeholder="name@propley.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </FormField>

            <FormField icon={RiPhoneLine} label="Phone">
              <Input
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </FormField>

            <FormField icon={RiBuildingLine} label="Department">
              <Input
                placeholder="e.g. Luxury Residential"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </FormField>

            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <RiShieldUserLine size={14} className="text-gold" />
                Access Role
              </Label>
              <UniversalSelect
                value={formData.role}
                onChange={(value) =>
                  setFormData({ ...formData, role: value as AccessRole })
                }
                options={availableRoles.map((role) => ({
                  id: role.id,
                  name: role.label,
                  subtitle: role.description,
                }))}
                placeholder="Select role"
                enableSearch={false}
              />
              {selectedRole && (
                <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                  {selectedRole.description}
                </p>
              )}
            </div>

            <FormField icon={RiShieldUserLine} label="Account Status">
              <UniversalSelect
                value={formData.status}
                onChange={(value) =>
                  setFormData({ ...formData, status: value as TeamMemberStatus })
                }
                options={STATUS_OPTIONS.map((opt) => ({
                  id: opt.value,
                  name: opt.label,
                }))}
                placeholder="Status"
                enableSearch={false}
              />
            </FormField>

            {selectedRole && <PermissionsPreview permissions={selectedRole.permissions} />}
          </form>
        </div>

      <footer className="p-8 py-4 bg-white border-t border-stone-alt shrink-0">
        <Button type="submit" form="team-member-form" variant="propley" className="w-full h-16 group" loading={isSaving}>
          {mode === 'add' ? 'Provision Access' : 'Save Access Role'}
          <RiArrowRightLine size={18} className="text-white group-hover:translate-x-1 transition-all" />
        </Button>
      </footer>
    </>
  );
}

export default function TeamMemberDrawer({
  isOpen,
  onClose,
  mode,
  initialData,
  onSave,
}: TeamMemberDrawerProps) {
  const availableRoles = useMemo(() => readAvailableRoles(), []);

  const formKey = mode === 'edit' ? (initialData?.id ?? 'edit') : 'add';

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent className="h-full rounded-lg border-s border-stone-alt bg-white flex flex-col w-full sm:w-[500px] outline-none">
        {isOpen ? (
          <TeamMemberDrawerForm
            key={formKey}
            mode={mode}
            initialData={initialData}
            availableRoles={availableRoles}
            onSave={onSave}
            onClose={onClose}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
