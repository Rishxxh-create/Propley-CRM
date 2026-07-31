# Redux implementation roadmap

Future code patterns for migrating Propley from **localStorage + window events** to **Redux Toolkit**. Implement in the order below to avoid breaking dashboard and session flows.

---

## Phase 0 — Done

- [x] Install `@reduxjs/toolkit`, `react-redux`
- [x] `src/store/index.ts`, `hooks.ts`, `authSlice.ts`
- [x] `ReduxProvider` in root `layout.tsx`
- [x] **Events stats** — `eventsSlice`, `fetchEventStatsThunk` (`condition` + `signal`), `useLoadEventStats` / `useEventStats`, Axios in-flight dedupe in `events.ts` (see `docs/axios-api-optimization.md`)

---

## Phase 1 — Auth (Done)

**Goal:** `AuthGuard`, `AuthOverlay`, `AuthPageGate`, and `TopBar` read auth from Redux; keep httpOnly cookies + BFF unchanged.

### 1.1 `createAsyncThunk` for session

Create `src/store/slices/authThunks.ts` (or colocate in slice file):

```ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { checkSession, login } from '@/lib/api/auth';
import { setAuthSession, clearAuthSession } from '@/lib/auth-session';
import type { LoginRequest } from '@/lib/api/types/auth';

export const fetchSession = createAsyncThunk(
  'auth/fetchSession',
  async (_, { rejectWithValue }) => {
    try {
      const res = await checkSession();
      setAuthSession('', res.user);
      return res.user;
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const res = await login(credentials);
      setAuthSession(res.token, res.user);
      return res.user;
    } catch (e) {
      return rejectWithValue(e);
    }
  },
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await clearAuthSession();
});
```

Extend `authSlice` with `extraReducers`:

```ts
import { fetchSession, loginUser, logoutUser } from './authThunks';

extraReducers: (builder) => {
  builder
    .addCase(fetchSession.pending, (state) => {
      state.status = 'loading';
    })
    .addCase(fetchSession.fulfilled, (state, action) => {
      state.user = action.payload;
      state.status = 'authenticated';
    })
    .addCase(fetchSession.rejected, (state) => {
      state.user = null;
      state.status = 'unauthenticated';
    })
    .addCase(loginUser.fulfilled, (state, action) => {
      state.user = action.payload;
      state.status = 'authenticated';
    })
    .addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.status = 'unauthenticated';
    });
},
```

### 1.2 Refactor components

| File | Change |
| :--- | :--- |
| `AuthGuard.tsx` | `dispatch(fetchSession())` instead of inline `checkSession` + `setAuthSession` |
| `AuthOverlay.tsx` | `dispatch(loginUser(credentials))` on submit |
| `AuthPageGate.tsx` | Select `state.auth.status` for redirect logic |
| `TopBar` / sidebar | `useAppSelector(s => s.auth.user)` for display name |

### 1.3 Optional selector

```ts
// src/store/selectors/authSelectors.ts
import type { RootState } from '@/store';

export const selectAuthUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.status === 'authenticated';
```

---

## Phase 2 — Advisor context

**Replaces:** `src/lib/current-advisor.ts` + `propley_current_advisor_updated`

```ts
// src/store/slices/advisorSlice.ts
export type AdvisorState = {
  currentAdvisorId: string;
};

// reducers: setCurrentAdvisorId
// init from localStorage in ReduxProvider or a hydrate thunk
```

Wire `AdvisorOverview`, dashboard header, and any `getCurrentAdvisorName()` call sites to selectors.

---

## Phase 3 — Presentations / Meetings (Done)

**Replaces:** direct `localStorage` + `propley_meetings_updated` in pages/components.

```ts
// src/store/slices/meetingsSlice.ts
import type { StoredMeeting } from '@/lib/mock-data';

export type MeetingsState = {
  items: StoredMeeting[];
  loaded: boolean;
};

// Thunks:
// - loadPresentations() → read presentations-store.ts
// - savePresentation(meeting) → write store + dispatch update
// - cancelPresentation(id)
```

