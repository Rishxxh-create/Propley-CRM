import { useState, useEffect, memo, useSyncExternalStore } from 'react';
import {
  RiVideoChatLine,
  RiVideoOffLine,
  RiMicLine,
  RiMicOffLine,
  RiUser3Line,
  RiArrowUpSLine,
  RiArrowDownSLine
} from 'react-icons/ri';
import { cn } from '@/lib/utils';
import { ENX_PLAYER_OPTIONS, ENX_PLAYER_OPTIONS_CONTAIN, applyObserverVideoContain, muteLocalPlayback, unmuteRemotePlayback } from '@/lib/enx-media';

function subscribeNarrowViewport(onStoreChange: () => void) {
  const mq = window.matchMedia('(max-width: 1023px)');
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function getNarrowViewport() {
  return window.matchMedia('(max-width: 1023px)').matches;
}
import { getCustomerByIdFromStore } from '@/lib/customers-store';
import type { Participant as SessionParticipant } from '@/hooks/use-moderator-session';

type EnableXStreamAttributes = {
  name?: string;
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



export const ClientVideoCard = memo(function ClientVideoCard({
  stream,
  muteUser,
  requestUnmute,
  meeting,
  participantLocation,
}: {
  stream: EnableXStream;
  muteUser?: (id: string) => void;
  requestUnmute?: (id: string) => void;
  meeting?: any;
  participantLocation?: string;
}) {
  const streamId = stream.getID();
  const attrs = stream.getAttributes?.() || {};
  const name = (stream as { enxName?: string }).enxName || attrs.name || 'Client';

  const customerId = meeting?.clientId || (meeting?.client_email ? `cu-${meeting.client_email}` : null);
  const customer = customerId ? getCustomerByIdFromStore(customerId) : null;
  const location = participantLocation || customer?.city || '';

  const [isAudioMuted, setIsAudioMuted] = useState(stream.isAudioMuted ? stream.isAudioMuted() : false);
  const [isVideoMuted, setIsVideoMuted] = useState(stream.isVideoMuted ? stream.isVideoMuted() : false);

  useEffect(() => {
    const unsubscribeMute = subscribeRemoteMuteState(stream, setIsAudioMuted, setIsVideoMuted);
    let cleanupContain: (() => void) | undefined;

    let cancelled = false;
    let attempts = 0;
    const tryPlay = () => {
      if (cancelled) return;
      const el = document.getElementById(`stream-container-${streamId}`);
      if (el && el.childNodes.length > 0) {
        unmuteRemotePlayback(`stream-container-${streamId}`);
        cleanupContain?.();
        cleanupContain = applyObserverVideoContain(`stream-container-${streamId}`);
        return;
      }
      if (!el || !stream.stream) {
        if (attempts < 50) {
          attempts += 1;
          window.setTimeout(tryPlay, 300);
        }
        return;
      }
      stream.play(`stream-container-${streamId}`, ENX_PLAYER_OPTIONS_CONTAIN);
      unmuteRemotePlayback(`stream-container-${streamId}`);
      cleanupContain = applyObserverVideoContain(`stream-container-${streamId}`);
    };
    tryPlay();

    return () => {
      cancelled = true;
      unsubscribeMute();
      cleanupContain?.();
    };
  }, [stream, streamId]);

  return (
    <div className="group relative space-y-3">
      <div className="relative w-full aspect-video bg-zinc-900 border border-white/5 overflow-hidden transition-all duration-500 group-hover:border-gold/40 shadow-xl">
        {/* Isolated container for EnableX stream play to prevent removeChild React errors */}
        <div
          id={`stream-container-${streamId}`}
          className="absolute inset-0 w-full h-full z-10 overflow-hidden [&_video]:h-full [&_video]:w-full [&_video]:max-h-full [&_video]:max-w-full [&_video]:object-contain"
        />

        {isVideoMuted && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 gap-2 z-20">
            <RiVideoOffLine size={32} className="text-zinc-600 animate-pulse" />
            <span className="text-[9px] text-zinc-500 tracking-wider uppercase font-semibold">Camera Off</span>
          </div>
        )}
        {!isVideoMuted && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <RiVideoChatLine size={32} className="text-white/5 group-hover:text-gold/10 transition-colors duration-500" />
          </div>
        )}

        {/* MIC INDICATOR & CONTROL */}
        <button
          onClick={() => {
            const clientId = stream.getClientID ? stream.getClientID() : '';
            if (clientId) {
              if (isAudioMuted) {
                requestUnmute?.(clientId);
              } else {
                muteUser?.(clientId);
              }
            }
          }}
          className={cn(
            "absolute top-2 right-2 w-7 h-7 backdrop-blur-md border border-white/10 flex items-center justify-center hover:border-gold transition-colors z-30 cursor-pointer",
            isAudioMuted ? "bg-red-500/20 text-red-500" : "bg-obsidian/60 text-white/80"
          )}
          title={isAudioMuted ? "Ask to Unmute" : "Mute User"}
        >
          {isAudioMuted ? <RiMicOffLine size={12} /> : <RiMicLine size={12} />}
        </button>
      </div>

      <div className="px-1 space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white tracking-tight">{name}</p>
            <p className="text-[10px] text-zinc-400 font-medium">{location}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("w-1.5 h-1.5 rounded-full", isVideoMuted ? "bg-zinc-600" : "bg-gold animate-pulse")} />
            <span className="text-[8px] text-gold-light font-bold uppercase tracking-widest">
              {isVideoMuted ? 'CAMERA OFF' : 'CONNECTED'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export const ClientMobileVideoCard = memo(function ClientMobileVideoCard({
  stream,
  meeting,
  participantLocation,
}: {
  stream: EnableXStream;
  meeting?: any;
  participantLocation?: string;
}) {
  const streamId = stream.getID();
  const attrs = stream.getAttributes?.() || {};
  const name = (stream as { enxName?: string }).enxName || attrs.name || 'Client';

  const customerId = meeting?.clientId || (meeting?.client_email ? `cu-${meeting.client_email}` : null);
  const customer = customerId ? getCustomerByIdFromStore(customerId) : null;
  const location = participantLocation || customer?.city || '';

  const [isVideoMuted, setIsVideoMuted] = useState(stream.isVideoMuted ? stream.isVideoMuted() : false);
  const [isAudioMuted, setIsAudioMuted] = useState(stream.isAudioMuted ? stream.isAudioMuted() : false);

  useEffect(() => {
    const unsubscribeMute = subscribeRemoteMuteState(stream, setIsAudioMuted, setIsVideoMuted);
    let cleanupContain: (() => void) | undefined;

    let cancelled = false;
    let attempts = 0;
    const tryPlay = () => {
      if (cancelled) return;
      const el = document.getElementById(`stream-container-mobile-${streamId}`);
      if (el && el.childNodes.length > 0) {
        unmuteRemotePlayback(`stream-container-mobile-${streamId}`);
        cleanupContain?.();
        cleanupContain = applyObserverVideoContain(`stream-container-mobile-${streamId}`);
        return;
      }
      if (!el || !stream.stream) {
        if (attempts < 50) {
          attempts += 1;
          window.setTimeout(tryPlay, 300);
        }
        return;
      }
      stream.play(`stream-container-mobile-${streamId}`, ENX_PLAYER_OPTIONS_CONTAIN);
      unmuteRemotePlayback(`stream-container-mobile-${streamId}`);
      cleanupContain = applyObserverVideoContain(`stream-container-mobile-${streamId}`);
    };
    tryPlay();

    return () => {
      cancelled = true;
      unsubscribeMute();
      cleanupContain?.();
    };
  }, [stream, streamId]);

  return (
    <div key={streamId} className="relative aspect-video min-w-[160px] bg-zinc-900 border border-white/10 overflow-hidden shrink-0">
      {/* Isolated container for EnableX stream play to prevent removeChild React errors */}
      <div
        id={`stream-container-mobile-${streamId}`}
        className="absolute inset-0 w-full h-full z-10 overflow-hidden [&_video]:h-full [&_video]:w-full [&_video]:max-h-full [&_video]:max-w-full [&_video]:object-contain"
      />

      {isVideoMuted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 gap-1 z-20">
          <RiVideoOffLine size={16} className="text-zinc-600 animate-pulse" />
          <span className="text-[7px] text-zinc-500 tracking-wider uppercase font-semibold">Camera Off</span>
        </div>
      )}
      {!isVideoMuted && (
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <RiVideoChatLine size={24} className="text-white/10" />
        </div>
      )}
      <div className={cn(
        "absolute top-1 right-1 w-5 h-5 flex items-center justify-center border backdrop-blur-md z-30",
        isAudioMuted ? "bg-red-500/20 border-red-500/30 text-red-500" : "bg-obsidian/60 border-white/10 text-white/80"
      )}>
        {isAudioMuted ? <RiMicOffLine size={10} /> : <RiMicLine size={10} />}
      </div>
      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isVideoMuted ? "bg-zinc-600" : "bg-gold")} />
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-white uppercase tracking-widest">{name.split(' ')[0]}</span>
          <span className="text-[7px] font-medium text-zinc-400 uppercase tracking-widest">{location}</span>
        </div>
      </div>
    </div>
  );
});

