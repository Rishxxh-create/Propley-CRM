/**
 * User-facing copy for the sales portal.
 * Plain language for real estate advisors and consultants.
 */

export const APP = {
  name: "Propley",
  productLabel: "Sales CRM",
  statusOnline: "You are online",
  defaultPageTitle: "Sales portal",
  signOut: "Sign out",
  consultantRole: "Consultant",
  sidebarProfile: {
    total: "Presentations",
    portfolioViews: "Portfolio views",
    engagement: "Engagement",
  },
} as const;

export const NAV = {
  sections: {
    sales: "Sales",
    portfolio: "Clients",
    reports: "Reports",
    admin: "Settings",
    quickActions: "Shortcuts",
  },
  items: {
    dashboard: "Dashboard",
    presentations: "Presentations",
    customers: "Customers",
    accessControl: "Team access",
    teamMembers: "Team",
    roles: "Roles",
    permissions: "Access overview",
    schedulePresentation: "Schedule presentation",
    calendar: "Calendar",
    templates: "Invite templates",
    pipeline: "Pipeline",
    advisorsReport: "Advisors",
    meetingsReport: "Meetings",
    analytics: "Analytics",
    activitiesReport: "Activities Log",
  },
} as const;

export const PAGE = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Welcome back. Here is your sales activity today.",
    advisorSubtitle: (name: string) =>
      `Good morning, ${name}. Here is your pipeline today.`,
    stats: {
      activePresentations: "Live presentations",
      totalCustomers: "Clients",
      featuredProjects: "Featured projects",
      conversionRate: "Close rate",
      todayPresentations: "Presentations today",
      myClients: "My clients",
      myConversion: "My close rate",
    },
    upcoming: "Upcoming presentations",
    myToday: "My presentations today",
    myClients: "My clients",
    viewAll: "View all",
    viewClients: "View clients",
    newPresentation: {
      title: "New presentation",
      description: "Schedule a live property tour for your client.",
      cta: "Schedule presentation",
    },
    table: {
      project: "Project",
      client: "Client",
      status: "Status",
    },
    advisorSwitcher: "Viewing as",
    liveStream: {
      title: "Live session activity",
      loading: "Loading live activity…",
      empty: "No recent session events.",
      project: "Presentation",
    },
  },
  presentations: {
    title: "Presentations",
    subtitle: "View, share, and manage your client property tours.",
    cmsLabel: "Sales CMS",
    newCta: "New presentation",
    registryCount: (n: number) => `${n} in registry`,
    columns: {
      status: "Status",
      advisor: "Advisor",
      project: "Meeting For",
      client: "Client",
      accessShare: "Join & share",
      scheduled: "Date & time",
      actions: "Actions",
    },
    salesPortal: "Advisor view",
    copyClientLink: "Copy client link",
    portalLocked: "Canceled",
    shareInvite: "Share invite",
    unavailable: "Unavailable",
    reschedule: {
      title: "Reschedule presentation",
      project: "Project",
      date: "New date",
      time: "New time",
      notifyTitle: "Notify client",
      email: "Send updated email",
      whatsapp: "Send updated WhatsApp message",
      submit: "Update schedule",
    },
    cancel: {
      title: "Cancel presentation?",
      description:
        "The client will not be able to join. You can schedule a new presentation later.",
      keep: "Keep presentation",
      confirm: "Cancel presentation",
    },
    empty: {
      title: "No presentations yet",
      description: "Schedule your first property tour to get started.",
      filtered: "No results match your filters",
      filteredHint: "Try clearing filters or adjusting the date range.",
      clearFilters: "Clear filters",
    },
    filters: {
      open: "Filters",
      drawerTitle: "Filter presentations",
      drawerHint: "Narrow the registry by status, advisor, project, or date.",
      apply: "Apply filters",
      activeLabel: "Active filters",
      status: "Status",
      advisor: "Advisor",
      project: "Project",
      date: "Date",
      all: "All",
      today: "Today",
      week: "This week",
      month: "This month",
    },
    viewTable: "Table",
    viewCalendar: "Calendar",
    bulk: {
      mode: "Bulk select",
      done: "Done",
      hint: "Select one or more rows in the table below to enable actions.",
      selected: (n: number) => `${n} selected`,
      reschedule: "Reschedule selected",
      cancel: "Cancel selected",
      export: "Export CSV",
      confirmCancel: "Cancel selected presentations?",
    },
  },
  calendar: {
    title: "Presentation calendar",
    subtitle: "See scheduled tours by day and week.",
    today: "Today",
    views: {
      month: "Month",
      week: "Week",
      day: "Day",
    },
    dayList: "Presentations on this day",
    none: "No presentations on this day",
  },
  schedule: {
    title: "Schedule presentation",
    description:
      "Choose the project, client, and how you want to send the invite.",
    breadcrumbs: { list: "Presentations", current: "Schedule" },
    steps: {
      setup: { label: "Details", description: "Project, client, and time" },
      email: { label: "Email", description: "Invitation email" },
      whatsapp: { label: "WhatsApp", description: "Text message" },
    },
    sections: {
      target: "Presentation details",
      targetHint: "Select the project, client, and session time.",
      notifications: "Send invites",
    },
    fields: {
      project: "Project",
      clientType: "Client type",
      existingClient: "Existing client",
      newClient: "New client",
      client: "Client",
      name: "Full name",
      phone: "Phone",
      email: "Email",
      city: "City",
      leadSource: "How they found you",
      date: "Presentation date",
      time: "Time",
    },
    placeholders: {
      project: "e.g. The Ivory Pavilion",
      name: "Client full name",
      phone: "+1 555 000 0000",
      email: "client@email.com",
      city: "e.g. New York",
      leadSource: "Select source",
      date: "Pick a date",
    },
    footer: {
      step1: "Step 1 of 3",
      step2: "Step 2 of 3",
      step3: "Step 3 of 3",
      continueEmail: "Continue to email",
      continueWhatsapp: "Continue to WhatsApp",
      schedule: "Schedule & finish",
    },
    summary: {
      title: "Summary",
      project: "Project",
      client: "Client",
      channels: "Invites",
      emailOn: "Email invitation",
      whatsappOn: "WhatsApp message",
      untitledProject: "No project selected",
      newProspect: "New client",
    },
  },
  customers: {
    title: "Clients",
    subtitle: "Manage your buyers and prospects in one place.",
    search: "Search clients…",
    addCta: "Add client",
    columns: {
      identity: 'Name',
      contact: 'Contact',
      location: 'City',
      leadSource: 'Lead source',
      lastEngagement: 'Last presentation',
      stage: 'Pipeline stage',
      actions: 'Actions',
    },
    addDrawer: {
      placeholders: {
        name: 'Full name',
        email: 'client@email.com',
        phone: '98XXX XXXXX',
        city: 'e.g. Mumbai',
        leadSource: 'How did they find you?',
        advisor: 'Select assigned advisor',
        notes: 'Preferences, budget, or first-call notes…',
      },
      registerCta: 'Register client',
    },
    empty: {
      title: "No clients found",
      description: "Add a client or adjust your search.",
    },
    profile: {
      title: 'Client profile',
      back: 'Back to clients',
      assignedAdvisor: 'Assigned advisor',
      leadSource: 'Lead source',
      leadSourceEmpty: 'Not recorded',
      editCta: 'Edit client profile',
      editSubtitle: 'Update contact details, lead source, and assigned advisor.',
      saveProfile: 'Save changes',
      advisorInfo: {
        title: "How this works",
        what: "The consultant who owns this client relationship—follow-ups, presentations, and CRM visibility are tied to them.",
        onSave:
          "Saving updates this profile immediately. The name appears in the clients list, profile context, and when scheduling new presentations.",
      },
      saveAdvisor: "Save advisor",
      nextPresentation: "Next presentation",
      nextPresentationInfo: {
        title: "About this session",
        what: "The nearest scheduled or live presentation for this client from your presentations registry.",
        action:
          "Use advisor view to host the sales portal for a live or upcoming session. If nothing is booked, schedule a new presentation instead.",
      },
      noNext: "No upcoming presentation",
      scheduleCta: "Schedule presentation",
      history: "Presentation history",
      noHistory: "No presentations yet for this client.",
      notes: "Advisor notes",
      notesPlaceholder: "Add a note about preferences, budget, or follow-up…",
      notesInfo: {
        title: "How this works",
        what: "Internal notes for your sales team—preferences, budget, follow-ups. Clients never see these.",
        onSave:
          "Saving adds the note to this profile immediately. It appears below and on the activity timeline for your team.",
      },
      notesEmpty:
        "No notes yet. Add context your team should see on the next touchpoint.",
      notesHistory: (n: number) =>
        n === 0 ? "Saved notes" : `${n} saved note${n === 1 ? "" : "s"}`,
      addNote: "Save note",
      timeline: "Activity timeline",
      timelineEmpty: "No activity recorded for this client yet.",
      currentStage: "Current pipeline stage",
      viewAnalysis: "View session analysis",
      enterPortal: "Enter sales portal",
      viewPresentation: "View in registry",
      pipeline: "Deal pipeline",
      pipelineInfo: {
        title: "How this works",
        what: "Tracks where this client sits in your sales journey—from first inquiry through tour, offer, and close. Only your team sees this on the client profile and CRM.",
        onChange:
          "Tap a stage to update it. The change saves to this profile right away, updates the pipeline badge on the clients list and profile header, and shows a confirmation. Move the stage when something meaningful happens (e.g. after a tour or when an offer is made)—you can set an earlier stage again if needed.",
      },
      exportSummary: "Export client summary",
      notFound: "Client not found",
      navMenu: "Profile sections",
      contextTitle: "Client context",
      presentationsCount: (n: number) =>
        `${n} presentation${n === 1 ? "" : "s"} on record`,
      sections: {
        overview: "Overview",
        activity: "Activity timeline",
        presentations: "Presentations",
        advisor: "Advisor & scheduling",
        notes: "Advisor notes",
      },
      sectionBlurb: {
        overview: "Contact details, pipeline stage, and quick actions.",
        activity: "Chronological log of presentations and advisor notes.",
        presentations: "Full registry of sessions for this client.",
        advisor: "Assigned consultant and next scheduled tour.",
        notes: "Internal notes visible to your sales team only.",
      },
    },
    dealStages: {
      inquiry: "Inquiry",
      vsv_scheduled: "Virtual Site Visit Scheduled",
      vsv_done: "Virtual Site Visit Done",
      offer: "Offer",
      negotiation: "Negotiation",
      closed_won: "Closed - Won",
      closed_lost: 'Closed - Lost',
    },
  },
  templates: {
    title: "Invite templates",
    subtitle:
      "Save invitation, reschedule, and WhatsApp messages per development project.",
    project: "Project",
    save: "Save templates",
    saved: "Templates saved for this project.",
    tabs: {
      inviteEmail: "Invitation email",
      rescheduleEmail: "Reschedule email",
      whatsapp: "WhatsApp",
    },
    info: {
      title: "How templates are used",
      body: "Invitation email is sent when scheduling a presentation. Reschedule email is offered after you change the date or time. WhatsApp uses the same merge fields as invitations.",
    },
    inviteEmailEditor: {
      title: "Email invitation copy",
      description:
        "Compose the invitation in plain language. Fields update the live preview — no HTML required. Clients receive calendar links when email is enabled.",
    },
    rescheduleEmailEditor: {
      title: "Reschedule email copy",
      description:
        "Sent after a session date or time changes. Highlight the new schedule and keep the join link. Calendar attachments use the updated session from your CRM.",
    },
  },
  resend: {
    title: "Resend invite",
    rescheduleTitle: "Send updated invitation",
    description:
      "Send the email or WhatsApp invite again for this presentation.",
    rescheduleDescription:
      "The presentation was rescheduled. Review the updated email before notifying the client.",
    notFound: "Presentation not found",
    calendar: "Add to calendar",
    submitRescheduleEmail: "Send reschedule email",
  },
  postAnalysis: {
    title: "After the presentation",
    subtitle:
      "Review notes, recording, and how the client engaged with each slide.",
    back: "Back to presentations",
    menu: "Sections",
    labels: {
      project: "Project",
      client: "Client",
      date: "Date & time",
      advisor: "Advisor",
    },
    tabs: {
      notes: "Summary & notes",
      transcript: "Call transcript",
      heatmaps: "Slide engagement",
      recordings: "Recordings",
      profiling: "Client background",
    },
    export: "Download summary",
    clarity: "Open slide analytics",
  },
  auth: {
    loginTitle: "Sign in",
    registerTitle: "Create account",
    loginDescription: "Sign in to manage presentations and clients.",
    registerDescription: "Join your team to host live property presentations.",
    becomeConsultant: "New consultant? Register",
    backToLogin: "Already have an account? Sign in",
    enter: "Sign in",
    register: "Create account",
    placeholders: {
      name: "Full name",
      email: "Work email",
      password: "Password",
    },
    remember: "Stay signed in",
  },
} as const;

