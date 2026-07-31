# Propley API

**Backend:** `NEXT_BACKEND_URL` (default `http://localhost:5001`)  
**Frontend BFF:** same-origin `/api/*` proxies to backend (no CORS, URL not exposed to browser).

---

## Auth

### `POST /auth/login`

Authenticate a consultant.

|               |                                      |
| ------------- | ------------------------------------ |
| **Backend**   | `POST {NEXT_BACKEND_URL}/auth/login` |
| **BFF (app)** | `POST /api/auth/login`               |
| **Auth**      | None                                 |

**Body**

```json
{ "email": "srn@mail.com", "password": "123456!" }
```

**200**

```json
{
  "status": "success",
  "token": "<jwt>",
  "user": {
    "id": 5,
    "name": "Srn",
    "email": "srn@mail.com",
    "phone": "+15555555555",
    "project_ids": ["premium-showcase"]
  }
}
```

**Errors** — proxied from backend; BFF may return `400` for missing fields.

| Status    | Body                                               |
| --------- | -------------------------------------------------- |
| `400`     | `{ "message": "email and password are required" }` |
| `4xx/5xx` | `{ "message": "..." }`                             |

**Client**

```ts
import { login } from "@/lib/api/auth";
import { setAuthSession } from "@/lib/auth-session";

const res = await login({ email, password });
setAuthSession(res.token, res.user);
```

**Layers:** `auth-client.ts` (Axios `/api/auth`) → `auth.ts` (`login`) → BFF → `auth-server.ts` → backend. See [`api-strategy.md`](./api-strategy.md).

**Cookies** (set by BFF on login): `propley_auth_token` (httpOnly), `propley_auth_user` (httpOnly). User mirrored to `localStorage` `propley_auth_user` for dashboard UI.

### `GET /auth/session`

|          |                             |
| -------- | --------------------------- |
| **BFF**  | `GET /api/auth/session`     |
| **Auth** | Cookie `propley_auth_token` |

**200** — `{ "status": "success", "user": { ... } }`  
**401** — `{ "status": "unauthenticated" }`

### `POST /auth/logout`

Clears auth cookies. **BFF:** `POST /api/auth/logout`

---

## Events

### `GET /api/v1/events/stats`

Advisor engagement summary for dashboard stat cards (`AdvisorOverview`).

|               |                                                                  |
| ------------- | ---------------------------------------------------------------- |
| **Backend**   | `GET {NEXT_BACKEND_URL}/api/v1/events/stats`                     |
| **BFF (app)** | `GET /api/v1/events/stats`                                       |
| **Auth**      | Cookie `propley_auth_token` → `Authorization: Bearer` to backend |

**200**

```json
{
  "total": 7,
  "portfolio_views": 467,
  "engagement_rate": "86%"
}
```

**Errors**

| Status    | Body                            |
| --------- | ------------------------------- |
| `401`     | `{ "message": "Unauthorized" }` |
| `4xx/5xx` | `{ "message": "..." }`          |

**Client**

```ts
// Layout — fetch once (deduped)
import { useLoadEventStats } from "@/store/hooks/useEventStats";

function DashboardLayout({ children }) {
  useLoadEventStats();
  return children;
}

// Page — read only; never dispatch here
import { useEventStats } from "@/store/hooks/useEventStats";

function AdvisorOverview() {
  const { stats, loading } = useEventStats();
  // stats.total, stats.portfolio_views, stats.engagement_rate
}
```

