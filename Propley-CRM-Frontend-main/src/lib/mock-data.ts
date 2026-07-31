import type { AccessRole } from './roles';

// ——— Status & entity types ———

export type TeamMemberStatus = 'active' | 'invited' | 'suspended';
export type CustomerStatus = 'Active' | 'Pending' | 'Completed';
export type DealStage = 'inquiry' | 'vsv_scheduled' | 'vsv_done' | 'offer' | 'negotiation' | 'closed_won' | 'closed_lost';
export type MeetingStatus = 'Live' | 'Scheduled' | 'Completed' | 'Canceled';

/** Presentation row in meetings table; localStorage entries may omit registry ids */
export type StoredMeeting = {
  uuid: string;
  salesMember: string;
  property: string;
  category: string;
  client: string;
  date: string;
  time: string;
  status: MeetingStatus;
  id?: string;
  salesMemberId?: string;
  clientId?: string;
  transcript?: string | null;
  /** Raw participant count from the API (parsed from `client_count`). */
  clientCount?: number;
  /** Raw client name from schedule / meeting_for field. */
  clientName?: string;
};

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AccessRole;
  department: string;
  status: TeamMemberStatus;
  joinedAt: string;
  lastActive: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  lastMeeting: string;
  status: CustomerStatus;
  assignedAdvisorId: string;
  dealStage?: DealStage;
  leadSource?: string;
  createdAt?: string;
  updatedAt?: string;
  dealValue?: number;
  daysInStage?: number;
  followUpDate?: string;
}

export interface Meeting {
  id: string;
  salesMemberId: string;
  salesMember: string;
  property: string;
  category: string;
  client: string;
  clientId: string;
  status: MeetingStatus;
  date: string;
  time: string;
  uuid: string;
}

export interface Development {
  id: string;
  name: string;
  category: string;
  location: string;
  units: number;
  featured: boolean;
}

// ——— Seed data (India market) ———

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'tm-001',
    name: 'Priya Sharma',
    email: 'priya.sharma@propley.in',
    phone: '+91 98200 44102',
    role: 'super_admin',
    department: 'Executive — Mumbai',
    status: 'active',
    joinedAt: '8 January 2024',
    lastActive: 'Today, 09:42 AM',
  },
  {
    id: 'tm-002',
    name: 'Arjun Mehta',
    email: 'arjun.mehta@propley.in',
    phone: '+91 98102 88341',
    role: 'admin',
    department: 'Operations — Delhi NCR',
    status: 'active',
    joinedAt: '14 March 2024',
    lastActive: 'Today, 08:15 AM',
  },
  {
    id: 'tm-003',
    name: 'Ananya Reddy',
    email: 'ananya.reddy@propley.in',
    phone: '+91 98490 22108',
    role: 'advisor',
    department: 'Luxury Residential — Hyderabad',
    status: 'active',
    joinedAt: '2 June 2025',
    lastActive: 'Yesterday, 06:30 PM',
  },
  {
    id: 'tm-004',
    name: 'Vikram Singh',
    email: 'vikram.singh@propley.in',
    phone: '+91 98765 33019',
    role: 'advisor',
    department: 'Waterfront — Kochi',
    status: 'active',
    joinedAt: '19 August 2025',
    lastActive: '18 May 2026',
  },
  {
    id: 'tm-005',
    name: 'Kavya Nair',
    email: 'kavya.nair@propley.in',
    phone: '+91 98950 77612',
    role: 'consultant',
    department: 'Private Estates — Bengaluru',
    status: 'active',
    joinedAt: '3 November 2025',
    lastActive: '17 May 2026',
  },
  {
    id: 'tm-006',
    name: 'Rohit Kapoor',
    email: 'rohit.kapoor@propley.in',
    phone: '+91 98111 90224',
    role: 'consultant',
    department: 'Commercial — Ahmedabad',
    status: 'invited',
    joinedAt: '10 March 2026',
    lastActive: 'Pending acceptance',
  },
];

export const DEVELOPMENTS: Development[] = [
  {
    id: 'dev-001',
    name: 'Lodha World Towers',
    category: 'Ultra-luxury high-rise',
    location: 'Lower Parel, Mumbai',
    units: 145,
    featured: true,
  },
  {
    id: 'dev-002',
    name: 'Prestige Lakeside Habitat',
    category: 'Waterfront living',
    location: 'Bellandur, Bengaluru',
    units: 220,
    featured: true,
  },
  {
    id: 'dev-003',
    name: 'DLF Camellias',
    category: 'Golf-course estate',
    location: 'Gurugram, Haryana',
    units: 429,
    featured: true,
  },
  {
    id: 'dev-004',
    name: 'Sobha Waterfront',
    category: 'Marina residences',
    location: 'Marine Drive, Kochi',
    units: 86,
    featured: false,
  },
  {
    id: 'dev-005',
    name: 'Raheja Artesia',
    category: 'Sky villas',
    location: 'Powai, Mumbai',
    units: 52,
    featured: false,
  },
];

export const MEETINGS: Meeting[] = [];

// ——— Lookups ———

export function getTeamMemberById(id: string): TeamMember | undefined {
  return TEAM_MEMBERS.find((m) => m.id === id);
}

export function getDevelopmentById(id: string): Development | undefined {
  return DEVELOPMENTS.find((d) => d.id === id);
}

export function getDevelopmentByName(name: string): Development | undefined {
  const normalized = name.trim().toLowerCase();
  return DEVELOPMENTS.find((d) => d.name.toLowerCase() === normalized);
}

export function getAdvisorName(id: string): string {
  return getTeamMemberById(id)?.name ?? 'Unassigned';
}