export const ADMIN_COPY = {
  team: {
    title: "Team",
    description: "Add advisors and consultants, and set who can access what.",
    search: "Search team…",
    add: "Add team member",
    stats: {
      total: "Team members",
      active: "Active",
      invited: "Invited",
      advisors: "Advisors",
    },
  },
  roles: {
    title: "Roles",
    description: "Define what each role can do on the platform.",
    add: "Add role",
    edit: "Edit role",
    delete: "Delete role",
    drawerCreate: "New role",
    drawerEdit: "Edit role",
    permissions: "What this role can do",
    save: "Save role",
  },
  permissions: {
    title: "Access overview",
    description: "See which permissions each role includes.",
    granted: "Included",
  },
} as const;

export const SESSION = {
  moderator: {
    shareLink: "Share client link",
    analytics: "Engagement",
    visitors: "Attendees",
    script: "Talking points",
    endSession: "End presentation",
    endConfirm: {
      title: "End presentation?",
      description:
        "Clients will leave the tour. You can start another session anytime.",
      stay: "Keep presenting",
      leave: "End presentation",
    },
    drawers: {
      analyticsTitle: "Engagement",
      analyticsDescription: "See how clients interact during the tour.",
      visitorsTitle: "Attendees",
      visitorsDescription: "Who is in the room right now.",
    },
    guide: {
      perspective: "Current view",
      narrative: "Talking points",
      insights: "Tips",
    },
    observer: {
      advisor: "You (advisor)",
      clients: "Clients in room",
      live: "Live",
      viewing: "Viewing slide",
    },
    slides: "Choose slide",
  },
  participant: {
    entryTitle: "You are invited",
    name: "Your name",
    phone: "Mobile number",
    join: "Join presentation",
    terms: "By joining, you agree to our terms for private property viewings.",
    walkthrough: "Property tour",
    mute: "Mute",
    unmute: "Unmute",
    cameraOff: "Turn camera off",
    cameraOn: "Turn camera on",
    presence: "Show me on screen",
    leave: "Leave",
  },
} as const;

