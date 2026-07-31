export type AccessRole = 'super_admin' | 'admin' | 'advisor' | 'consultant';

export interface RoleDefinition {
  /** Built-in roles use `AccessRole` ids; custom policies use a slug from the label */
  id: string;
  label: string;
  description: string;
  permissions: string[];
}

export const ACCESS_ROLES: RoleDefinition[] = [
  {
    id: 'super_admin',
    label: 'Super Admin',
    description: 'Full platform control, team provisioning, and data governance.',
    permissions: [
      'Manage all team members',
      'Assign any role',
      'View and edit all clients',
      'Schedule and host all presentations',
      'Open settings',
      'Export data',
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Operations lead — manages consultants and portfolio data.',
    permissions: [
      'Add and edit team members',
      'Assign advisor and consultant roles',
      'View and edit all clients',
      'Schedule presentations for any advisor',
      'Open settings',
    ],
  },
  {
    id: 'advisor',
    label: 'Advisor',
    description: 'Primary sales member — hosts cinematic sessions.',
    permissions: [
      'Host live presentations',
      'Manage own clients',
      'Schedule own presentations',
      'View own presentation reports',
    ],
  },
  {
    id: 'consultant',
    label: 'Consultant',
    description: 'Supporting sales member — read-focused access.',
    permissions: [
      'View assigned clients',
      'Join presentations as support',
      'View schedules (read-only)',
    ],
  },
];

export function getRoleDefinition(role: AccessRole): RoleDefinition {
  return ACCESS_ROLES.find((r) => r.id === role) ?? ACCESS_ROLES[3];
}

export function getRoleLabel(role: AccessRole): string {
  return getRoleDefinition(role).label;
}

/** Sorted unique permission strings for role editor and permission matrix */
export const PLATFORM_PERMISSIONS = Array.from(
  new Set(ACCESS_ROLES.flatMap((r) => r.permissions))
).sort((a, b) => a.localeCompare(b));
