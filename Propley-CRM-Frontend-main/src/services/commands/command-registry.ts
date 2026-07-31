import type { CommandDefinition, CommandArgs } from '@/types/voice-agent';
import { useVoiceAgentStore } from '@/store/voice-agent-store';
import { readPresentations, addPresentation } from '@/lib/presentations-store';
import { scheduleMeeting } from '@/lib/api/scheduling';
import {
  readCustomers,
  addCustomer,
  updateCustomer,
  findCustomerByName,
  findCustomerByEmail,
  findCustomersByNameQuery,
  getCustomerByIdFromStore,
} from '@/lib/customers-store';
import { resolveLeadSourceId } from '@/lib/lead-source-options';
import { formatStoredPresentationDate } from '@/lib/date-format';
import { formatSessionTime } from '@/lib/presentation-templates';
import { getCurrentAdvisorId } from '@/lib/current-advisor';
import { TEAM_MEMBERS } from '@/lib/mock-data';
import { emitCobrowse } from '@/lib/cobrowse';
import {
  resolveAddCustomerName,
  resolveClientName,
  resolveProjectName,
  resolveScheduleDate,
} from '@/services/ai-engine/voice-agent-flow';
import { toast } from '@/lib/toast';
import {
  resolveClientLookup,
  formatDisambiguationPrompt,
  getClientDetailsMessage,
} from '@/lib/client-voice-lookup';
import { postAgentReply } from '@/lib/voice-agent-reply';

export function placeholderEmail(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
  return `${slug || 'client'}@no-email.invalid`;
}

function argStr(value: string | number | boolean | null | undefined): string {
  if (value === undefined || value === null) return '';
  return String(value);
}

/**
 * Map a free-form destination (which Vertex may hallucinate, e.g. "/dashboard",
 * "customer-list", "presentations") to a real app route. Dynamic routes like
 * /customers/:id or /meetings/:id pass through untouched if they look valid.
 */