export const ACTIONS = {
  enterPortal: "Start presentation",
  copyClientLink: "Copy client link",
  shareWhatsapp: "Share on WhatsApp",
  resendWhatsapp: "Resend on WhatsApp",
  resendEmail: "Resend email",
  updateTranscript: "Update transcribe",
  addTranscript: "Add",
  postAnalysis: "After-presentation summary",
  sessionAnalytics: "Engagement report",
  reschedule: "Reschedule",
  cancel: "Cancel presentation",
  menuSections: {
    session: "Presentation",
    notifications: "Invites",
    intelligence: "Follow-up",
    manage: "Manage",
  },
  meetingActivityLog: "Activity Meeting Logs",
} as const;

export const TOAST = {
  copied: 'Link copied to clipboard.',
  presentationSaved: 'Presentation updated successfully.',
  presentationScheduled: 'Presentation scheduled successfully.',
  presentationCanceled: 'Presentation canceled.',
  presentationRescheduled: 'Presentation rescheduled.',
  customerAdded: 'Client added to your roster.',
  customerUpdated: 'Client profile updated.',
  dealStageUpdated: (stage: string) => `Pipeline stage updated to ${stage}.`,
  advisorAssigned: (name: string) => `Assigned advisor updated to ${name}.`,
  clientNoteSaved: "Note saved to this client profile.",
  emailResent: (name: string) => `Invitation email resent to ${name}.`,
  transcriptUpdated: "Meeting transcript saved.",
  inviteResent: (name: string, channel: string) =>
    `Invitation resent to ${name} via ${channel}.`,
  bulkCanceled: (n: number) =>
    `${n} presentation${n === 1 ? "" : "s"} canceled.`,
  bulkRescheduled: (n: number) =>
    `${n} presentation${n === 1 ? "" : "s"} rescheduled.`,
  exported: "Summary exported successfully.",
} as const;

