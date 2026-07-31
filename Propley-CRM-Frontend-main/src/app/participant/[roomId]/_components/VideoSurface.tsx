'use client';

import { useState, useEffect, memo, useMemo, useSyncExternalStore, useRef } from 'react';
import { RiUser3Line, RiMicLine, RiMicOffLine } from 'react-icons/ri';
import { cn } from '@/lib/utils';
import { resolveMeetingAdvisorName } from '@/lib/api/meetings';
import {
  ENX_PLAYER_OPTIONS,
  applyObserverVideoContain,
  muteLocalPlayback,
  unmuteRemotePlayback,
} from '@/lib/enx-media';

type EnableXStreamAttributes = {
  name?: string;
  role?: string;
};

type EnableXMuteEvent = { clientId?: string };

type EnableXUserRecord = { audioMuted?: boolean; videoMuted?: boolean };

type EnableXRoom = {
  userList?: { get?: (clientId: string) => EnableXUserRecord | undefined };
  addEventListener: (event: string, cb: (e: EnableXMuteEvent) => void) => void;
  removeEventListener: (event: string, cb: (e: EnableXMuteEvent) => void) => void;
};

type EnableXStream = {
  getID: () => string;
  getAttributes?: () => EnableXStreamAttributes | undefined;
  getClientID?: () => string;
  clientId?: string;
  enxClientId?: string;
  room?: EnableXRoom;
  stream?: MediaStream;
  isVideoMuted?: () => boolean;
  isAudioMuted?: () => boolean;
  play: (containerId: string, options: { player: { height: string; width: string; class: string } }) => void;
  addEventListener: (event: string, cb: () => void) => void;
  removeEventListener: (event: string, cb: () => void) => void;
  enxName?: string;
};

// The EnableX SDK dispatches mute/unmute on the ROOM object keyed by clientId
// (`user-audio-muted` etc.) — not on the stream. The per-stream isAudioMuted()/
// isVideoMuted() getters only reflect the LOCAL track, so for a remote peer the
// authoritative source is room.userList.get(clientId). Read from there on every event,
// keyed by the stream's native clientId (always set on subscribe).
function subscribeRemoteMuteState(
  stream: EnableXStream,
  setIsAudioMuted: (v: boolean) => void,
  setIsVideoMuted: (v: boolean) => void,
): () => void {
  const room = stream.room;
  const peerId =
    stream.clientId || stream.enxClientId || (stream.getClientID ? stream.getClientID() : undefined);
  if (!room || !peerId) return () => {};

  const sync = (e: EnableXMuteEvent) => {
    if (e?.clientId && e.clientId !== peerId) return;
    const user = room.userList?.get?.(peerId);
    if (!user) return;
    setIsAudioMuted(!!user.audioMuted);
    setIsVideoMuted(!!user.videoMuted);
  };

  // Seed immediately from userList (the per-stream getters are unreliable for remotes).
  sync({ clientId: peerId });

  room.addEventListener('user-audio-muted', sync);
  room.addEventListener('user-audio-unmuted', sync);
  room.addEventListener('user-video-muted', sync);
  room.addEventListener('user-video-unmuted', sync);

  return () => {
    room.removeEventListener('user-audio-muted', sync);
    room.removeEventListener('user-audio-unmuted', sync);
    room.removeEventListener('user-video-muted', sync);
    room.removeEventListener('user-video-unmuted', sync);
  };
}

type MeetingContext = Record<string, unknown>;

interface VideoSurfaceProps {
  isVisible: boolean;
  localStream?: EnableXStream | null;
  remoteStreams?: EnableXStream[];
  advisorName?: string;
  userName?: string;
  meeting?: MeetingContext | null;
}

function streamDisplayName(stream: EnableXStream | null | undefined): string | undefined {
  if (!stream) return undefined;
  const attrs = stream.getAttributes?.() || {};
  return stream.enxName || attrs.name;
}

