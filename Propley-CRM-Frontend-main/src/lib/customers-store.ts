import { type Customer, type DealStage } from '@/lib/mock-data';
import { fetchClients, createClient, updateClient, deleteClient } from '@/lib/api/clients';
import { fuzzyNameScore } from '@/lib/phonetic-name-match';

export const CUSTOMERS_UPDATED_EVENT = 'propley_customers_updated';

const EMPTY: Customer[] = [];

let cache: Customer[] | null = null;
let hydrated = false;
let inFlight: Promise<Customer[]> | null = null;

function emit() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CUSTOMERS_UPDATED_EVENT));
  }
}

function setCache(next: Customer[]) {
  cache = next;
  emit();
}

/** Load clients from the backend into the in-memory cache. Deduped while in flight. */
export async function hydrateCustomers(force = false): Promise<Customer[]> {
  if (typeof window === 'undefined') return EMPTY;
  if (!force && hydrated && cache) return cache;
  if (inFlight) return inFlight;

  inFlight = fetchClients()
    .then((list) => {
      cache = list;
      hydrated = true;
      emit();
      return list;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Synchronous read off the cache. Returns [] until hydrateCustomers() resolves. */
export function readCustomers(): Customer[] {
  return cache ?? EMPTY;
}

/** False until the first backend load resolves — lets views show loading vs. empty. */
export function isCustomersHydrated(): boolean {
  return hydrated;
}

export function getCustomerByIdFromStore(id: string): Customer | undefined {
  return readCustomers().find((c) => c.id === id);
}

/** Exact email match (case-insensitive). Email is the canonical identifier for voice flows. */
export function findCustomerByEmail(email: string): Customer | undefined {
  const target = email.trim().toLowerCase();
  if (!target) return undefined;
  return readCustomers().find((c) => c.email.trim().toLowerCase() === target);
}

function nameMatchScore(customer: Customer, query: string): number {
  return fuzzyNameScore(customer.name, query);
}

/** All CRM clients matching a spoken or typed name (for disambiguation). */
export function findCustomersByNameQuery(query: string): Customer[] {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];
  return readCustomers()
    .map((c) => ({ c, score: nameMatchScore(c, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ c }) => c);
}

/** Match by exact or partial name (case-insensitive) — first best match */
export function findCustomerByName(query: string): Customer | undefined {
  return findCustomersByNameQuery(query)[0];
}

export function subscribeCustomers(onStoreChange: () => void) {
  const handle = () => onStoreChange();
  window.addEventListener(CUSTOMERS_UPDATED_EVENT, handle);
  return () => {
    window.removeEventListener(CUSTOMERS_UPDATED_EVENT, handle);
  };
}

export async function addCustomer(
  input: Omit<Customer, 'id' | 'lastMeeting' | 'status' | 'dealStage'> & {
    lastMeeting?: string;
    status?: Customer['status'];
    dealStage?: DealStage;
  }
): Promise<Customer> {
  const created = await createClient({
    name: input.name,
    email: input.email,
    phone: input.phone,
    city: input.city || '—',
    assignedAdvisorId: input.assignedAdvisorId,
    leadSource: input.leadSource,
    status: input.status ?? 'Active',
    dealStage: input.dealStage ?? 'inquiry',
    lastMeeting: input.lastMeeting,
  });
  setCache([created, ...readCustomers()]);
  return created;
}

export async function updateCustomer(
  id: string,
  patch: Partial<Customer>
): Promise<Customer | undefined> {
  const originalCustomers = readCustomers();
  const customerToUpdate = originalCustomers.find(c => c.id === id);

  if (customerToUpdate) {
    const optimisticUpdated = { ...customerToUpdate, ...patch };
    setCache(originalCustomers.map((c) => (c.id === id ? optimisticUpdated : c)));
  }

  try {
    const updated = await updateClient(id, patch);
    setCache(readCustomers().map((c) => (c.id === id ? updated : c)));
    return updated;
  } catch (error) {
    setCache(originalCustomers);
    throw error;
  }
}

export async function removeCustomer(id: string): Promise<boolean> {
  await deleteClient(id);
  setCache(readCustomers().filter((c) => c.id !== id));
  return true;
}

export const DEAL_STAGES: DealStage[] = ['inquiry', 'vsv_scheduled', 'vsv_done', 'offer', 'negotiation', 'closed_won', 'closed_lost'];
