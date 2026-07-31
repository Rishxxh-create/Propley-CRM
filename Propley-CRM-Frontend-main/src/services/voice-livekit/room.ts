import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RpcInvocationData,
} from 'livekit-client';
import { executeTool } from './tool-runner';
import { getPageContext } from './page-context';
import { presentations as readPresentations, customers as readCustomers } from './crm-source';

const MAX_VOCABULARY_TERMS = 60;

function collectVocabulary(): string[] {
  const terms = new Set<string>();
  for (const customer of readCustomers()) {
    if (customer.name?.trim()) terms.add(customer.name.trim());
  }
  for (const meeting of readPresentations()) {
    if (meeting.property?.trim()) terms.add(meeting.property.trim());
  }
  return [...terms].slice(0, MAX_VOCABULARY_TERMS);
}

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface TranscriptSegment {
  id: string;
  text: string;
  final: boolean;
}

export interface VoiceRoomEvents {
  onStateChange: (state: VoiceState) => void;
  onUserTranscript: (segment: TranscriptSegment) => void;
  onAgentTranscript: (segment: TranscriptSegment) => void;
  onAgentLost: () => void;
  onError: (error: Error) => void;
}

const AGENT_WAIT_MS = 12_000;

const AGENT_STATE_ATTRIBUTE = 'lk.agent.state';

function toVoiceState(raw: string | undefined): VoiceState {
  switch (raw) {
    case 'listening':
      return 'listening';
    case 'thinking':
      return 'thinking';
    case 'speaking':
      return 'speaking';
    default:
      return 'idle';
  }
}

export class VoiceRoom {
  private room: Room | null = null;
  private audioElements: HTMLAudioElement[] = [];

  constructor(private readonly events: VoiceRoomEvents) {}

  get connected(): boolean {
    return this.room?.state === 'connected';
  }

  async interruptAgent(): Promise<void> {
    const room = this.room;
    if (!room || room.state !== 'connected') return;
    const agent = [...room.remoteParticipants.values()][0];
    if (!agent) return;
    try {
      await room.localParticipant.performRpc({
        destinationIdentity: agent.identity,
        method: 'agent.interrupt',
        payload: '{}',
        responseTimeout: 2000,
      });
    } catch {}
  }

  async connect(): Promise<void> {
    if (this.room) return;

    const authToken =
      typeof window !== 'undefined' ? localStorage.getItem('propley_auth_token') : null;
    if (!authToken) {
      throw new Error('Please sign in to use the voice assistant.');
    }

    const res = await fetch('/api/voice/livekit/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `token request failed (${res.status})`);
    }
    const { token, url } = (await res.json()) as { token: string; url: string };

    const room = new Room({
      adaptiveStream: false,
      dynacast: false,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.room = room;

    room.registerRpcMethod('tool.execute', async (data: RpcInvocationData) => {
      try {
        const { name, args } = JSON.parse(data.payload) as {
          name: string;
          args: Record<string, unknown>;
        };
        const result = await executeTool(name, args ?? {});
        return JSON.stringify({ ok: true, result });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    room.registerRpcMethod('context.get', async () => {
      try {
        return JSON.stringify(getPageContext());
      } catch {
        return JSON.stringify({ path: '/', page: 'Propley', onScreen: [], wizard: null });
      }
    });

    room.registerRpcMethod('vocabulary.get', async () => {
      try {
        return JSON.stringify({ terms: collectVocabulary() });
      } catch {
        return JSON.stringify({ terms: [] });
      }
    });

    room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return;

        const el = track.attach() as HTMLAudioElement;
        el.autoplay = true;
        el.setAttribute('playsinline', 'true');
        document.body.appendChild(el);
        this.audioElements.push(el);

        void el.play().catch(() => {
          void room.startAudio().then(() => el.play().catch(() => undefined));
        });
      })
      .on(RoomEvent.ParticipantAttributesChanged, (changed: Record<string, string>) => {
        if (AGENT_STATE_ATTRIBUTE in changed) {
          this.events.onStateChange(toVoiceState(changed[AGENT_STATE_ATTRIBUTE]));
        }
      })
      .on(RoomEvent.TranscriptionReceived, (segments, participant) => {
        const isLocal = participant?.identity === room.localParticipant.identity;
        for (const segment of segments) {
          if (!segment.text.trim()) continue;
          const payload: TranscriptSegment = {
            id: segment.id,
            text: segment.text,
            final: segment.final,
          };
          if (isLocal) this.events.onUserTranscript(payload);
          else this.events.onAgentTranscript(payload);
        }
      })
      .on(RoomEvent.ParticipantDisconnected, () => {
        if (room.remoteParticipants.size === 0) {
          this.events.onAgentLost();
        }
      })
      .on(RoomEvent.Disconnected, () => {
        this.events.onStateChange('idle');
      });

    await room.connect(url, token);
    await room.localParticipant.setMicrophoneEnabled(true);
    await room.startAudio();
    this.events.onStateChange('listening');

    this.agentWatchdog = setTimeout(() => {
      if (this.room === room && room.remoteParticipants.size === 0) {
        this.events.onAgentLost();
      }
    }, AGENT_WAIT_MS);
  }

  private agentWatchdog: ReturnType<typeof setTimeout> | null = null;

  async disconnect(): Promise<void> {
    if (this.agentWatchdog) {
      clearTimeout(this.agentWatchdog);
      this.agentWatchdog = null;
    }
    for (const el of this.audioElements) el.remove();
    this.audioElements = [];
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
    this.events.onStateChange('idle');
  }
}
