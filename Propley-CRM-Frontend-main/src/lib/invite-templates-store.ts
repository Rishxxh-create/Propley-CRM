import { DEVELOPMENTS } from '@/lib/mock-data';
import {
  DEFAULT_EMAIL_TEMPLATE,
  DEFAULT_RESCHEDULE_EMAIL_TEMPLATE,
  DEFAULT_WHATSAPP_TEMPLATE,
  type EmailTemplateFields,
} from '@/lib/presentation-templates';

export const INVITE_TEMPLATES_KEY = 'propley_invite_templates';
export const INVITE_TEMPLATES_UPDATED_EVENT = 'propley_invite_templates_updated';

export interface ProjectInviteTemplate {
  projectId: string;
  projectName: string;
  email: EmailTemplateFields;
  rescheduleEmail: EmailTemplateFields;
  whatsapp: string;
}

export interface InviteTemplatesStore {
  global: {
    email: EmailTemplateFields;
    rescheduleEmail: EmailTemplateFields;
    whatsapp: string;
  };
  byProject: ProjectInviteTemplate[];
}

const defaultStore = (): InviteTemplatesStore => ({
  global: {
    email: DEFAULT_EMAIL_TEMPLATE,
    rescheduleEmail: DEFAULT_RESCHEDULE_EMAIL_TEMPLATE,
    whatsapp: DEFAULT_WHATSAPP_TEMPLATE,
  },
  byProject: DEVELOPMENTS.map((d) => ({
    projectId: d.id,
    projectName: d.name,
    email: { ...DEFAULT_EMAIL_TEMPLATE },
    rescheduleEmail: { ...DEFAULT_RESCHEDULE_EMAIL_TEMPLATE },
    whatsapp: DEFAULT_WHATSAPP_TEMPLATE,
  })),
});

function normalizeProjectTemplate(t: Partial<ProjectInviteTemplate> & { projectId: string; projectName: string }): ProjectInviteTemplate {
  return {
    projectId: t.projectId,
    projectName: t.projectName,
    email: { ...DEFAULT_EMAIL_TEMPLATE, ...t.email },
    rescheduleEmail: { ...DEFAULT_RESCHEDULE_EMAIL_TEMPLATE, ...t.rescheduleEmail },
    whatsapp: t.whatsapp ?? DEFAULT_WHATSAPP_TEMPLATE,
  };
}

function normalizeStore(parsed: Partial<InviteTemplatesStore>): InviteTemplatesStore {
  const base = defaultStore();
  return {
    global: {
      email: { ...base.global.email, ...parsed.global?.email },
      rescheduleEmail: {
        ...base.global.rescheduleEmail,
        ...parsed.global?.rescheduleEmail,
      },
      whatsapp: parsed.global?.whatsapp ?? base.global.whatsapp,
    },
    byProject: base.byProject.map((def) => {
      const saved = parsed.byProject?.find((p) => p.projectId === def.projectId);
      return saved ? normalizeProjectTemplate({ ...def, ...saved }) : def;
    }),
  };
}

let cachedInviteStore: InviteTemplatesStore | null = null;
let defaultInviteStoreCache: InviteTemplatesStore | null = null;

function getDefaultInviteStore(): InviteTemplatesStore {
  if (defaultInviteStoreCache === null) {
    defaultInviteStoreCache = defaultStore();
  }
  return defaultInviteStoreCache;
}

function readStore(): InviteTemplatesStore {
  if (typeof window === 'undefined') return getDefaultInviteStore();
  if (cachedInviteStore !== null) return cachedInviteStore;
  try {
    const raw = localStorage.getItem(INVITE_TEMPLATES_KEY);
    if (!raw) {
      cachedInviteStore = defaultStore();
      return cachedInviteStore;
    }
    cachedInviteStore = normalizeStore(JSON.parse(raw) as Partial<InviteTemplatesStore>);
    return cachedInviteStore;
  } catch {
    cachedInviteStore = defaultStore();
    return cachedInviteStore;
  }
}

function writeStore(store: InviteTemplatesStore) {
  cachedInviteStore = store;
  localStorage.setItem(INVITE_TEMPLATES_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(INVITE_TEMPLATES_UPDATED_EVENT));
}

export function readInviteTemplates(): InviteTemplatesStore {
  return readStore();
}

export function subscribeInviteTemplates(onChange: () => void) {
  const handle = () => {
    cachedInviteStore = null;
    onChange();
  };
  window.addEventListener(INVITE_TEMPLATES_UPDATED_EVENT, handle);
  return () => window.removeEventListener(INVITE_TEMPLATES_UPDATED_EVENT, handle);
}

export function updateProjectTemplate(
  projectId: string,
  patch: Partial<Pick<ProjectInviteTemplate, 'email' | 'rescheduleEmail' | 'whatsapp'>>
) {
  const store = readStore();
  store.byProject = store.byProject.map((t) =>
    t.projectId === projectId ? { ...t, ...patch } : t
  );
  writeStore(store);
}

export function getTemplateForProject(projectName: string): {
  email: EmailTemplateFields;
  rescheduleEmail: EmailTemplateFields;
  whatsapp: string;
} {
  const store = readStore();
  const normalized = projectName.trim().toLowerCase();
  const match = store.byProject.find((t) => t.projectName.toLowerCase() === normalized);
  if (match) {
    return {
      email: match.email,
      rescheduleEmail: match.rescheduleEmail,
      whatsapp: match.whatsapp,
    };
  }
  return store.global;
}
