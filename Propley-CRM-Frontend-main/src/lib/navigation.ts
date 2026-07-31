import {
  RiDashboard3Line,
  RiCalendarEventLine,
  RiGroupLine,
  RiShieldUserLine,
  RiAddLine,
  RiKanbanView,
  RiBarChart2Line,
} from 'react-icons/ri';
import type { IconType } from 'react-icons';
import { ADMIN_COPY, NAV } from '@/lib/copy';

export interface NavLink {
  label: string;
  href: string;
  badge?: string;
  comingSoon?: boolean;
}

export interface NavItem {
  id: string;
  label: string;
  icon: IconType;
  href?: string;
  children?: NavLink[];
  action?: 'new-meeting';
}

export interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export const CRM_NAV: NavSection[] = [
    {
    id: 'operations',
    title: NAV.sections.quickActions,
    items: [
      {
        id: 'new-meeting',
        label: NAV.items.schedulePresentation,
        icon: RiAddLine,
        action: 'new-meeting',
      },
    ],
  },
  {
    id: 'sales',
    title: NAV.sections.sales,
    items: [
      { id: 'dashboard', label: NAV.items.dashboard, href: '/', icon: RiDashboard3Line },
      { id: 'meetings', label: NAV.items.presentations, href: '/meetings', icon: RiCalendarEventLine },
      { id: 'calendar', label: NAV.items.calendar, href: '/meetings/calendar', icon: RiCalendarEventLine },
      { id: 'pipeline', label: NAV.items.pipeline, href: '/pipeline', icon: RiKanbanView },
    ],
  },
  {
    id: 'portfolio',
    title: NAV.sections.portfolio,
    items: [
      { id: 'customers', label: NAV.items.customers, href: '/customers', icon: RiGroupLine },
    ],
  },
  {
    id: 'reports',
    title: NAV.sections.reports,
    items: [
      {
        id: 'analytics',
        label: NAV.items.analytics,
        icon: RiBarChart2Line,
        children: [
          { label: NAV.items.advisorsReport, href: '/reports/advisors' },
          { label: NAV.items.activitiesReport, href: '/reports/activities' },
        ],
      },
    ],
  },
  {
    id: 'admin',
    title: NAV.sections.admin,
    items: [
      {
        id: 'access-control',
        label: NAV.items.accessControl,
        icon: RiShieldUserLine,
        children: [
          { label: NAV.items.teamMembers, href: '/admin/team', comingSoon: true },
          { label: NAV.items.roles, href: '/admin/roles', comingSoon: true },
          { label: NAV.items.permissions, href: '/admin/permissions', comingSoon: true },
          { label: NAV.items.templates, href: '/settings/templates', comingSoon: true },
        ],
      },
    ],
  },

];

export const ADMIN_ROUTE_META: Record<string, { title: string; description: string }> = {
  '/admin/team': {
    title: ADMIN_COPY.team.title,
    description: ADMIN_COPY.team.description,
  },
  '/admin/roles': {
    title: ADMIN_COPY.roles.title,
    description: ADMIN_COPY.roles.description,
  },
  '/admin/permissions': {
    title: ADMIN_COPY.permissions.title,
    description: ADMIN_COPY.permissions.description,
  },
};
