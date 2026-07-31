# Frontend Integration Guide — Creating & Starting a Meeting

This guide walks the FE through the exact REST + Socket.IO calls needed to
create a meeting, provision an EnableX A/V room, and start a live cobrowsing
session. Every step has a copy-pasteable `curl` command.

> **Base URL** — replace `BASE_URL` in every example:
> - Local dev: `http://localhost:5001`
> - Deployed: `https://<your-host>` (e.g. the Render URL)

---

## Step 0 — Log in (get the moderator JWT)

The moderator (the salesperson/advisor) needs a JWT before creating a meeting.

```bash
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "advisor@example.com",
    "password": "yourpassword"
  }'
```

**Response**
```json
{
  "status": "success",
  "token": "eyJhbGciOi...",
  "user": { "id": 7, "name": "Advisor Name", "email": "...", ... }
}
```

Save `token`. Every authenticated call below uses it as `Authorization: Bearer $TOKEN`.

```bash
export TOKEN="eyJhbGciOi..."
```

---

## Step 1 — Create the meeting

The FE calls this when the moderator clicks **"Start Meeting"** (or schedules one) on the dashboard.

```bash
curl -X POST "$BASE_URL/api/v1/meetings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 30,
    "meeting_for": 42
  }'
```

**Body fields**

| Field         | Type          | Required | Default            | Notes |
|---------------|---------------|----------|--------------------|-------|
| `duration`    | number (min)  | No       | `5100`             | Meeting length in minutes. |
| `meeting_for` | number/string | No       | `"Luxury Advisory"`| Customer id (existing or new client). |
| `start_time`  | ISO string    | No       | `now()`            | For scheduled meetings; omit to start immediately. |

**Response**
```json
{
  "id": 123,
  "uuid": "a1b2c3d4",
  "moderator_id": 7,
  "start_time": "2026-05-26T15:00:00.000Z",
  "duration": 30,
  "meeting_for": 42,
  "state": {},
  "enablex_room_id": null
}
```

**FE must persist `uuid`** — every subsequent call (socket join, EnableX token, share link) uses it.

```bash
export UUID="a1b2c3d4"
```

Share link the FE builds:
```
https://<frontend-app>/meeting/$UUID
```

---

## Step 2 — Verify moderator (when the moderator opens the meeting page)

Before showing moderator-only controls (mute-all, end meeting, etc.), the FE
should confirm the logged-in user actually owns this meeting.

```bash
curl -X GET "$BASE_URL/api/v1/meetings/$UUID/moderator" \
  -H "Authorization: Bearer $TOKEN"
```

**Responses**

| Status | Meaning |
|--------|---------|
| `200`  | `{ "status": "authorized", "meeting": {...} }` — show moderator UI |
| `403`  | Logged-in user is not the moderator — hide controls / redirect |
| `404`  | Meeting not found — bad uuid |

---

## Step 3 — Fetch meeting metadata (participant side, no auth)

When a **client** opens the share link, the FE fetches public meeting info
to show the moderator's name and meeting title.

```bash
curl -X GET "$BASE_URL/api/v1/meetings/$UUID"
```

**Response**
```json
{
  "id": 123,
  "uuid": "a1b2c3d4",
  "start_time": "...",
  "duration": 30,
  "enablex_room_id": null,
  "notes": null,
  "moderator_name": "Advisor Name"
}
```

No auth header required — the share link is public by design.

---

## Step 4 — (Optional) Pre-create the EnableX room

You can skip this step — Step 5 (`/token`) lazily creates the room on first
call. Use this only if the FE wants the `roomId` before anyone joins.

```bash
curl -X POST "$BASE_URL/api/v1/enablex/create/$UUID" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Propley Suite" }'
```

**Responses**
```json
// First call
{ "roomId": "abc-123-xyz", "status": "created" }

// Subsequent calls (room already alive on EnableX)
{ "roomId": "abc-123-xyz", "status": "already_exists" }
```