/** Voice Engine — “Try saying” chips (must match supported commands) */
export const VOICE_ENGINE = {
  trySaying: [
    'Open the presentations list',
    'Show scheduled presentations',
    'Open the customer list',
    'Open the presentation calendar',
    'Go to the dashboard',
    'Show completed presentations',
    'Show live presentations',
    'Schedule a presentation tomorrow at 4 PM',
    'Create a new client',
    'Tell me about Rahul Verma',
    'Give me information about Rahul',
    'Our client Rahul Burma',
    'Add client Rahul Verma',
  ],
} as const;

export const PAGE_TITLES: Record<string, string> = {
  "/": PAGE.dashboard.title,
  "/meetings": PAGE.presentations.title,
  "/meetings/calendar": PAGE.calendar.title,
  "/meetings/new": PAGE.schedule.title,
  "/customers": PAGE.customers.title,
  "/settings/templates": PAGE.templates.title,
  "/admin/team": ADMIN_COPY.team.title,
  "/admin/roles": ADMIN_COPY.roles.title,
  "/admin/permissions": ADMIN_COPY.permissions.title,
};

export function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.includes("/post-analysis")) return PAGE.postAnalysis.title;
  if (pathname.includes("/resend")) return PAGE.resend.title;
  if (pathname.match(/^\/customers\/[^/]+$/))
    return PAGE.customers.profile.title;
  if (pathname.startsWith("/meetings/")) return PAGE.presentations.title;
  return APP.defaultPageTitle;
}
