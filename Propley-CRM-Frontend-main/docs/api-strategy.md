# API call strategy (Propley)

Project conventions for the shared Axios layer. Endpoint contracts live in [`api.md`](./api.md).

## Architecture

| Layer | File | Responsibility |
|-------|------|----------------|
| UI | components, hooks | Call `login()`, not `authClient` |
| Domain | `auth.ts`, `crm.ts` | Business functions, runtime checks on critical fields |
| Transport | `auth-client.ts` | `createHttpClient({ baseURL: '/api/auth', timeout })` |
| BFF GET | `app/api/v1/<domain>/[...segments]/route.ts` | Registry → `backend-proxy` |
| BFF write/auth | `src/app/api/**/route.ts` | Explicit routes (login, etc.) |
| Registry | `endpoints/<domain>.ts` | `match`, `backendPath`, validators |
| Server | `auth-server.ts`, `endpoints/*` | `NEXT_BACKEND_URL` only |

**Boundary:** Browser → `/api/*`. Server Route Handlers → `NEXT_BACKEND_URL`.

## Core utilities (`http-client.ts`)

- `createHttpClient(config)` — merges defaults; response interceptor → `ApiError`
- `ApiError` — `{ status, body }`; `status === 0` → network/timeout
- `withRetry(fn, { attempts, initialDelayMs, jitterMs })` — **reads only**; retries 408, 429, 5xx, network
- `isRequestCanceled(err)` — aborted requests (ignore in UI catch)

## Domain client example

```ts
// auth-client.ts — transport only
export const authClient = createHttpClient({
  baseURL: '/api/auth',
  timeout: 12_000,
  headers: { 'Content-Type': 'application/json' },
});

// auth.ts — domain
export async function login(credentials: LoginRequest) {
  const { data } = await authClient.post<LoginSuccessResponse>('/login', credentials);
  if (!data.token || !data.user) throw new ApiError('Invalid login response', 502);
  return data;
}
```

## Error handling in UI

```ts
import { login } from '@/lib/api/auth';
import { ApiError, isRequestCanceled } from '@/lib/api/http-client';

try {
  await login({ email, password });
} catch (err) {
  if (isRequestCanceled(err)) return;
  if (err instanceof ApiError) {
    if (err.status === 401) { /* redirect */ }
    else toast.error(err.message);
  }
}
```

## Retry defaults

| Operation | Attempts | Notes |
|-----------|----------|--------|
| Auth / writes | 1 | No retry |
| Standard GET | 2–3 | `initialDelayMs: 250` |
| Mandake slides | 2 | See `mandake-slides.ts` |

## Performance & deduplication

**Goal:** one network call per resource per session unless the user explicitly refreshes or auth resets.

### Layer 1 — UI (single loader)

- Dispatch read thunks from **one layout or hook**, not from every child component.
- Example: `useLoadEventStats()` in `DashboardLayout`; children use `useEventStats()` (selectors only).
- **Do not** call `dispatch(fetchXThunk())` in both `Sidebar` and a page component.

### Layer 2 — Redux thunk (`condition`)

Skip dispatch when data is already in flight or loaded:

```ts
export const fetchEventStatsThunk = createAsyncThunk(
  'events/fetchStats',
  async (_, { rejectWithValue, signal }) => {
    return await fetchEventStats({ signal });
  },
  {
    condition: (_, { getState }) => {
      const status = selectEventStatsStatus(getState() as RootState);
      return status === 'idle' || status === 'error';
    },
  },
);
```

- Pass RTK `signal` into the domain function → Axios `{ signal }`.
- On `rejectWithValue('canceled')`, slice **must not** set `error` (aborted superseded request).

### Layer 3 — Domain (in-flight Axios dedupe)

For session-wide GETs, use `createSingletonGet` / `createKeyedGet` from `src/lib/api/core/deduped-get.ts`:

```ts
export const fetchEventStats = createSingletonGet({
  client: eventsClient,
  path: '/stats',
  parse: parseEventStatsResponse,
});
```

Reference: `src/lib/api/events.ts`, `src/store/slices/eventsThunks.ts`, `src/store/hooks/useEventStats.ts`.

### Other performance rules

- Independent fetches: `Promise.all`
- Search/typeahead: debounce at call site; pass `AbortSignal`
- Timeouts: auth 10–12s, CRUD 8–10s, typeahead 3–5s
- **Retry:** `withRetry` on idempotent GET only (see Retry defaults)

## Security

- No backend URL or secrets in client code
- Safe user-facing messages (no stack traces)
- Tokens via interceptor when authenticated routes ship

## Related files

| File | Role |
|------|------|
| `src/lib/api/http-client.ts` | Core |
| `src/lib/api/auth-client.ts` | Auth transport |
| `src/lib/api/auth.ts` | Auth domain (browser) |
| `src/lib/api/auth-server.ts` | Auth backend (server) |
| `src/lib/api/core/deduped-get.ts` | `createSingletonGet` / `createKeyedGet` |
| `src/lib/api/endpoints/events.ts` | Event GET registry (BFF + backend paths) |
| `src/lib/api/events.ts` | Event domain fetchers |
| `src/lib/api/events-client.ts` | Events BFF transport |
| `app/api/v1/events/[...segments]/route.ts` | Single BFF catch-all for event GETs |
| `src/store/hooks/useEventStats.ts` | `useLoadEventStats` / `useEventStats` |
| `src/lib/mandake-slides.ts` | External slides API + `withRetry` |
| `docs/axios-api-optimization.md` | Extended dedupe + cancellation guide |
| `docs/adding-api-endpoint.md` | Registry checklist for new GET endpoints |