If the stored room was deleted on EnableX's side, the backend clears it and
creates a fresh one transparently.

---

## Step 5 — Open the Socket.IO connection

Once the meeting page is mounted, the FE opens a Socket.IO connection to
`BASE_URL` (same origin). curl can't drive sockets — pseudocode:

```js
import { io } from "socket.io-client";

const socket = io(BASE_URL, { transports: ["websocket"] });

socket.on("connect", () => {
  // socket.id is now available — needed for Step 6
  socket.emit("join-meeting", {
    meetingId: UUID,
    role: "moderator",          // or "participant"
    name: "Advisor Name",       // or the client's name
    mobile: ""                  // optional, useful for participants
  });
});
```

**Events the FE must listen for**

| Event                  | When fired                              | Payload                       |
|------------------------|-----------------------------------------|-------------------------------|
| `participants-update`  | Anyone joins/leaves/location resolves   | Array of participants         |
| `urlChange`            | Slide/page change broadcast             | `{ src, title, isRecovered? }`|
| `negotiation-needed`   | Participant joined — start WebRTC       | `{ roomId }`                  |
| `session-ended`        | Moderator left/reset                    | `{ roomId, reason }`          |
| `force-mute-self`      | Moderator force-muted you               | `{ by }`                      |
| `mic-state-changed`    | Peer toggled mic                        | `{ socketId, isMuted }`       |
| `unmute-request`       | Moderator asked you to unmute           | `{ by, from }`                |
| `client-device-info`   | Moderator only — clients' device labels | `{ senderId, devices, ... }`  |
| `whiteboard-draw`/`clear`, `moderator-cursor`, `moderator-layout-shift` | Live collab relay | passthrough |
| `answer`, `callerCandidates`, `calleeCandidates` | WebRTC signaling relay | passthrough |

---

## Step 6 — Get the EnableX token (A/V join)

After the socket is connected (so the FE has `socket.id`), request the token
that the EnableX JS SDK will use to join the audio/video room.

```bash
curl -X POST "$BASE_URL/api/v1/enablex/token" \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "'"$UUID"'",
    "name": "Advisor Name",
    "role": "moderator",
    "socketId": "<socket.id from Step 5>"
  }'
```

For a participant joining:
```bash
curl -X POST "$BASE_URL/api/v1/enablex/token" \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "'"$UUID"'",
    "name": "Client Name",
    "role": "participant",
    "socketId": "<socket.id from Step 5>"
  }'
```

**Response**
```json
{ "token": "<enablex-jwt>", "roomId": "abc-123-xyz" }
```

Feed `token` to the EnableX client SDK (`EnxRtc.joinRoom(token, ...)`).
If no EnableX room exists yet for this meeting, the backend creates it
transparently on the first `/token` call.

---

## Step 7 — In-meeting socket emits (FE → server)

| Action                  | Emit                                        | Payload                              |
|-------------------------|---------------------------------------------|--------------------------------------|
| Change slide/page       | `urlChange`                                 | `{ src, title }`                     |
| Toggle own mic          | `mic-state-changed`                         | `{ isMuted: boolean }`               |
| Mute everyone           | `moderator:mute-all`                        | _(none — moderator only)_            |
| Mute one user           | `moderator:mute-user`                       | `{ targetSocketId }`                 |
| Ask user to unmute      | `moderator:unmute-request`                  | `{ targetSocketId }`                 |

**Backend follow-up (Rohit):** `docs/backend-session-visitors-todo-rohit.md` — `moderator:unmute-all`, `video-state-changed`, `isVideoMuted` on `participants-update`.
| Decline unmute request  | `participant:unmute-declined`               | `{ to: <moderatorSocketId> }`        |
| Share device labels     | `client-device-info`                        | `{ devices: {...} }`                 |
| Whiteboard draw/clear   | `whiteboard-draw` / `whiteboard-clear`      | drawing payload                      |
| Moderator cursor        | `moderator-cursor`                          | `{ x, y, roomId? }`                  |
| Layout change           | `moderator-layout-shift`                    | layout payload                       |