**Optimization:** thunk `condition` (skip if `loading` / `loaded`) + shared in-flight promise in `events.ts` + Axios `signal`. See [`api-strategy.md`](./api-strategy.md#performance--deduplication).

**Layers:** `events-client.ts` → `events.ts` → BFF `[...segments]` → `endpoints/events.ts` → backend.

**Reset:** `clearEventStats()` on sign-out → next dashboard load refetches.

### `GET /api/v1/events/:meetingUuid/activity`

Chronological session events for post-meeting intelligence (`MeetingActivityLog`).

|               |                                                                  |
| ------------- | ---------------------------------------------------------------- |
| **Backend**   | `GET {NEXT_BACKEND_URL}/api/v1/events/{meetingUuid}/activity`    |
| **BFF (app)** | `GET /api/v1/events/{meetingUuid}/activity`                      |
| **Auth**      | Cookie `propley_auth_token` → `Authorization: Bearer` to backend |

**200** — array of `{ id, meeting_id, event_id, name, time, duration, user_name, user_mobile, user_title }`

**Client**

```ts
import {
  useLoadMeetingActivity,
  useMeetingActivity,
} from "@/store/hooks/useMeetings";

useLoadMeetingActivity(meetingUuid);
const { events, loading } = useMeetingActivity(meetingUuid);
```

**Load:** dispatch from post-analysis page only (per `meetingUuid`). Thunk `condition` skips repeat fetch for same uuid.

**Layers:** `events-client.ts` → `events.ts` → BFF `[...segments]` → `endpoints/events.ts` → backend.

### `GET /api/v1/events/live-stream`

Recent cross-session activity for the advisor dashboard (`AdvisorOverview` live feed).

|               |                                                                  |
| ------------- | ---------------------------------------------------------------- |
| **Backend**   | `GET {NEXT_BACKEND_URL}/api/v1/events/live-stream`               |
| **BFF (app)** | `GET /api/v1/events/live-stream`                                 |
| **Auth**      | Cookie `propley_auth_token` → `Authorization: Bearer` to backend |

**200** — array of `{ id, meeting_id, event_id, name, time, duration, user_name, user_mobile, user_title, meeting_for }`

**Client**

```ts
// Layout — fetch once (deduped)
import { useLoadLiveStream } from "@/store/hooks/useEventStats";

// Dashboard — read only
import { useLiveStream } from "@/store/hooks/useEventStats";

const { events, loading } = useLiveStream();
```

**Optimization:** same pattern as stats — `useLoadLiveStream()` in `DashboardLayout`, thunk `condition`, in-flight dedupe in `events.ts`. Cleared with `clearEventStats()` on sign-out.

**Layers:** `events-client.ts` → `events.ts` → BFF `[...segments]` → `endpoints/events.ts` → backend.

**Guide:** step-by-step walkthrough with this endpoint → [`adding-api-endpoint.md`](./adding-api-endpoint.md).

---

## Meetings

### `GET /api/v1/meetings/all`

All advisor sessions for presentations registry and calendar.

|               |                                                                  |
| ------------- | ---------------------------------------------------------------- |
| **Backend**   | `GET {NEXT_BACKEND_URL}/api/v1/meetings/all`                     |
| **BFF (app)** | `GET /api/v1/meetings/all`                                       |
| **Auth**      | Cookie `propley_auth_token` → `Authorization: Bearer` to backend |

**200** — array of meeting rows (`uuid`, `meeting_for`, `start_time`, `is_active`, `completed_at`, `moderator_name`, `client_count`, `analytics`, …). Mapped to `StoredMeeting` via `mapApiMeetingToStored`.

**Client**

```ts
// Layout — fetch once under /meetings/*
import { useLoadMeetings } from "@/store/hooks/useMeetings";

// Pages — read API list or fall back to localStorage
import { usePresentationsList } from "@/store/hooks/useMeetings";

const meetings = usePresentationsList();
```

**Optimization:** `src/app/meetings/layout.tsx` calls `useLoadMeetings()` once; thunk `condition` + in-flight dedupe in `meetings.ts`.

**Layers:** `meetings-client.ts` → `meetings.ts` → BFF `[...segments]` → `endpoints/meetings.ts` → backend.

**Reset:** `clearMeetings()` on sign-out.

---

## Projects

### `GET /api/v1/projects`

Project catalog for presentations filtering and creation.

|               |                                                                  |
| ------------- | ---------------------------------------------------------------- |
| **Backend**   | `GET {NEXT_BACKEND_URL}/api/v1/projects`                         |
| **BFF (app)** | `GET /api/v1/projects`                                           |
| **Auth**      | Cookie `propley_auth_token` → `Authorization: Bearer` to backend |

**200**

```json
{
  "projects": [
    {
      "id": "premium-showcase",
      "name": "Premium Showcase",
      "slides": ["/slides/1.jpg"]
    }
  ],
  "roles": ["advisor"]
}
```

**Optimization:** `createSingletonGet` dedupe in `projects.ts`, Redux Thunk `condition` checks for `idle`/`error`.

**Layers:** `projects-client.ts` → `projects.ts` → BFF `/api/v1/projects/route.ts` → `backend-proxy` → backend.

---

## Env

| Variable           | Scope  | Example                 |
| ------------------ | ------ | ----------------------- |
| `NEXT_BACKEND_URL` | Server | `http://localhost:5001` |

---

## Adding endpoints

**Full walkthrough (registry pattern):** [`adding-api-endpoint.md`](./adding-api-endpoint.md).

### Authenticated GET (registry — preferred)

1. Types → `src/lib/api/types/<domain>.ts` (one file per domain)
2. Validator → `src/lib/api/endpoints/validators.ts`
3. Registry entry → `src/lib/api/endpoints/<domain>.ts` (BFF catch-all already wired)
4. Domain → `createSingletonGet` / `createKeyedGet` in `<domain>.ts`
5. Redux (if shared read) → thunk `condition` + **one** `useLoad*` in layout
6. Document one block here

**No new** `route.ts` or `*-server.ts` per GET — BFF: `app/api/v1/<domain>/[...segments]/route.ts`.

### POST / auth / custom

Explicit `src/app/api/<path>/route.ts` + server fn (see Auth section). Follow [`api-strategy.md`](./api-strategy.md).
