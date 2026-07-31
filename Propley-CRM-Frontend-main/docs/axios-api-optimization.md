# Axios API optimization

How to avoid duplicate calls and keep the shared Axios layer efficient. Endpoint contracts: [`api.md`](./api.md). Architecture: [`api-strategy.md`](./api-strategy.md).

## Principles

1. **Components never import Axios** — use `@/lib/api/<domain>.ts` or Redux thunks.
2. **One loader per resource** — dispatch from layout/parent hook, not every child.
3. **Three dedupe layers** — UI loader → thunk `condition` → domain in-flight promise (for session GETs).
4. **Cancellation** — pass `signal` from `createAsyncThunk` to `client.get(..., { signal })`; ignore `isRequestCanceled` in UI and slice.

## Implemented examples: event stats & live stream

Both load from `DashboardLayout` via `useLoadEventStats()` and `useLoadLiveStream()`; dashboard reads with `useEventStats()` / `useLiveStream()` only.

### Event stats

| Layer | File | Role |
|-------|------|------|
| Loader | `DashboardLayout.tsx` | `useLoadEventStats()` once |
| Read | `AdvisorOverview.tsx` | `useEventStats()` selectors only |
| Thunk | `eventsThunks.ts` | `condition` + `signal` |
| Domain | `events.ts` | Shared `statsRequest` promise |
| Transport | `events-client.ts` | Axios `baseURL: '/api/v1/events'` |

### Live stream

| Layer | File | Role |
|-------|------|------|
| Loader | `DashboardLayout.tsx` | `useLoadLiveStream()` once |
| Read | `AdvisorOverview.tsx` | `useLiveStream()` selectors only |
| Thunk | `eventsThunks.ts` | `fetchLiveStreamThunk` + `condition` |
| Domain | `events.ts` | Shared `liveStreamRequest` promise |
| BFF | `app/api/v1/events/[...segments]/route.ts` | Registry → backend |

See [`adding-api-endpoint.md`](./adding-api-endpoint.md) for the full checklist.

**Anti-pattern (causes 2–4× `/stats` calls):**

```ts
// ❌ Do not dispatch in both Sidebar and AdvisorOverview
useEffect(() => {
  if (status === 'idle') dispatch(fetchEventStatsThunk());
}, [dispatch, status]);
```

## Thunk `condition`

```ts
{
  condition: (_, { getState }) => {
    const status = selectEventStatsStatus(getState() as RootState);
    return status === 'idle' || status === 'error';
  },
}
```

## Domain in-flight dedupe (Axios)

```ts
let statsRequest: Promise<EventStatsResponse> | null = null;

export async function fetchEventStats(options?: { signal?: AbortSignal }) {
  if (statsRequest) return statsRequest;
  statsRequest = eventsClient
    .get<EventStatsResponse>('/stats', { signal: options?.signal })
    .then(({ data }) => parseEventStatsResponse(data))
    .finally(() => { statsRequest = null; });
  return statsRequest;
}
```

Use for **session-scoped GETs** loaded once after login. Do not use for writes or user-triggered refresh (use explicit refetch thunk instead).

## Slice: canceled requests

```ts
.addCase(fetchEventStatsThunk.rejected, (state, action) => {
  if (action.payload === 'canceled') return;
  state.status = 'error';
});
```

## Hooks pattern

```ts
// src/store/hooks/useEventStats.ts
export function useLoadEventStats() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    void dispatch(fetchEventStatsThunk());
  }, [dispatch]);
}

export function useEventStats() {
  const stats = useAppSelector(selectEventStats);
  const status = useAppSelector(selectEventStatsStatus);
  const loading = status === 'idle' || status === 'loading';
  return { stats, status, loading };
}
```

Add `useLoad<Domain>` / `use<Domain>` pairs under `src/store/hooks/` for each Redux-backed GET.

## Retry (reads only)

- `withRetry` in `http-client.ts` — **GET / idempotent reads only**
- Auth login and POST writes: **no retry**
- Defaults: 2–3 attempts, `initialDelayMs: 250`, statuses `408`, `429`, `5xx`, network `0`

## When adding a new GET endpoint

1. Types in `types/<domain>.ts`
2. BFF + `*-server.ts` + `*-client.ts` + `*.ts` domain fn with `{ signal? }`
3. `createAsyncThunk` with `condition` keyed off slice status
4. `useLoad*` in the dashboard (or domain) layout **once**
5. Children: `useAppSelector` or `use*` read hook — **no** `dispatch` in leaf components
6. Document in `api.md` + checklist in `api-strategy.md`

## Do not

- Call `fetchX()` or `dispatch(fetchXThunk())` from multiple sibling components
- Set slice `error` on aborted/canceled thunks
- Retry POST/login
- Put `NEXT_BACKEND_URL` in client bundles
- Import `http-client` / raw Axios in React components

## Related files

- `src/lib/api/http-client.ts` — `createHttpClient`, `ApiError`, `withRetry`, `isRequestCanceled`
- `src/lib/api/events.ts` — reference dedupe implementation
- `src/store/slices/eventsThunks.ts` — reference `condition` + `signal`
- `src/store/hooks/useEventStats.ts` — reference loader/read hooks