export const ObserverSidebar = memo(function ObserverSidebar({
  participants = [],
  remoteStreams = [],
  localStream,
  advisorName = 'Advisor',
  muteUser,
  requestUnmute,
  muteAll: _muteAll,
  isLocalMicOn = true,
  isLocalCamOn = true,
  meeting, 
}: {
  participants?: SessionParticipant[];
  remoteStreams?: EnableXStream[];
  localStream?: EnableXStream;
  advisorName?: string;
  muteUser?: (id: string) => void;
  requestUnmute?: (id: string) => void;
  muteAll?: () => void;
  isLocalMicOn?: boolean;
  isLocalCamOn?: boolean;
  meeting?: any;
}) {
  const [isClientListVisible, setIsClientListVisible] = useState(true);
  const isNarrowViewport = useSyncExternalStore(
    subscribeNarrowViewport,
    getNarrowViewport,
    () => false,
  );
  void _muteAll;

  useEffect(() => {
    if (localStream) {
      const timer = setTimeout(() => {
        const el = document.getElementById("local-advisor-stream");
        if (el) {
          el.innerHTML = "";
          localStream.play("local-advisor-stream", ENX_PLAYER_OPTIONS);
          muteLocalPlayback("local-advisor-stream"); // don't echo the advisor's own mic
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [localStream, isLocalCamOn]);

  // Curated active-talker list — drop local + screen-share (101), dedupe by id.
  const seenIds = new Set<string>();
  const uniqueRemoteStreams = (remoteStreams || []).filter((stream) => {
    if (localStream && stream.getID() === localStream.getID()) return false;
    if (Number(stream.getID()) === 101) return false;
    if (seenIds.has(stream.getID())) return false;
    seenIds.add(stream.getID());
    return true;
  });

  return (
    <aside className="w-full lg:w-[360px] h-full flex flex-row lg:flex-col overflow-hidden shrink-0 border-l border-white/10 bg-obsidian">

      {/* ADVISOR SURFACE */}
      <div className='p-4 bg-obsidian border-b border-white/10 shrink-0'>
        <div className="relative aspect-video bg-zinc-900 overflow-hidden group min-w-[200px] lg:min-w-0 lg:w-full shrink-0 border border-white/5">
          {/* Isolated container for local advisor stream play to prevent removeChild React errors */}
          <div id="local-advisor-stream" className="absolute inset-0 w-full h-full z-10" />

          {!isLocalCamOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 gap-2 z-20">
              <RiVideoOffLine size={32} className="text-zinc-600 animate-pulse" />
              <span className="text-[9px] text-zinc-500 tracking-wider uppercase font-semibold">Camera Off</span>
            </div>
          )}
          {isLocalCamOn && (
            <div className="absolute inset-0 flex items-center justify-center z-0">
              <RiVideoChatLine size={40} className="text-white/5 group-hover:text-white/10 transition-colors" />
            </div>
          )}
          <div className={cn(
            "absolute top-2 right-2 w-7 h-7 backdrop-blur-md border flex items-center justify-center z-30 transition-colors",
            !isLocalMicOn ? "bg-red-500/20 border-red-500/30 text-red-500" : "bg-obsidian/60 border-white/10 text-white/80"
          )}>
            {!isLocalMicOn ? <RiMicOffLine size={12} /> : <RiMicLine size={12} />}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 z-10 pointer-events-none" />
          <div className="absolute bottom-4 left-4 flex items-center gap-2 z-15">
            <div className={cn("w-2 h-2 rounded-full", isLocalCamOn ? "bg-gold-light animate-pulse" : "bg-zinc-600")} />
            <span className="text-[10px] font-semibold text-white uppercase tracking-widest">{advisorName} (You)</span>
          </div>
        </div>
      </div>

      {/* CLIENT ACTIVITY LIST (Desktop) */}
      {!isNarrowViewport && (
      <div className="hidden lg:flex flex-1 flex-col min-h-0 bg-obsidian">
        <button
          onClick={() => setIsClientListVisible(!isClientListVisible)}
          className="w-full px-6 py-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-obsidian z-10 shrink-0 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2 text-[10px] font-bold text-white uppercase tracking-[0.15em]">
            <RiUser3Line className="text-gold-light" size={14} />
            Active Clients
            <span className="ml-2 text-zinc-500 font-medium">({uniqueRemoteStreams.length})</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] bg-gold-light/10 text-gold-light border border-gold-light/20 px-2 py-0.5 font-bold tracking-widest">LIVE</span>
            {isClientListVisible ? <RiArrowUpSLine size={16} className="text-zinc-500" /> : <RiArrowDownSLine size={16} className="text-zinc-500" />}
          </div>
        </button>

        {isClientListVisible && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar animation-slide-up">
            {uniqueRemoteStreams.map((stream) => {
              const streamId = stream.getClientID?.();
              const attrs = stream.getAttributes?.() || {};
              const streamName = (stream as { enxName?: string }).enxName || attrs.name || 'Client';
              const participant = participants?.find((p: any) => p.socketId === streamId || p.name === streamName);
              const pLoc = participant?.location;
              const participantLocation = pLoc ? `${pLoc.city || ''}${pLoc.city && pLoc.country ? ', ' : ''}${pLoc.country || ''}` : '';
              return (
                <ClientVideoCard
                  key={stream.getID()}
                  stream={stream}
                  muteUser={muteUser}
                  requestUnmute={requestUnmute}
                  meeting={meeting}
                  participantLocation={participantLocation}
                />
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* REMOTE VIDEO SURFACES (Mobile Row) */}
      {isNarrowViewport && (
      <div className="lg:hidden flex gap-2 p-3 overflow-x-auto custom-scrollbar">
        {uniqueRemoteStreams.map((stream) => {
          const streamId = stream.getClientID?.();
          const attrs = stream.getAttributes?.() || {};
          const streamName = (stream as { enxName?: string }).enxName || attrs.name || 'Client';
          const participant = participants?.find((p: any) => p.socketId === streamId || p.name === streamName);
          const pLoc = participant?.location;
          const participantLocation = pLoc ? `${pLoc.city || ''}${pLoc.city && pLoc.country ? ', ' : ''}${pLoc.country || ''}` : '';
          return (
            <ClientMobileVideoCard key={stream.getID()} stream={stream} meeting={meeting} participantLocation={participantLocation} />
          );
        })}
      </div>
      )}
    </aside>
  );
});


