export type AgentToolKind = "read" | "action" | "handoff";

export interface AgentToolParam {
  type: "string" | "number" | "boolean";
  description: string;
  enum?: string[];
}

export interface AgentToolSpec {
  name: string;
  kind: AgentToolKind;
  description: string;
  parameters: Record<string, AgentToolParam>;
  required?: string[];

  commandId?: string;

  handoff?: "schedule" | "add-customer" | "client-brief";
}

export const AGENT_TOOLS: AgentToolSpec[] = [

  {
    name: "get_client",
    kind: "read",
    description:
      "Look up ONE named client as a PERSON: their deal stage, status, city, phone, email. USE THIS for 'what stage is Rahul in', 'is Sofia active', 'what's Rahul's number', 'which city is Jenal in'. It returns the person, NOT their schedule — for anything about WHEN a presentation is, or WHO is running it, call list_meetings instead. Always look up rather than answering from memory; the match is phonetic, so call it even if the name sounds misheard.",
    parameters: {
      name: { type: "string", description: "Client full or partial name, e.g. 'Rahul Verma' or 'Rahul'." },
    },
    required: ["name"],
  },
  {
    name: "list_meetings",
    kind: "read",
    description:
      "The advisor's presentations. Returns the count by status AND the actual rows — each with its client, project, ADVISOR running it, date, time and status. USE THIS for anything about meetings: how many they have, what's scheduled or coming up, 'what do we see here', AND for a specific client's presentation — 'when is Rahul's viewing?', 'who's running Sofia's?', 'is Rahul's still on?'. Pass `client` to SEARCH every presentation by client or project name — this is the ONLY way to reach a row that is not among the few visible on screen, and it searches all of them, so use it instead of scrolling to hunt for someone. Never state a meeting count, date or advisor without calling this.",
    parameters: {
      status: {
        type: "string",
        description: "Optional status filter.",
        enum: ["Live", "Scheduled", "Completed", "Canceled", "all"],
      },
      client: {
        type: "string",
        description:
          "Search all presentations by client or project name, e.g. 'Tapaswin' or 'Lodha'. Matching is phonetic, so pass it even if the name may have been misheard.",
      },
    },
  },
  {
    name: "list_clients",
    kind: "read",
    description:
      "The advisor's clients, BY NAME, with each one's deal stage, city and status. USE THIS when they ask WHO their clients are and want an ANSWER: 'name them', 'who are my clients', 'who's in inquiry', 'who have I got', 'read them out'. dashboard_summary only counts them — it cannot name them, and answering 'I can't list their names' when they asked for exactly that is a failure. If instead they want to SEE the page — 'show me my clients', 'take me to my clients', 'open my portfolio' — that is navigate to /customers, not this. Pass `stage` to narrow it.",
    parameters: {
      stage: {
        type: "string",
        description: "Optional deal-stage filter.",
        enum: ["inquiry", "vsv_scheduled", "vsv_done", "offer", "negotiation", "closed_won", "closed_lost", "all"],
      },
    },
  },
  {
    name: "dashboard_summary",
    kind: "read",
    description:
      "Top-level numbers: total/active/completed presentations, total clients, and how many clients sit in each deal stage. USE THIS for broad performance questions: 'how am I doing', 'how's my pipeline', 'give me a summary', 'how many clients do I have'. It returns NUMBERS only — to MOVE to a page use navigate instead.",
    parameters: {},
  },

  {
    name: "navigate",
    kind: "action",
    commandId: "navigate",
    description:
      "Move the advisor to a page. USE THIS for any instruction to go, open, show, pull up, take me to, or see a page. Match their words to a route: dashboard/overview/home = /, presentations/meetings = /meetings, calendar/diary/'my schedule'/'my week'/'my month'/'what's my week look like' = /meetings/calendar, clients/customers/portfolio/'book of business' = /customers, pipeline/funnel/stages = /pipeline, team/advisors = /admin/team, roles = /admin/roles, permissions = /admin/permissions, templates = /settings/templates, presentation/meeting reports = /reports/meetings, ADVISOR reports = /reports/advisors, activity reports = /reports/activities. DO NOT call this if you cannot tell which page they mean, or if the instruction is cut off ('go to') — ask them instead. DO NOT call this for questions ABOUT a page.",
    parameters: {
      path: {
        type: "string",
        description:
          "Exact route, e.g. /meetings/calendar. Must be one of the routes listed in the description.",
      },
    },
    required: ["path"],
  },
  {
    name: "scroll",
    kind: "action",
    commandId: "scroll",
    description:
      "Move their view on the page they are already on. CALL THIS EVERY TIME they ask you to move: scroll down, scroll up, go to the top, go to the bottom, show me more, keep going, a bit further. It always works. Never say you have scrolled without calling it, and never say you cannot scroll. It does NOT change page — use navigate for that. To FIND a record you cannot see, search list_meetings; scrolling shows you nothing new.",
    parameters: {
      direction: {
        type: "string",
        description: "Where to scroll.",
        enum: ["down", "up", "top", "bottom"],
      },
      amount: {
        type: "string",
        description:
          "How far, for direction up/down. 'page' scrolls a full viewport, 'little' scrolls a short distance. Defaults to page.",
        enum: ["page", "little"],
      },
    },
    required: ["direction"],
  },
  {
    name: "filter_meetings",
    kind: "action",
    commandId: "filter-meetings",
    description:
      "Open the presentations list filtered by status/advisor/project/date preset. It returns the rows that matched, so use it when they want to SEE a subset and also want to know which ones those are — 'show me the live ones', 'filter to Rohit's'.",
    parameters: {
      status: { type: "string", description: "Status filter (Live/Scheduled/Completed/Canceled/all)." },
      advisor: { type: "string", description: "Advisor name filter." },
      project: { type: "string", description: "Project/development name filter." },
    },
  },
  {
    name: "launch_portal",
    kind: "action",
    commandId: "launch-portal",
    description: "Launch the moderator presentation portal for a project.",
    parameters: { project: { type: "string", description: "Project/development name." } },
  },
  {
    name: "set_client_section",
    kind: "action",
    commandId: "set-client-section",
    description: "Switch the active section on an open client profile.",
    parameters: {
      section: {
        type: "string",
        description: "Profile section.",
        enum: ["overview", "activity", "presentations", "advisor", "notes"],
      },
    },
    required: ["section"],
  },

  {
    name: "cancel_presentation",
    kind: "action",
    commandId: "cancel-presentation",
    description:
      "Cancel a client's presentation. USE THIS for: cancel/drop/call off/scrap Rahul's meeting, 'Rahul can't make it', 'he's pulled out'. IT DOES NOT CANCEL ANYTHING YET — it returns a summary you must read back as a question and get a spoken yes for, and only THEN call confirm_action. Never call confirm_action in the same turn.",
    parameters: {
      client: { type: "string", description: "Client name whose presentation to cancel." },
      date: { type: "string", description: "Optional date to disambiguate, e.g. '12 July'." },
    },
    required: ["client"],
  },
  {
    name: "reschedule_presentation",
    kind: "action",
    commandId: "reschedule-presentation",
    description:
      "Move a client's presentation to a new date/time. USE THIS for: reschedule, move, push, shift, bump, 'make it Friday instead'. Resolve relative times ('tomorrow at 4', 'next Monday') into an ISO date yourself. IT DOES NOT MOVE ANYTHING YET — read the returned summary back as a question, get a spoken yes, and only then call confirm_action.",
    parameters: {
      client: { type: "string", description: "Client name whose presentation to move." },
      start_time: {
        type: "string",
        description:
          "New date and time as an ISO 8601 string, e.g. 2026-07-15T15:00:00. Resolve relative words like 'tomorrow at 3' yourself.",
      },
    },
    required: ["client", "start_time"],
  },
  {
    name: "set_deal_stage",
    kind: "action",
    commandId: "set-deal-stage",
    description:
      "Change a client's deal stage. USE THIS for: 'mark Jenal as closed won', 'they signed', 'we won it', 'we lost that one', 'move Rahul to negotiation', 'she's made an offer'. IT DOES NOT APPLY YET — read the summary back as a question, get a spoken yes, then call confirm_action.",
    parameters: {
      client: { type: "string", description: "Client name." },
      stage: {
        type: "string",
        description: "Target deal stage.",
        enum: [
          "inquiry",
          "vsv_scheduled",
          "vsv_done",
          "offer",
          "negotiation",
          "closed_won",
          "closed_lost",
        ],
      },
    },
    required: ["client", "stage"],
  },
  {
    name: "confirm_action",
    kind: "action",
    commandId: "confirm-action",
    description:
      "Apply or discard the change you already read back to them. Call with confirm true ONLY after they clearly said yes/go ahead/do it, and confirm false if they said no/leave it. NEVER call this in the same turn you staged a change, and NEVER call it if you have not read a summary back and heard an answer.",
    parameters: {
      confirm: {
        type: "boolean",
        description: "true if the advisor confirmed, false if they declined.",
      },
    },
    required: ["confirm"],
  },
  {
    name: "add_client_note",
    kind: "action",
    commandId: "add-client-note",
    description:
      "Save a note on a client's profile. USE THIS for: 'note that...', 'jot down...', 'remember that Sofia wants a lower floor', 'add a note on Rahul'. Applies immediately, no confirmation needed.",
    parameters: {
      client: { type: "string", description: "Client name." },
      note: { type: "string", description: "The note text to save." },
    },
    required: ["client", "note"],
  },

  {
    name: "schedule_presentation",
    kind: "action",
    commandId: "schedule-presentation",
    description:
      "Book a presentation. USE THIS for: schedule/book/set up/arrange a presentation, meeting or viewing. You need FOUR things — the client, the project, the date and the time. Ask the advisor for whatever they have not told you, one short question at a time, in their own language. NEVER invent any of them. Call this only once you have all four; it books NOTHING yet — it reads the booking back as a question, and you wait for a spoken yes before calling confirm_action. The phone and email are pulled from the CRM automatically, so never ask for them.",
    parameters: {
      client: { type: "string", description: "Client name. Required." },
      project: { type: "string", description: "Development/project name. Required." },
      date: { type: "string", description: "Date, e.g. 'tomorrow', '14 July'. Required." },
      time: { type: "string", description: "Time, e.g. '3 PM', '10:00'. Required." },
    },
    required: ["client", "project", "date", "time"],
  },
  {
    name: "add_customer",
    kind: "action",
    commandId: "add-customer",
    description:
      "Add a client to the portfolio. USE THIS for: add a customer/client/lead, 'new lead', 'put someone on my books'. The NAME is the only thing you need — ask for it if they have not said it. Phone, email and city are OPTIONAL: offer to take them, but if the advisor does not have them or wants to skip, go ahead without. Never demand a phone number. It saves NOTHING yet — it reads the change back as a question, and you wait for a spoken yes before calling confirm_action.",
    parameters: {
      name: { type: "string", description: "Client full name." },
      email: { type: "string", description: "Email if given." },
      phone: { type: "string", description: "Phone if given." },
      city: { type: "string", description: "City if given." },
    },
  },
  {
    name: "client_brief",
    kind: "handoff",
    handoff: "client-brief",
    description:
      "Open a client's profile and read out a full brief on them. USE THIS when they want depth on one person: 'tell me about Rahul', 'brief me on Sofia', 'open Jenal's profile', 'walk me through number two'. For a single fact (just their stage, just their city) use get_client instead — this one navigates.",
    parameters: { client: { type: "string", description: "Client full or partial name." } },
    required: ["client"],
  },
];

const TOOLS_BY_NAME = new Map(AGENT_TOOLS.map((t) => [t.name, t]));

export function getToolSpec(name: string): AgentToolSpec | undefined {
  return TOOLS_BY_NAME.get(name);
}

export function isHandoffTool(name: string): boolean {
  return getToolSpec(name)?.kind === "handoff";
}
