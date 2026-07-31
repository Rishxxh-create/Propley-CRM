# Adding an API endpoint (registry pattern)

How to wire a new backend route with **minimal files**: register once, reuse shared BFF/backend/dedupe utilities. Stack conventions: [`api-strategy.md`](./api-strategy.md) · catalog: [`api.md`](./api.md).

---

## Architecture (dynamic GET proxies)

```
UI → domain fn (deduped-get) → *-client.ts → BFF catch-all [...segments] → registry → backend-proxy → NEXT_BACKEND_URL
```

| Layer | Path | Add endpoint by |
|-------|------|-----------------|
| Types | `types/<domain>.ts` | One type export |
| Registry | `endpoints/<domain>.ts` | One `GetEndpointDef` object |
| Validators | `endpoints/validators.ts` | One `is*Response` guard (shared server + browser) |
| BFF | `app/api/v1/<domain>/[...segments]/route.ts` | **Nothing** — catch-all resolves registry |
| Domain | `<domain>.ts` | One `createSingletonGet` or `createKeyedGet` line |
| Redux | slice + thunk + hooks | Same as before |

**Core utilities** (`src/lib/api/core/`):

- `backend-proxy.ts` — `proxyBackendGet(token, path, validate, message)`
- `bff-handler.ts` — `handleAuthenticatedBffGet(handler, unavailableMessage)`
- `deduped-get.ts` — `createSingletonGet` / `createKeyedGet`

---

## Checklist (new authenticated GET)

1. **Types** — add to `src/lib/api/types/<domain>.ts` (do not create a file per endpoint)
2. **Validator** — `isMyResponse` in `endpoints/validators.ts`
3. **Registry** — push one entry in `endpoints/<domain>.ts` (`EVENT_GET_ENDPOINTS`, etc.)
4. **Domain** — one line in `<domain>.ts` using `createSingletonGet` or `createKeyedGet`
5. **Redux** (if dashboard/shared read) — thunk `condition` + `signal`, `useLoad*` in layout, `use*` in children
6. **Docs** — block in [`api.md`](./api.md)
7. **Sign-out** — extend domain `clear*` action

**You do not create:** per-path `route.ts`, `*-server.ts` fetcher, or duplicate parse/validate logic.

---

## Example: add `GET /api/v1/events/summary`

### 1. Type (`types/events.ts`)

```ts
export type EventSummaryResponse = {
  active_sessions: number;
  today_total: number;
};
```

### 2. Validator (`endpoints/validators.ts`)

```ts
export function isEventSummaryResponse(data: unknown): data is EventSummaryResponse {
  if (typeof data !== 'object' || data === null) return false;
  const row = data as Record<string, unknown>;
  return typeof row.active_sessions === 'number' && typeof row.today_total === 'number';
}
```

### 3. Registry (`endpoints/events.ts`)

```ts
{
  id: 'summary',
  match: (segments) =>
    segments.length === 1 && segments[0] === 'summary' ? { params: {} } : null,
  backendPath: () => '/api/v1/events/summary',
  validate: isEventSummaryResponse,
  invalidMessage: 'Invalid event summary response',
  unavailableMessage: 'Event summary unavailable',
},
```

BFF URL stays **`GET /api/v1/events/summary`** via existing `app/api/v1/events/[...segments]/route.ts`.

### 4. Domain (`events.ts`)

```ts
export const fetchEventSummary = createSingletonGet({
  client: eventsClient,
  path: '/summary',
  parse: (data) => {
    if (!isEventSummaryResponse(data)) throw new ApiError('Invalid event summary response', 502);
    return data;
  },
});
```

### 5. Redux + UI (unchanged pattern)

- Thunk calls `fetchEventSummary({ signal })`
- `useLoadEventSummary()` in **one** layout parent
- Children use `useEventSummary()` only — no `dispatch` in leaves

---

## Parameterized GET (`:id` in path)

Registry `match` extracts params; domain uses **keyed** dedupe:

```ts
// Registry
match: (segments) => {
  if (segments.length !== 2 || segments[1] !== 'activity') return null;
  return { params: { meetingUuid: segments[0] } };
},
backendPath: ({ meetingUuid }) =>
  `/api/v1/events/${encodeURIComponent(meetingUuid)}/activity`,

// Domain
export const fetchMeetingActivity = createKeyedGet({
  client: eventsClient,
  path: (meetingUuid) => `/${encodeURIComponent(meetingUuid)}/activity`,
  parse: parseMeetingActivityResponse,
});
```

Load from **that page only** (`useLoadMeetingActivity(uuid)`), not dashboard layout.

---

## POST / auth / custom BFF

Login, logout, and non-GET flows stay **explicit** `src/app/api/<path>/route.ts` + `<domain>-server.ts` (no registry). See auth routes.

---

## Anti-patterns

```ts
// ❌ New route.ts per GET when registry catch-all exists
src/app/api/v1/events/foo/route.ts

// ❌ Duplicate dispatch
useEffect(() => dispatch(fetchLiveStreamThunk()), [dispatch]); // in Sidebar AND page

// ❌ Raw Axios in components
axios.get(`${process.env.NEXT_PUBLIC_BACKEND}/events/stats`);
```

---

## File map (events domain)

| File | Role |
|------|------|
| `types/events.ts` | All event response types |
| `endpoints/validators.ts` | Shared `is*Response` guards |
| `endpoints/events.ts` | `EVENT_GET_ENDPOINTS` registry |
| `app/api/v1/events/[...segments]/route.ts` | Single BFF for all event GETs |
| `events-client.ts` | Axios `baseURL: '/api/v1/events'` |
| `events.ts` | `createSingletonGet` / `createKeyedGet` exports |
| `core/deduped-get.ts` | In-flight dedupe |
| `core/backend-proxy.ts` | Server GET + validation |

---

## Related

- [`axios-api-optimization.md`](./axios-api-optimization.md) — dedupe layers
- [`api-strategy.md`](./api-strategy.md) — errors, retry, cancellation
- [`.cursor/rules/api-implementation.mdc`](../.cursor/rules/api-implementation.mdc) — agent checklist