---

## Step 8 — In-meeting REST calls (notes, transcript, dashboard)

### Add a note
```bash
curl -X POST "$BASE_URL/api/v1/meetings/$UUID/notes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "note": "Customer is interested in the 3BHK unit." }'
```

### Edit a note
```bash
curl -X PATCH "$BASE_URL/api/v1/meetings/$UUID/notes/<noteId>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "note": "Updated note text." }'
```

### Delete a note
```bash
curl -X DELETE "$BASE_URL/api/v1/meetings/$UUID/notes/<noteId>" \
  -H "Authorization: Bearer $TOKEN"
```

### Save transcript (call once at end, or periodically)
```bash
curl -X PATCH "$BASE_URL/api/v1/meetings/$UUID/transcript" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "transcript": "Full transcript text..." }'
```

### Dashboard — list all meetings
```bash
curl -X GET "$BASE_URL/api/v1/meetings/all" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Step 9 — End the meeting

When the moderator clicks **"End Meeting"** / hangs up, the FE should:

1. Call `/reset` (clears in-memory state, deletes the EnableX room).
2. Disconnect the socket.

```bash
curl -X POST "$BASE_URL/api/v1/meetings/$UUID/reset" \
  -H "Authorization: Bearer $TOKEN"
```

**Response**
```json
{ "status": "success" }
```

> If the moderator just closes the tab, the server's disconnect handler runs
> the same cleanup automatically and broadcasts `session-ended` to remaining
> participants. The explicit `/reset` is preferred because it lets the FE
> show a clean "Meeting ended" screen.

---

## Full happy-path sequence (TL;DR)

```
[Moderator dashboard]
  1. POST /auth/login                              → JWT
  2. POST /api/v1/meetings                         → uuid

[Moderator opens /meeting/<uuid>]
  3. GET  /api/v1/meetings/:uuid/moderator         → 200 (gate UI)
  4. socket.connect() → emit "join-meeting" (role: moderator)
  5. POST /api/v1/enablex/token                    → token, roomId
  6. EnxRtc.joinRoom(token, ...)                   → A/V live

[Client opens the share link]
  3'. GET  /api/v1/meetings/:uuid                  → meeting metadata
  4'. socket.connect() → emit "join-meeting" (role: participant)
  5'. POST /api/v1/enablex/token (role: participant) → token, roomId
  6'. EnxRtc.joinRoom(token, ...)                  → A/V live

[During the meeting]
  emit "urlChange" / "mic-state-changed" / ...
  POST notes, PATCH transcript as needed

[Moderator ends meeting]
  POST /api/v1/meetings/:uuid/reset
  socket.disconnect()
```

---

## Error cheat sheet

| Code | Where                  | Meaning / FE action                                  |
|------|------------------------|------------------------------------------------------|
| 400  | `/auth/*`              | Missing required body fields                         |
| 400  | `/notes`, `/transcript`| Body field must be a string                          |
| 401  | `/auth/login`          | Wrong email/password                                 |
| 403  | `/:uuid/moderator`     | Logged-in user is not this meeting's moderator       |
| 404  | `/:uuid/*`             | Meeting uuid doesn't exist                           |
| 500  | any                    | Server error — show toast, log, retry where safe     |

---

## Source references

- Meeting REST routes — [src/routes/meetings.js](../src/routes/meetings.js)
- Meeting service (DB layer) — [src/services/MeetingService.js](../src/services/MeetingService.js)
- EnableX REST routes — [src/enablex/enablexRoutes.js](../src/enablex/enablexRoutes.js)
- Socket handler — [src/socket/meetingHandler.js](../src/socket/meetingHandler.js)
- Auth routes — [src/routes/auth.js](../src/routes/auth.js)
- Server entry / route mounts — [index.js](../index.js)