const ParticipantVideoCard = memo(function ParticipantVideoCard({
  stream,
  name,
  isLocal = false,
  isAdvisor = false,
  mutePlayback = false,
}: {
  stream: EnableXStream | null;
  name: string;
  isLocal?: boolean;
  isAdvisor?: boolean;
  /** Mute element playback (local self-view — prevents echo). */
  mutePlayback?: boolean;
}) {
  const streamId = stream?.getID?.() ?? (isLocal ? 'local' : 'advisor');
  // Seed from the SDK getter (falsy when unknown) so a connected peer doesn't flash
  // "Camera Off" / muted before the room mute events arrive.
  const [isVideoMuted, setIsVideoMuted] = useState(() => stream?.isVideoMuted?.() ?? false);
  const [isAudioMuted, setIsAudioMuted] = useState(() => stream?.isAudioMuted?.() ?? false);
  const playAttemptsRef = useRef(0);

  const containerId = isLocal
    ? 'local-participant-stream'
    : `stream-container-remote-${streamId}`;

  const ensureVideoTag = useMemo(() => {
    return (root: HTMLElement | null) => {
      if (!root) return false;
      const video = root.querySelector('video');
      if (!video) return false;

      // EnableX creates the <video>. Ensure mobile-friendly playback flags.
      try {
        (video as HTMLVideoElement).playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        (video as HTMLVideoElement).autoplay = true;
        video.setAttribute('autoplay', '');
        (video as HTMLVideoElement).controls = false;
        video.removeAttribute('controls');

        // iOS/Android autoplay policy: allow silent autoplay on mobile duplicates.
        if (mutePlayback) {
          (video as HTMLVideoElement).muted = true;
          video.setAttribute('muted', '');
        }
      } catch {
        // best-effort
      }
      return true;
    };
  }, [mutePlayback]);

  useEffect(() => {
    if (!stream) {
      queueMicrotask(() => {
        setIsVideoMuted(false);
        setIsAudioMuted(false);
      });
      return;
    }

    queueMicrotask(() => {
      setIsVideoMuted(stream.isVideoMuted ? stream.isVideoMuted() : false);
      setIsAudioMuted(stream.isAudioMuted ? stream.isAudioMuted() : false);
    });

    let active = true;
    const unsubscribeMute = subscribeRemoteMuteState(
      stream,
      (v) => { if (active) setIsAudioMuted(v); },
      (v) => { if (active) setIsVideoMuted(v); },
    );

    let stopFit: (() => void) | undefined;
    let stopVideoObserver: (() => void) | undefined;

    const playStream = () => {
      if (!active) return;
      const el = document.getElementById(containerId);
      if (!el || (!isLocal && !stream.stream)) {
        if (playAttemptsRef.current < 50) {
          playAttemptsRef.current += 1;
          window.setTimeout(playStream, 300);
        }
        return;
      }
      const hasVideo = !!el.querySelector('video');
      if (!isLocal && hasVideo) {
        stopFit?.();
        stopFit = applyObserverVideoContain(containerId);
        if (mutePlayback) muteLocalPlayback(containerId);
        else unmuteRemotePlayback(containerId);
        return;
      }
      if (isLocal || !hasVideo) {
        try {
          el.replaceChildren();
          stream.play(containerId, ENX_PLAYER_OPTIONS);

          // Ensure the injected <video> gets playsInline/autoplay quickly without polling.
          stopVideoObserver?.();
          if (!ensureVideoTag(el)) {
            const obs = new MutationObserver(() => {
              if (ensureVideoTag(el)) {
                obs.disconnect();
              }
            });
            obs.observe(el, { childList: true, subtree: true });
            const timeout = window.setTimeout(() => obs.disconnect(), 2000);
            stopVideoObserver = () => {
              obs.disconnect();
              window.clearTimeout(timeout);
            };
          }

          stopFit?.();
          stopFit = applyObserverVideoContain(containerId);
          if (mutePlayback) muteLocalPlayback(containerId);
          else unmuteRemotePlayback(containerId);
        } catch (e) {
          console.error('Failed to play stream:', e);
        }
      }
    };

    playStream();

    return () => {
      active = false;
      stopFit?.();
      stopVideoObserver?.();
      playAttemptsRef.current = 0;
      unsubscribeMute();
    };
  }, [stream, containerId, isLocal, mutePlayback, ensureVideoTag]);

  return (
    <div
      className={cn(
        'relative bg-zinc-900 border border-white/10 shrink-0 overflow-hidden rounded-lg',
        'max-[1000px]:w-[140px]! max-[1000px]:h-[80px]! min-[1001px]:w-[160px]! min-[1001px]:h-[100px]! min-[1001px]:min-w-0 min-[1001px]:self-center',
      )}
    >
      <div
        id={containerId}
        className="absolute inset-0 w-full h-full z-10 overflow-hidden [&_.vcx_player]:absolute [&_.vcx_player]:inset-0 [&_.vcx_player]:h-full [&_.vcx_player]:w-full [&_video]:absolute [&_video]:inset-0 [&_video]:h-full [&_video]:max-h-full [&_video]:w-full [&_video]:max-w-full [&_video]:object-contain [&_video]:object-center"
      />

      {isVideoMuted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 gap-1 z-20">
          <RiUser3Line size={isLocal ? 20 : 28} className="text-white/30" />
          <span className="text-[7px] text-zinc-500 tracking-wider uppercase font-semibold">Camera Off</span>
        </div>
      )}

      <div
        className={cn(
          'absolute top-1 right-1 w-5 h-5 flex items-center justify-center border z-30',
          isAudioMuted
            ? 'bg-red-500/20 border-red-500/30 text-red-500'
            : 'bg-obsidian/80 border-white/10 text-white/80',
        )}
      >
        {isAudioMuted ? <RiMicOffLine size={10} /> : <RiMicLine size={10} />}
      </div>

      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-80 pointer-events-none z-10" />

      {isAdvisor && <div className="absolute top-0 left-0 w-[2px] h-full bg-gold-light z-20" />}

      <div className="absolute bottom-1.5 left-1.5 flex flex-col gap-0.5 z-15 max-w-[calc(100%-12px)]">
        <div className="flex items-center gap-1 min-w-0">
          <div
            className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              isLocal ? 'bg-emerald-500' : 'bg-gold-light',
            )}
          />
          <span className="text-[8px] font-semibold text-white/90 uppercase tracking-wide truncate">
            {name}
          </span>
        </div>
      </div>
    </div>
  );
});

