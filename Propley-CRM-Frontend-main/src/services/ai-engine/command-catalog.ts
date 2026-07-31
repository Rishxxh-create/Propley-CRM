/**
 * Command catalog for Gemini intent parsing (mirrors COMMAND_REGISTRY capabilities).
 */
export interface CommandCatalogEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  aliases: string[];
  args: Record<string, string>;
}

export const VOICE_COMMAND_CATALOG: CommandCatalogEntry[] = [
  {
    id: 'navigate',
    name: 'Navigate',
    category: 'navigation',
    description: 'Go to an app route',
    aliases: ['go to', 'open page', 'show'],
    args: {
      path:
        'Route: / (dashboard), /meetings (presentations registry), /meetings/new (schedule wizard), /meetings/calendar, /customers, /admin/team, /admin/roles, /admin/permissions, /settings/templates',
    },
  },
  {
    id: 'filter-meetings',
    name: 'Filter presentations',
    category: 'dashboard',
    description: 'Filter presentations list (meetings = presentations)',
    aliases: [
      'filter meetings',
      'show completed',
      'show completed meetings',
      'show live',
      'show live meetings',
      'show scheduled presentations',
      'completed meetings',
      'live presentations',
    ],
    args: {
      status: 'Live | Scheduled | Completed | Canceled',
      datePreset: 'today | week | month',
      project: 'development name e.g. Lodha World Towers',
      advisor: 'advisor full name',
    },
  },
  {
    id: 'launch-portal',
    name: 'Launch sales portal',
    category: 'session',
    description: 'Open moderator presentation session for a project',
    aliases: ['start presentation', 'enter sales portal'],
    args: { project: 'development / property name' },
  },
  {
    id: 'toggle-mic',
    name: 'Toggle microphone',
    category: 'session',
    description: 'Mute or unmute mic in moderator session',
    aliases: ['mute', 'unmute'],
    args: { enabled: 'true to unmute, false to mute' },
  },
  {
    id: 'toggle-cam',
    name: 'Toggle camera',
    category: 'session',
    description: 'Enable or disable camera in moderator session',
    aliases: ['turn camera on', 'turn camera off'],
    args: { enabled: 'true or false' },
  },
  {
    id: 'toggle-observers',
    name: 'Toggle observers panel',
    category: 'session',
    description: 'Show or hide client observer feeds',
    aliases: ['show team', 'hide visitors'],
    args: { enabled: 'true or false' },
  },
  {
    id: 'toggle-drawer',
    name: 'Toggle moderator drawer',
    category: 'session',
    description: 'Open analytics, script guide, or visitors drawer',
    aliases: ['open analytics', 'open script'],
    args: {
      drawer: 'analytics | script | visitors | null to close',
    },
  },
  {
    id: 'change-slide',
    name: 'Change slide',
    category: 'session',
    description: 'Navigate presentation slides in moderator',
    aliases: ['next slide', 'go to slide 4'],
    args: { slide: '01-10 padded, or next, or prev' },
  },
  {
    id: 'client-info',
    name: 'Client information',
    category: 'crm',
    description:
      'Look up client details in CRM; if several share a first name, ask user to pick full name then return full profile',
    aliases: [
      'tell me about',
      'tell me info',
      'give me more',
      'information about',
      'info on',
      'who is',
      'what do we know about',
      'client details',
    ],
    args: {
      client: 'partial or full client name e.g. Rahul, Rahul Verma',
      question: 'full user question for Gemini brief e.g. give me more information about Rahul Verma',
    },
  },
  {
    id: 'search-customer',
    name: 'Search client',
    category: 'crm',
    description: 'Find client in CRM and open profile',
    aliases: ['our client', 'open client', 'find client', 'client Rahul Burma'],
    args: { client: 'client full name e.g. Rahul Burma, Rahul Verma' },
  },
  {
    id: 'set-client-section',
    name: 'Client profile section',
    category: 'crm',
    description: 'Switch tab on client profile',
    aliases: ['show timeline', 'view notes'],
    args: {
      section: 'overview | activity | presentations | advisor | notes',
    },
  },
  {
    id: 'set-template-tab',
    name: 'Invite template tab',
    category: 'dashboard',
    description: 'Switch invite templates workspace tab',
    aliases: ['whatsapp templates', 'email templates'],
    args: {
      tab: 'invite-email | reschedule-email | whatsapp',
    },
  },
  {
    id: 'schedule-presentation',
    name: 'Schedule presentation',
    category: 'dashboard',
    description:
      'Create/schedule a new presentation (user may say meeting — same thing). Opens wizard; missing fields are collected via voice.',
    aliases: [
      'create a new meeting',
      'book presentation',
      'schedule meeting',
      'new presentation',
    ],
    args: {
      project: 'development name',
      client: 'client name',
      date: 'today | tomorrow | next-week | natural date',
      time: '24h HH:mm or spoken time like 4 PM',
    },
  },
  {
    id: 'add-customer',
    name: 'Add client to CRM',
    category: 'crm',
    description: 'Add or update a client in portfolio',
    aliases: ['create customer', 'new client', 'add lead'],
    args: {
      name: 'full name — required first if not provided',
      client: 'same as name',
      phone: 'phone number',
      email: 'email',
      city: 'city',
      leadSource: 'referral | google | website | walk-in etc',
    },
  },
];

export const ALLOWED_COMMAND_IDS = new Set(VOICE_COMMAND_CATALOG.map((c) => c.id));
