# Redux Toolkit — Propley setup

Reference for the **installed** Redux Toolkit (RTK) stack in the Sales Portal. Use with `docs/redux-implementation-roadmap.md` for planned slices and migrations.

---

## Packages

| Package | Role |
| :--- | :--- |
| `@reduxjs/toolkit` | `configureStore`, `createSlice`, future `createAsyncThunk` |
| `react-redux` | `Provider`, `useDispatch`, `useSelector` |

Installed via `npm install @reduxjs/toolkit react-redux`.

---

## Why RTK here

Propley today keeps a lot of UI state in **localStorage + custom events** (`propley_meetings_updated`, `propley_auth_updated`, etc.). RTK gives:

- One predictable global state tree for **auth**, **presentations**, **CRM**, **advisor context**
- Typed selectors/actions (less prop drilling)
- A path to **async thunks** that call existing domain modules (`@/lib/api/auth`, `presentations-store`, …) without duplicating HTTP logic

**Not replaced yet:** `AuthGuard`, `auth-session.ts`, and presentation localStorage modules still run as before. Redux is wired and ready; components opt in slice by slice.

---

## File layout

```
src/
├── store/
│   ├── index.ts              # configureStore, RootState, AppDispatch
│   ├── hooks.ts              # useAppDispatch, useAppSelector, useAppStore
│   └── slices/
│       └── authSlice.ts      # auth user + status (initial slice)
└── components/providers/
    └── ReduxProvider.tsx     # Client Provider (per-request store instance)
```

Root layout wraps the app:

```tsx
// src/app/layout.tsx
<ReduxProvider>
  <TooltipProvider>{children}</TooltipProvider>
</ReduxProvider>
```

---

## Store (`src/store/index.ts`)

```ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
    },
    devTools: process.env.NODE_ENV !== 'production',
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
```

- **`makeStore()`** — factory so each client tree gets one store (Next.js App Router safe).
- **`devTools`** — Redux DevTools in development only.

When adding slices, register reducers here:

```ts
reducer: {
  auth: authReducer,
  meetings: meetingsReducer,
  events: eventsReducer,
  projects: projectsReducer,
},
```

---

## Typed hooks (`src/store/hooks.ts`)

Always use these instead of raw `useDispatch` / `useSelector`:

```ts
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const dispatch = useAppDispatch();
const user = useAppSelector((state) => state.auth.user);
const status = useAppSelector((state) => state.auth.status);
```

---

## Auth slice (`src/store/slices/authSlice.ts`)

| Field | Type | Meaning |
| :--- | :--- | :--- |
| `user` | `AuthUser \| null` | Logged-in consultant (from `@/lib/api/types/auth`) |
| `status` | `AuthStatus` | `idle` \| `loading` \| `authenticated` \| `unauthenticated` |

**Actions:**

| Action | Effect |
| :--- | :--- |
| `setAuthLoading` | `status → loading` |
| `setAuthUser(user)` | Sets user, `status → authenticated` |
| `clearAuthUser` | Clears user, `status → unauthenticated` |
| `setAuthIdle` | `status → idle` |

**Example — after successful login (future wiring in `AuthOverlay`):**

```ts
import { setAuthUser } from '@/store/slices/authSlice';
import { useAppDispatch } from '@/store/hooks';
import { login } from '@/lib/api/auth';
import { setAuthSession } from '@/lib/auth-session';

const dispatch = useAppDispatch();

const res = await login({ email, password });
setAuthSession(res.token, res.user);
dispatch(setAuthUser(res.user));
```

**Example — logout:**

```ts
import { clearAuthUser } from '@/store/slices/authSlice';
import { clearAuthSession } from '@/lib/auth-session';

await clearAuthSession();
dispatch(clearAuthUser());
```

---

## Provider (`src/components/providers/ReduxProvider.tsx`)

Client-only wrapper. Creates the store once per mount with `useRef` (avoids recreating store on re-renders).

```tsx
"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "@/store";

export default function ReduxProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) storeRef.current = makeStore();
  return <Provider store={storeRef.current}>{children}</Provider>;
}
```

**Rules:**

- Only import Redux hooks in **`"use client"`** components (or hooks files used by them).
- Do **not** import the store in Server Components or Route Handlers.
- Session token stays in **httpOnly cookies** (`auth-cookies.ts`); Redux holds **user profile** for UI only.

---

## DevTools

1. Run `npm run dev`
2. Install [Redux DevTools](https://github.com/reduxjs/redux-devtools) browser extension
3. Inspect `auth` slice actions and state

---

## Conventions (Propley)

1. **Slices** live under `src/store/slices/<name>Slice.ts`.
2. **Async work** — prefer `createAsyncThunk` calling `@/lib/api/*` domain functions (see roadmap), not Axios inside components.
3. **Persistence** — keep localStorage writes in existing `*-store.ts` / `*-session.ts` modules; thunks can call them after mutating Redux (single source of truth in slice, disk as cache).
4. **Selectors** — add `src/store/selectors/` when derived state grows (e.g. role from `user` + `roles.ts`).
5. **No secrets in Redux** — never put JWT or backend URLs in state; cookies + BFF only.
6. **Fetch once** — `useLoad*` hooks in layout (`src/store/hooks/useEventStats.ts`); leaf components use `use*` read hooks or selectors only. Thunks use `condition` to skip when `loading` / `loaded`. See `docs/api-strategy.md` § Performance & deduplication.

---

## Related docs

| Doc | Contents |
| :--- | :--- |
| `docs/redux-implementation-roadmap.md` | Planned slices, thunks, migration order |
| `docs/api-strategy.md` | BFF + domain layer (thunks call into this) |
| `docs/axios-api-optimization.md` | Dedupe, cancellation, loader hooks |
| `src/lib/auth-session.ts` | localStorage mirror for auth user (until full Redux migration) |
