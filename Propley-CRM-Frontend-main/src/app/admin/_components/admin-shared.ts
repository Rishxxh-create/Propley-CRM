import type { AccessRole } from '@/lib/roles';
import type { TeamMember } from '@/lib/mock-data';

export const ROLE_STYLES: Record<AccessRole, string> = {
  super_admin: 'bg-ink text-white',
  admin: 'bg-gold/15 text-gold border border-gold/20',
  advisor: 'bg-stone text-ink border border-stone-alt',
  consultant: 'bg-stone/80 text-zinc-600 border border-stone-alt',
};

export const STATUS_STYLES: Record<TeamMember['status'], string> = {
  active: 'bg-gold/10 text-gold',
  invited: 'bg-stone text-zinc-500',
  suspended: 'bg-red-50 text-red-600 border border-red-100',
};

export const ADMIN_BREADCRUMBS = [
  { label: 'Administration', href: '/admin/team' },
];