**Listener pattern (optional):** `presentations-store.ts` stays the persistence API; thunk calls `getMeetings()` / `saveMeetings()` so one module owns the key `propley_meetings`.

Subscribe in `/meetings` page:

```ts
const meetings = useAppSelector((s) => s.meetings.items);
```

Remove `window.addEventListener('propley_meetings_updated', …)` once all writers go through Redux thunks.

---

## Phase 4 — CRM customers

**Replaces:** `customers-store.ts` + `propley_customers_updated`

```ts
// src/store/slices/customersSlice.ts
// Thunks: loadCustomers, addCustomer, updateDealStage
```

Used by `/customers`, `CustomerSelect`, client profile.

---

## Phase 5 — Secondary persistence

Lower priority; same thunk + slice pattern:

| Slice | Module today | localStorage key |
| :--- | :--- | :--- |
| `roles` | `/admin/roles` | `propley_roles` |
| `postMeetingNotes` | `post-meeting-notes.ts` | `propley_post_meeting_notes` |
| `clientNotes` | `client-notes.ts` | `propley_client_notes` |
| `inviteTemplates` | `invite-templates-store.ts` | `propley_invite_templates` |

---

## Phase 6 — Session UI (moderator / participant)

**Keep local/component state** for ephemeral session UI (mic, slides, drawer open). Only move to Redux if multiple distant components must share live session flags.

Do **not** put WebRTC or room signaling in Redux unless you add a real-time layer later.

---

## Store growth (target shape)

```ts
reducer: {
  auth: authReducer,
  advisor: advisorReducer,
  events: eventsReducer,
  meetings: meetingsReducer,
  projects: projectsReducer,
  customers: customersReducer,
  // roles, notes, templates — as needed
},
```

Consider `redux-persist` **only** if you need rehydrate-on-refresh for large lists; for Propley, explicit load thunks + existing localStorage modules are simpler and match current architecture.

---

## Component checklist (copy when implementing)

**Session GET (e.g. event stats) — load in layout, read in children:**

```tsx
// DashboardLayout.tsx
import { useLoadEventStats } from '@/store/hooks/useEventStats';

export default function DashboardLayout({ children }) {
  useLoadEventStats(); // once per dashboard session
  return children;
}

// AdvisorOverview.tsx — no dispatch
import { useEventStats } from '@/store/hooks/useEventStats';

export function AdvisorOverview() {
  const { stats, loading } = useEventStats();
  // ...
}
```

**Auth session (Phase 1) — keep fetch in `AuthGuard` only, not every child:**

```tsx
"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSession } from "@/store/slices/authThunks"; // after Phase 1
import { selectAuthUser } from "@/store/selectors/authSelectors";

export function AuthGuard({ children }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);

  useEffect(() => {
    void dispatch(fetchSession());
  }, [dispatch]);

  if (!user) return null;
  return children;
}
```

---

## Testing notes

- Thunks: mock `@/lib/api/auth` and assert slice transitions (`pending` → `fulfilled`).
- Components: wrap with `Provider` + `makeStore()` in tests.
- E2E: login still sets cookies via BFF; Redux is UI state only.

---

## Do not

- Store `NEXT_BACKEND_URL` or raw tokens in Redux
- Call `http-client` directly from components after migration — use thunks → domain (`auth.ts`, etc.)
- Duplicate meeting/customer types — import from `@/lib/mock-data` / existing stores
- Add Redux to Server Components
- `dispatch(fetchXThunk())` from multiple components for the same GET (use layout `useLoad*` + thunk `condition`; see `docs/axios-api-optimization.md`)

---

## Quick links

- Current setup: `docs/redux-toolkit.md`
- API layer for thunks: `docs/api-strategy.md`
- API dedupe / Axios: `docs/axios-api-optimization.md`
- Auth types: `src/lib/api/types/auth.ts`