export function resolveCanonicalRoute(raw: string): string {
  let p = raw.trim();
  if (!p.startsWith('/')) p = '/' + p;
  const key = p.toLowerCase().replace(/\/+$/, ''); // strip trailing slash
  const ALIASES: Record<string, string> = {
    '': '/',
    '/': '/',
    '/dashboard': '/',
    '/home': '/',
    '/overview': '/',
    '/executive-overview': '/',
    '/customers': '/customers',
    '/customer': '/customers',
    '/customer-list': '/customers',
    '/clients': '/customers',
    '/client-list': '/customers',
    '/crm': '/customers',
    '/meetings': '/meetings',
    '/meeting': '/meetings',
    '/presentations': '/meetings',
    '/presentation-list': '/meetings',
    '/presentations-list': '/meetings',
    '/sessions': '/meetings',
    '/calendar': '/meetings/calendar',
    '/meetings/calendar': '/meetings/calendar',
    '/schedule': '/meetings/new',
    '/meetings/new': '/meetings/new',
    '/new-meeting': '/meetings/new',
    '/new-presentation': '/meetings/new',
    '/team': '/admin/team',
    '/admin/team': '/admin/team',
    '/roles': '/admin/roles',
    '/admin/roles': '/admin/roles',
    '/permissions': '/admin/permissions',
    '/admin/permissions': '/admin/permissions',
    '/templates': '/settings/templates',
    '/settings/templates': '/settings/templates',
  };
  if (ALIASES[key]) return ALIASES[key];
  // Pass through already-valid dynamic routes (e.g. /customers/cu-002).
  if (/^\/(customers|meetings|admin|settings)\//.test(key)) return p;
  return p;
}

function normalizeMeetingStatus(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (s === 'live') return 'Live';
  if (s === 'scheduled' || s === 'upcoming') return 'Scheduled';
  if (s === 'completed' || s === 'complete') return 'Completed';
  if (s === 'canceled' || s === 'cancelled') return 'Canceled';
  return raw.trim();
}

export const COMMAND_REGISTRY: Record<string, CommandDefinition> = {
  navigate: {
    id: 'navigate',
    name: 'Navigate',
    category: 'navigation',
    description: 'Navigate to a specific path in the application',
    aliases: ['go to', 'open page', 'view page'],
    execute: async (args: CommandArgs) => {
      const router = useVoiceAgentStore.getState().router;
      // Vertex sometimes emits the destination under `route`/`url` and may
      // hallucinate route names ("/dashboard", "/customer-list"). Resolve the
      // raw value to a canonical app route.
      const raw = (argStr(args.path) || argStr(args.route) || argStr(args.url))
        .trim()
        .replace(/^["']|["']$/g, '');
      if (!raw) return;
      const path = resolveCanonicalRoute(raw);
      if (router && path) {
        router.push(path);
        emitCobrowse('navigate', { path });
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  },

  'filter-meetings': {
    id: 'filter-meetings',
    name: 'Filter Presentations',
    category: 'dashboard',
    description: 'Filter the presentations list by status, advisor, project, or date preset',
    aliases: ['show meetings', 'filter by'],
    execute: async (args: CommandArgs) => {
      const router = useVoiceAgentStore.getState().router;
      if (!router) return;

      // Make sure we are on the meetings page first
      if (typeof window !== 'undefined' && window.location.pathname !== '/meetings') {
        router.push('/meetings');
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const params = new URLSearchParams(window.location.search);

      const status = argStr(args.status);
      if (status) {
        if (status.toLowerCase() === 'all') params.delete('status');
        else params.set('status', normalizeMeetingStatus(status));
      }
      const advisor = argStr(args.advisor);
      if (advisor) params.set('advisor', advisor);
      const project = argStr(args.project);
      if (project) params.set('project', project);
      const datePreset = argStr(args.datePreset);
      if (datePreset) {
        if (datePreset.toLowerCase() === 'all') params.delete('date');
        else params.set('date', datePreset);
      }

      const queryString = params.toString();
      const path = queryString ? `/meetings?${queryString}` : '/meetings';
      router.push(path);
      emitCobrowse('filter-applied', {
        status: args.status,
        advisor: args.advisor,
        project: args.project,
        datePreset: args.datePreset,
      });
    }
  },

  'launch-portal': {
    id: 'launch-portal',
    name: 'Initialize Presenter Engine',
    category: 'session',
    description: 'Launch the moderator presentation portal for a project',
    aliases: ['start presentation', 'open sales portal'],
    execute: async (args: CommandArgs) => {
      const router = useVoiceAgentStore.getState().router;
      if (!router) return;

      const meetings = readPresentations();
      const projectQuery = argStr(args.project).toLowerCase();
      let matchedMeeting = meetings.find((m) => 
        m.property.toLowerCase().includes(projectQuery) ||
        (projectQuery && projectQuery.includes(m.property.toLowerCase()))
      );

      // If no matching project found, look for any Scheduled or Live presentation
      if (!matchedMeeting) {
        matchedMeeting = meetings.find((m) => m.status === 'Live' || m.status === 'Scheduled');
      }

      // Fallback: create a temporary presentation
      if (!matchedMeeting && projectQuery) {
        const uuid = Math.random().toString(36).substring(2, 11);
        matchedMeeting = {
          uuid,
          salesMember: 'Priya Sharma',
          salesMemberId: 'tm-001',
          property: resolveProjectName(args.project),
          category: 'Cinematic Project',
          client: 'Prospect Client',
          date: formatStoredPresentationDate(new Date()),
          time: '12:00 PM',
          status: 'Scheduled',
        };
        addPresentation(matchedMeeting);
      }

      if (matchedMeeting) {
        toast.success(`Launching portal for ${matchedMeeting.property}...`);
        router.push(`/moderator/${matchedMeeting.uuid}`);
        await new Promise((resolve) => setTimeout(resolve, 250));
      } else {
        throw new Error('No presentation found to launch');
      }
    }
  },

  'toggle-mic': {
    id: 'toggle-mic',
    name: 'Toggle Microphone',
    category: 'session',
    description: 'Mute or unmute the microphone',
    aliases: ['mute mic', 'unmute mic', 'mute microphone', 'unmute microphone'],
    execute: async (args: CommandArgs) => {
      const enabled = args.enabled !== false;
      useVoiceAgentStore.getState().setModeratorState({ isMicOn: enabled });
      toast.success(enabled ? 'Microphone unmuted' : 'Microphone muted');
    }
  },

  'toggle-cam': {
    id: 'toggle-cam',
    name: 'Toggle Camera',
    category: 'session',
    description: 'Turn camera feed on or off',
    aliases: ['turn on camera', 'turn off camera', 'disable camera', 'enable camera'],
    execute: async (args: CommandArgs) => {
      const enabled = args.enabled !== false;
      useVoiceAgentStore.getState().setModeratorState({ isCamOn: enabled });
      toast.success(enabled ? 'Camera stream enabled' : 'Camera stream disabled');
    }
  },

  'toggle-observers': {
    id: 'toggle-observers',
    name: 'Toggle Observers',
    category: 'session',
    description: 'Show or hide observer client feeds',
    aliases: ['show observers', 'hide observers', 'show team', 'hide team'],
    execute: async (args: CommandArgs) => {
      const enabled = args.enabled !== false;
      useVoiceAgentStore.getState().setModeratorState({ showObservers: enabled });
      toast.success(enabled ? 'Observer panel displayed' : 'Observer panel hidden');
    }
  },

  'toggle-drawer': {
    id: 'toggle-drawer',
    name: 'Toggle Moderator Drawer',
    category: 'session',
    description: 'Open or close moderator sidebar drawer panels',
    aliases: ['open analytics', 'open visitors list', 'open script guide'],
    execute: async (args: CommandArgs) => {
      const drawer = args.drawer as 'analytics' | 'script' | 'visitors' | null;
      useVoiceAgentStore.getState().setModeratorState({ activeDrawer: drawer });
    }
  },

  'change-slide': {
    id: 'change-slide',
    name: 'Navigate Presentation Slide',
    category: 'session',
    description: 'Change active slide in presentation',
    aliases: ['go to slide', 'next slide', 'previous slide'],
    execute: async (args: CommandArgs) => {
      const activeSlide = useVoiceAgentStore.getState().moderatorState.activeSlide;
      let nextSlideNum = activeSlide;

      if (args.slide === 'next') {
        const nextIdx = parseInt(activeSlide, 10) + 1;
        nextSlideNum = String(Math.min(10, nextIdx)).padStart(2, '0');
      } else if (args.slide === 'prev') {
        const prevIdx = parseInt(activeSlide, 10) - 1;
        nextSlideNum = String(Math.max(1, prevIdx)).padStart(2, '0');
      } else if (args.slide) {
        nextSlideNum = argStr(args.slide);
      }

      useVoiceAgentStore.getState().setModeratorState({ activeSlide: nextSlideNum });
      toast.success(`Navigating to Slide ${nextSlideNum}`);
    }
  },

  'client-info': {
    id: 'client-info',
    name: 'Client information',
    category: 'crm',
    description:
      'Look up client in CRM and return profile details; asks which client if multiple matches',
    aliases: ['tell me about', 'information about', 'who is', 'client details'],
    execute: async (args: CommandArgs) => {
      const store = useVoiceAgentStore.getState();
      const router = store.router;
      const clientQuery = argStr(args.client ?? args.query);
      const userQuestion = argStr(args.question) || clientQuery;
      if (!clientQuery) return;

      const result = resolveClientLookup(clientQuery);

      if (result.type === 'not_found') {
        store.addChatMessage(
          'agent',
          `I could not find a client matching "${result.query}" in your portfolio. Try the full name or say "Open the customer list".`
        );
        return;
      }

      if (result.type === 'disambiguate') {
        store.setPendingClientLookup({
          query: result.query,
          candidateIds: result.customers.map((c) => c.id),
          intent: 'info',
          userQuestion,
        });
        postAgentReply(formatDisambiguationPrompt(result.query, result.customers));
        return;
      }

      store.clearPendingClientLookup();
      const { settings } = store;
      if (settings.intentEngine !== 'rules') {
        store.addChatMessage('system', 'Preparing a detailed client brief with Gemini…');
      }
      const { message, source } = await getClientDetailsMessage(result.customer, {
        userQuestion,
        geminiApiKey: settings.geminiApiKey,
        intentEngine: settings.intentEngine,
      });
      if (source === 'gemini') {
        store.addChatMessage('system', 'Client intelligence generated with Gemini.');
      }
      postAgentReply(message);
      if (router) {
        toast.success(`Opening ${result.customer.name}`);
        emitCobrowse('navigate', { path: `/customers/${result.customer.id}` });
        router.push(`/customers/${result.customer.id}`);
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
    },
  },

  'search-customer': {
    id: 'search-customer',
    name: 'Search Customer',
    category: 'crm',
    description: 'Search customer directory and open profile',
    aliases: ['find client', 'view profile of'],
    execute: async (args: CommandArgs) => {
      const router = useVoiceAgentStore.getState().router;
      const clientQuery = argStr(args.client);
      if (!router || !clientQuery) return;

      const matches = findCustomersByNameQuery(clientQuery);

      if (matches.length === 1) {
        const match = matches[0];
        toast.success(`Opening profile for ${match.name}...`);
        emitCobrowse('navigate', { path: `/customers/${match.id}` });
        router.push(`/customers/${match.id}`);
        await new Promise((resolve) => setTimeout(resolve, 150));
        return;
      }

      if (matches.length > 1) {
        const store = useVoiceAgentStore.getState();
        store.setPendingClientLookup({
          query: clientQuery,
          candidateIds: matches.map((c) => c.id),
          intent: 'open',
        });
        store.addChatMessage(
          'agent',
          `${formatDisambiguationPrompt(clientQuery, matches)}\n\nI will open their profile once you choose.`
        );
        return;
      }

      const customers = readCustomers();
      if (customers.length > 0) {
        toast.success(`Client "${clientQuery}" not found. Showing customer list.`);
        router.push('/customers');
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else {
        router.push('/customers');
        throw new Error(`Customer "${clientQuery}" not found`);
      }
    }
  },

  'set-client-section': {
    id: 'set-client-section',
    name: 'Switch Client Profile Section',
    category: 'crm',
    description: 'Switch active tab of customer profile view',
    aliases: ['show timeline', 'show activity', 'view notes'],
    execute: async (args: CommandArgs) => {
      if (args.section) {
        const section = args.section;
        const validSections = ['overview', 'activity', 'presentations', 'advisor', 'notes'] as const;
        if (validSections.includes(section as (typeof validSections)[number])) {
          useVoiceAgentStore.getState().setClientProfileState({
            activeSection: section as (typeof validSections)[number],
          });
        }
      }
    }
  },

  'set-template-tab': {
    id: 'set-template-tab',
    name: 'Switch Template View',
    category: 'dashboard',
    description: 'Switch between invite templates tabs',
    aliases: ['show whatsapp templates', 'go to email templates'],
    execute: async (args: CommandArgs) => {
      // Set the active tab in store which the templates workspace will sync to
      const tab = argStr(args.tab);
      if (tab) {
        useVoiceAgentStore.setState({ activeTemplateTab: tab });
      }
    }
  },

  'schedule-presentation': {
    id: 'schedule-presentation',
    name: 'Schedule Presentation',
    category: 'dashboard',
    description: 'Create a scheduled presentation and sync the registry in real time',
    aliases: [
      'book presentation',
      'schedule new session',
      'create a new meeting',
      'create new meeting',
      'new meeting',
      'new presentation',
    ],
    execute: async (args: CommandArgs) => {
      const router = useVoiceAgentStore.getState().router;
      if (!router) return;

      const project = resolveProjectName(args.project);
      const { name: clientName, id: clientId } = resolveClientName(args);
      const scheduleDate = resolveScheduleDate(args.date);
      const timeLabel = formatSessionTime(args.time ?? '10:00');
      const advisorId = getCurrentAdvisorId();
      const advisor = TEAM_MEMBERS.find((m) => m.id === advisorId) ?? TEAM_MEMBERS[0];

      const uuid =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID().slice(0, 11)
          : Math.random().toString(36).slice(2, 11);

      const meeting = {
        uuid,
        salesMember: advisor.name,
        salesMemberId: advisor.id,
        property: project,
        category: 'Cinematic Project',
        client: clientName,
        clientId,
        date: formatStoredPresentationDate(scheduleDate),
        time: timeLabel,
        status: 'Scheduled' as const,
      };

      addPresentation(meeting);
      emitCobrowse('presentation-created', { uuid, project, client: clientName });

      // Backend persist. Email is captured during slot-filling and is the
      // canonical client identifier. If a CRM customer matches that email, use
      // their phone/city; otherwise treat as a brand-new prospect.
      try {
        const clientEmail = argStr(args.email).trim().toLowerCase();
        if (clientEmail) {
          const crmCustomer =
            findCustomerByEmail(clientEmail) ||
            (clientId ? getCustomerByIdFromStore(clientId) : null);
          const rawTime = argStr(args.time) || '10:00';
          const [hStr, mStr] = rawTime.split(':');
          const start = new Date(scheduleDate);
          start.setHours(parseInt(hStr, 10) || 10, parseInt(mStr, 10) || 0, 0, 0);
          await scheduleMeeting({
            client_name: crmCustomer?.name || clientName,
            client_email: clientEmail,
            client_phone: argStr(args.phone) || crmCustomer?.phone || null,
            client_city: argStr(args.city) || crmCustomer?.city || null,
            project_id: null,
            start_time: start.toISOString(),
          });
        } else {
          console.warn(
            '[schedule-presentation] backend POST skipped — no email captured during slot-fill'
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'backend save failed';
        console.error('[schedule-presentation] backend POST failed', err);
        toast.error(`Saved locally — backend sync failed (${message})`);
      }

      toast.success(`Presentation scheduled for ${clientName}`);
      router.push('/meetings');
      await new Promise((resolve) => setTimeout(resolve, 120));
    },
  },

  'add-customer': {
    id: 'add-customer',
    name: 'Add Client to CRM',
    category: 'crm',
    description: 'Add or update a client record in the portfolio',
    aliases: ['create customer', 'new client', 'add client', 'update client'],
    execute: async (args: CommandArgs) => {
      const router = useVoiceAgentStore.getState().router;
      if (!router) return;

      const name = resolveAddCustomerName(args);
      if (!name) throw new Error('Client name is required');

      const leadSource = resolveLeadSourceId(argStr(args.leadSource)) || argStr(args.leadSource);
      const existing =
        (args.existingId && getCustomerByIdFromStore(String(args.existingId))) ||
        findCustomerByName(name);

      if (existing) {
        const updated = await updateCustomer(existing.id, {
          name: existing.name,
          email: argStr(args.email) || existing.email,
          phone: argStr(args.phone) || existing.phone,
          city: argStr(args.city) || existing.city,
          leadSource: leadSource || existing.leadSource,
        });
        if (!updated) throw new Error('Failed to update client');
        emitCobrowse('customer-updated', { id: updated.id, name: updated.name });
        toast.success(`${updated.name} updated in portfolio`);
        router.push(`/customers/${updated.id}`);
      } else {
        //

        const customer = await addCustomer({
          name,
          email: argStr(args.email) || placeholderEmail(name),
          phone: argStr(args.phone) || '',
          city: argStr(args.city) || '',
          assignedAdvisorId: getCurrentAdvisorId(),
          leadSource,
        });
        emitCobrowse('customer-created', { id: customer.id, name: customer.name });
        toast.success(`${customer.name} added to portfolio`);
        router.push(`/customers/${customer.id}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    },
  },
};

/**
 * Sequential execution coordinator — always reads fresh state from the store.
 * The caller must call setExecutionQueue() BEFORE calling this function.
 */
export async function executeCommandQueue() {
  // Re-read from store so we always get the queue set by the caller
  const queue = useVoiceAgentStore.getState().executionQueue;
  if (queue.length === 0) {
    console.warn('[CommandQueue] executeCommandQueue called with empty queue');
    return;
  }

  useVoiceAgentStore.getState().setState('executing');

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    useVoiceAgentStore.getState().setCurrentExecutionIndex(i);
    useVoiceAgentStore.getState().updateExecutionStatus(item.id, 'running');

    const cmd = COMMAND_REGISTRY[item.commandId];
    if (!cmd) {
      console.error(`[CommandQueue] Unknown command: "${item.commandId}"`);
      useVoiceAgentStore.getState().updateExecutionStatus(item.id, 'error', `Unknown command: ${item.commandId}`);
      useVoiceAgentStore.getState().setState('error');
      setTimeout(() => {
        if (useVoiceAgentStore.getState().state === 'error') {
          useVoiceAgentStore.getState().setState('idle');
          useVoiceAgentStore.getState().resetQueue();
        }
      }, 2500);
      return;
    }

    try {
      console.log(`[CommandQueue] Executing [${i + 1}/${queue.length}]: ${item.commandId}`, item.args);
      await cmd.execute(item.args || {});
      useVoiceAgentStore.getState().updateExecutionStatus(item.id, 'success');
    } catch (err: unknown) {
      console.error(`[CommandQueue] Failed: ${item.commandId}`, err);
      const message = err instanceof Error ? err.message : 'Execution error';
      useVoiceAgentStore.getState().updateExecutionStatus(item.id, 'error', message);
      useVoiceAgentStore.getState().setState('error');
      setTimeout(() => {
        if (useVoiceAgentStore.getState().state === 'error') {
          useVoiceAgentStore.getState().setState('idle');
          useVoiceAgentStore.getState().resetQueue();
        }
      }, 2500);
      return;
    }
  }

  useVoiceAgentStore.getState().setState('success');
  setTimeout(() => {
    if (useVoiceAgentStore.getState().state === 'success') {
      useVoiceAgentStore.getState().setState('idle');
      useVoiceAgentStore.getState().resetQueue();
    }
  }, 3000);
}
