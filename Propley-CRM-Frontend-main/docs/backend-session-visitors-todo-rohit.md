# Backend TODO — Session Visitors controls (Rohit)

Frontend: Session Visitors drawer (`VisitorsPanel`) uses existing socket emits and EnableX stream state. The following backend work is required for full parity.

## Socket events to implement

| Event | Direction | Purpose |
| :--- | :--- | :--- |
| `moderator:unmute-all` | FE → server | Request all force-muted participants to unmute (today FE loops `moderator:unmute-request` per client) |
| `video-state-changed` | server → room | Broadcast `{ socketId, isVideoMuted }` when a peer toggles camera (today video status comes only from EnableX streams on moderator) |

## `participants-update` payload

Extend each participant object:

```ts
{
  socketId: string;
  name: string;
  role: 'moderator' | 'participant';
  isMuted?: boolean;       // audio — already used
  isVideoMuted?: boolean;  // camera — add for clients without active stream
  location?: { city?: string; country?: string };
}
```

## Optional (moderator force camera)

| Event | Purpose |
| :--- | :--- |
| `moderator:mute-user-video` | Force participant camera off (mirror `moderator:mute-user` for video) |

## Reference

- FE integration: `FE_MEETING_INTEGRATION.md` Step 7
- Emits in use: `src/hooks/use-moderator-session.ts` (`moderator:mute-user`, `moderator:mute-all`, `moderator:unmute-request`)