function subscribeNarrowViewport(onStoreChange: () => void) {
  const mq = window.matchMedia('(max-width: 767px)');
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function getNarrowViewport() {
  return window.matchMedia('(max-width: 767px)').matches;
}

export const VideoSurface = memo(function VideoSurface({
  isVisible,
  localStream,
  remoteStreams = [],
  advisorName,
  userName = 'Me',
  meeting,
}: VideoSurfaceProps) {
  const isNarrowViewport = useSyncExternalStore(
    subscribeNarrowViewport,
    getNarrowViewport,
    () => true,
  );

  const metadataAdvisorName = useMemo(
    () => resolveMeetingAdvisorName(meeting) || advisorName || 'Lead Advisor',
    [meeting, advisorName],
  );

  const { advisorStream, otherRemoteStreams } = useMemo(() => {
    const unique = (remoteStreams || []).filter((stream, index, self) => {
      if (self.findIndex((s) => s.getID() === stream.getID()) !== index) return false;
      if (localStream && stream.getID() === localStream.getID()) return false;
      if (Number(stream.getID()) === 101) return false;
      return true;
    });

    const advisor =
      unique.find((s) => {
        const attrs = s.getAttributes?.() || {};
        const nm = s.enxName || attrs.name;
        return (
          attrs.role === 'moderator' ||
          nm === metadataAdvisorName ||
          (s.getClientID && s.getClientID().includes('moderator'))
        );
      }) || unique[0];

    return {
      advisorStream: advisor,
      otherRemoteStreams: unique.filter((s) => s !== advisor),
    };
  }, [remoteStreams, localStream, metadataAdvisorName]);

  const displayAdvisorName =
    streamDisplayName(advisorStream) ||
    metadataAdvisorName ||
    'Lead Advisor';

  if (!isVisible) return null;

  const limitedOtherStreams = otherRemoteStreams.slice().reverse();

  return (
    <aside
      id="participant-video-surface"
      className={cn(
        'relative z-50 flex shrink-0 bg-[#1e1e1e] border-white/10',
        'w-full flex-row px-4 pl-2 py-2 border-b overflow-x-auto custom-scrollbar gap-2 items-center',
        'md:flex-col md:w-[176px] md:h-full md:border-l md:border-b-0 md:p-2 md:overflow-y-auto md:overflow-x-hidden md:items-center',
      )}
    >
      <style>{`
        @media (max-width: 1000px) {
          #participant-video-surface .vcx_stream.classic_vcx_stream {
            width: 140px !important;
            height: 80px !important;
          }
        }
        @media (min-width: 1001px) {
          #participant-video-surface .vcx_stream.classic_vcx_stream {
            width: 160px !important;
            height: 100px !important;
          }
        }
      `}</style>

      {/* Latest 2 clients first */}
      {limitedOtherStreams.slice(0, 2).map((stream) => {
        const attrs = stream.getAttributes?.() || {};
        const name = stream.enxName || attrs.name || 'Client';
        return (
          <ParticipantVideoCard
            key={stream.getID()}
            stream={stream}
            name={name}
          />
        );
      })}

      <ParticipantVideoCard
        stream={advisorStream || null}
        name={displayAdvisorName}
        isAdvisor
      />

      {userName ? (
        <ParticipantVideoCard
          stream={localStream || null}
          name={`${userName} (You)`}
          isLocal
          mutePlayback
        />
      ) : null}

      {/* Remaining clients */}
      {limitedOtherStreams.slice(2).map((stream) => {
        const attrs = stream.getAttributes?.() || {};
        const name = stream.enxName || attrs.name || 'Client';
        return (
          <ParticipantVideoCard
            key={stream.getID()}
            stream={stream}
            name={name}
          />
        );
      })}
    </aside>
  );
});
