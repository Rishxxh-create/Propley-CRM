/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback, useRef, memo, useMemo, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  RiTimeLine,
  RiUser3Line,
  RiVideoChatLine,
  RiVideoOffLine,
  RiMicOffLine,
  RiMicLine,
  RiShareForwardLine,
  RiLineChartLine,
  RiFileList3Line,
  RiStickyNoteLine,
} from "react-icons/ri";
import { cn } from "@/lib/utils";
import { PropleyLogo } from "@/components/PropleyLogo";
import { toast } from "@/lib/toast";
import { getCurrentAdvisorName } from "@/lib/current-advisor";
import { getLoggedInDisplayName } from "@/lib/auth-session";
import { getCustomerByIdFromStore } from "@/lib/customers-store";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/selectors/authSelectors";
import { ENX_PLAYER_OPTIONS, muteLocalPlayback, unmuteRemotePlayback } from "@/lib/enx-media";

function subscribeNarrowViewport(onStoreChange: () => void) {
  const mq = window.matchMedia('(max-width: 1023px)');
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function getNarrowViewport() {
  return window.matchMedia('(max-width: 1023px)').matches;
}
import { useModeratorSession } from "@/hooks/use-moderator-session";
import { useSlideDeck } from "./_hooks/useSlideDeck";
import { SessionTimer } from "./_components/SessionTimer";

const MobileObserverStrip = memo(function MobileObserverStrip({
  localStream,
  remoteStreams,
  meeting,
  participants = [],
}: {
  localStream: any;
  remoteStreams: any[];
  meeting?: any;
  participants?: any[];
}) {
  const stripStreams = useMemo(() => {
    const seenIds = new Set<string>();
    const remotes = (remoteStreams || []).slice().reverse().filter((stream) => {
      if (localStream && stream.getID() === localStream.getID()) return false;
      if (Number(stream.getID()) === 101) return false;
      if (seenIds.has(stream.getID())) return false;
      seenIds.add(stream.getID());
      return true;
    });

    const combined = [];
    if (localStream) {
      combined.push(localStream);
    }
    const remainingSlots = 3 - combined.length;
    combined.push(...remotes.slice(0, remainingSlots));

    return combined;
  }, [localStream, remoteStreams]);

  if (stripStreams.length === 0) return null;

  return (
    <div className="lg:hidden h-24 bg-[#1e1e1e] border-t border-white/10 flex items-center gap-2 px-2 overflow-x-auto shrink-0 custom-scrollbar">
      {stripStreams.map((stream) => {
        const streamId = stream.getClientID?.();
        const attrs = stream.getAttributes?.() || {};
        const streamName = attrs.name || 'Client';
        const participant = participants?.find((p: any) => p.socketId === streamId || p.name === streamName);
        const pLoc = participant?.location;
        const participantLocation = pLoc ? `${pLoc.city || ''}${pLoc.city && pLoc.country ? ', ' : ''}${pLoc.country || ''}` : '';
        return (
          <MobileStripCard
            key={stream.getID()}
            stream={stream}
            isLocal={!!localStream && stream.getID() === localStream.getID()}
            meeting={meeting}
            participantLocation={participantLocation}
          />
        );
      })}
    </div>
  );
});

const MobileStripCard = memo(function MobileStripCard({ stream, isLocal = false, meeting, participantLocation }: { stream: any; isLocal?: boolean; meeting?: any; participantLocation?: string }) {
  const streamId = stream.getID();
  const attrs = stream.getAttributes?.() || {};
  const name = (stream as { enxName?: string }).enxName || attrs.name || 'Client';

  const customerId = meeting?.clientId || (meeting?.client_email ? `cu-${meeting.client_email}` : null);
  const customer = customerId ? getCustomerByIdFromStore(customerId) : null;
  const location = participantLocation || customer?.city || '';

  const [isVideoMuted, setIsVideoMuted] = useState(stream.isVideoMuted ? stream.isVideoMuted() : false);
  const [isAudioMuted, setIsAudioMuted] = useState(stream.isAudioMuted ? stream.isAudioMuted() : false);

  useEffect(() => {
    const handleVideoMuted = () => setIsVideoMuted(true);
    const handleVideoUnmuted = () => setIsVideoMuted(false);
    const handleAudioMuted = () => setIsAudioMuted(true);
    const handleAudioUnmuted = () => setIsAudioMuted(false);

    stream.addEventListener('stream-video-muted', handleVideoMuted);
    stream.addEventListener('stream-video-unmuted', handleVideoUnmuted);
    stream.addEventListener('stream-audio-muted', handleAudioMuted);
    stream.addEventListener('stream-audio-unmuted', handleAudioUnmuted);

    let cancelled = false;
    let attempts = 0;
    const tryPlay = () => {
      if (cancelled) return;
      const el = document.getElementById(`stream-container-mobile-strip-${streamId}`);
      const containerId = `stream-container-mobile-strip-${streamId}`;
      if (el && el.childNodes.length > 0) {
        if (isLocal) muteLocalPlayback(containerId);
        else unmuteRemotePlayback(containerId);
        return;
      }
      if (!el || (!isLocal && !stream.stream)) {
        if (attempts < 50) {
          attempts += 1;
          window.setTimeout(tryPlay, 300);
        }
        return;
      }
      stream.play(containerId, ENX_PLAYER_OPTIONS);
      if (isLocal) muteLocalPlayback(containerId);
      else unmuteRemotePlayback(containerId);
    };
    tryPlay();

    return () => {
      cancelled = true;
      stream.removeEventListener('stream-video-muted', handleVideoMuted);
      stream.removeEventListener('stream-video-unmuted', handleVideoUnmuted);
      stream.removeEventListener('stream-audio-muted', handleAudioMuted);
      stream.removeEventListener('stream-audio-unmuted', handleAudioUnmuted);
    };
  }, [stream, streamId, isLocal]);

  return (
    <div className="relative aspect-video h-20 min-w-[140px] bg-zinc-900 border border-white/10 shrink-0 overflow-hidden">
      {/* Isolated container for EnableX stream play to prevent removeChild React errors */}
      <div id={`stream-container-mobile-strip-${streamId}`} className="absolute inset-0 w-full h-full z-10" />

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
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none z-10" />
      <div className="absolute bottom-1.5 left-1.5 flex flex-col gap-0.5 z-15">
        <div className="flex items-center gap-1">
          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isVideoMuted ? "bg-zinc-600" : "bg-gold-light")} />
          <span className="text-[8px] font-semibold text-white truncate max-w-[72px]">
            {name}
          </span>
        </div>
        <span className="text-[7px] text-zinc-400 truncate max-w-[80px] pl-2.5">{location}</span>
      </div>
    </div>
  );
});

const ModeratorHeader = dynamic(
  () => import("./_components/ModeratorHeader").then((m) => ({ default: m.ModeratorHeader })),
  { ssr: false },
);
const TheaterView = dynamic(
  () => import("./_components/TheaterView").then((m) => ({ default: m.TheaterView })),
  { ssr: false },
);
const ObserverSidebar = dynamic(
  () => import("./_components/ObserverSidebar").then((m) => ({ default: m.ObserverSidebar })),
  { ssr: false },
);
const FooterControls = dynamic(
  () => import("./_components/FooterControls").then((m) => ({ default: m.FooterControls })),
  { ssr: false },
);
const Drawers = dynamic(
  () => import("./_components/Drawers").then((m) => ({ default: m.Drawers })),
  { ssr: false },
);

type DrawerType = "analytics" | "script" | "visitors" | "notes" | null;

function ModeratorSessionShell({ roomId }: { roomId: string }) {
  const authUser = useAppSelector(selectAuthUser);
  const advisorName =
    authUser?.name?.trim() || getLoggedInDisplayName() || getCurrentAdvisorName();
  const {
    phase,
    meeting,
    participants,
    enablexToken,
    enablexRoomId,
    remoteStreams,
    emitUrlChange,
    emitMicState,
    endSession,
    muteUser,
    requestUnmute,
    muteAll,
    toggleLocalAudio,
    toggleLocalVideo,
    audioEnabled,
    videoEnabled,
    localStream,
    socketConnected,
    socket,
    isScreenSharing,
    toggleScreenShare,
    screenShareStream,
    screenSharePresenter,
    devices,
    currentCameraId,
    currentMicrophoneId,
    refreshDevices,
    switchCamera,
    switchMicrophone,
  } = useModeratorSession(roomId, advisorName);


  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [showObservers, setShowObservers] = useState(true);
  const isNarrowViewport = useSyncExternalStore(
    subscribeNarrowViewport,
    getNarrowViewport,
    () => false,
  );

  const {
    slides,
    isLoading: slidesLoading,
    error: slidesError,
    reload,
    activeSlideId,
    currentSlide,
    slideSrc,
    selectSlide,
    goPrev,
    goNext,
    canPrev,
    canNext,
    navReady,
  } = useSlideDeck();

  const participantCountRef = useRef(0);

  useEffect(() => {
    if (!slideSrc || !currentSlide || !socketConnected) return;
    emitUrlChange({ src: slideSrc, title: currentSlide.name });
  }, [slideSrc, currentSlide, emitUrlChange, socketConnected]);

  useEffect(() => {
    const count = participants.filter((p) => p.role === "participant").length;
    if (
      count > participantCountRef.current &&
      slideSrc &&
      currentSlide &&
      socketConnected
    ) {
      emitUrlChange({ src: slideSrc, title: currentSlide.name });
    }
    participantCountRef.current = count;
  }, [
    participants,
    slideSrc,
    currentSlide,
    socketConnected,
    emitUrlChange,
  ]);

  const handleMicToggle = useCallback(
    (next: boolean) => {
      toggleLocalAudio(next);
    },
    [toggleLocalAudio],
  );

  const handleCamToggle = useCallback(
    (next: boolean) => {
      toggleLocalVideo(next);
    },
    [toggleLocalVideo],
  );

  const executiveNodeClass =
    "h-10 px-6 flex items-center justify-center gap-3 transition-all duration-300 cursor-pointer backdrop-blur-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white select-none rounded-lg text-[10px] font-semibold";
  const activeNodeClass =
    "bg-gold-light border-gold-light/50 text-white shadow-[0_0_20px_rgba(255,201,119,0.3)]";

  if (phase === "authorizing") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a] text-white/70 text-xs font-medium">
        Authorizing session…
      </div>
    );
  }

  if (phase === "denied" || phase === "error") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a] text-white/70 text-xs font-medium">
        Unable to open sales portal for this meeting.
      </div>
    );
  }

  const participantCount = Math.max(participants.length, 1);

  return (
    <div className="fixed inset-0 w-full bg-[#0a0a0a] overflow-hidden font-sans text-white flex flex-col">
      <div
        className="absolute inset-0 pointer-events-none bg-linear-to-br from-zinc-900/40 via-[#0a0a0a] to-black"
        aria-hidden
      />

      <header className="lg:hidden flex items-center justify-between px-4 h-12 bg-black/60 backdrop-blur-md border-b border-white/10 z-50 shrink-0">
        <div className="flex items-center gap-2">
          <PropleyLogo size="sm" className="brightness-110 shrink-0" />
          <div
            className="hidden sm:flex h-8 px-2 bg-gold/10 border border-gold-light/20 text-[9px] font-bold text-gold-light items-center gap-1 tracking-wider uppercase"
          >
            Client: {meeting?.meeting_for || "Instant Presentation"}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href.replace("/moderator/", "/participant/"));
              toast.success("Participant link copied to clipboard");
            }}
            className="h-8 w-8 flex items-center justify-center bg-white/5 border border-white/10 text-white/70 hover:text-white"
          >
            <RiShareForwardLine size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <SessionTimer compact />
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === "analytics" ? null : "analytics")}
            className={cn("w-8 h-8 flex items-center justify-center border transition-colors",
              activeDrawer === "analytics" ? "bg-gold-light text-black border-gold-light" : "bg-white/5 text-gold-light border-white/10"
            )}
          >
            <RiLineChartLine size={16} />
          </button>
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === "script" ? null : "script")}
            className={cn("w-8 h-8 flex items-center justify-center border transition-colors",
              activeDrawer === "script" ? "bg-gold-light text-black border-gold-light" : "bg-white/5 text-gold-light border-white/10"
            )}
          >
            <RiFileList3Line size={16} />
          </button>
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === "notes" ? null : "notes")}
            className={cn("w-8 h-8 flex items-center justify-center border transition-colors",
              activeDrawer === "notes" ? "bg-gold-light text-black border-gold-light" : "bg-white/5 text-gold-light border-white/10"
            )}
          >
            <RiStickyNoteLine size={16} />
          </button>
          <button
            type="button"
            onClick={() => setActiveDrawer(activeDrawer === "visitors" ? null : "visitors")}
            className={cn("w-8 h-8 flex items-center justify-center border transition-colors",
              activeDrawer === "visitors" ? "bg-gold-light text-black border-gold-light" : "bg-gold-light/20 text-gold-light border-gold-light/40"
            )}
          >
            <RiUser3Line size={16} />
          </button>
        </div>
      </header>

      <div className="hidden lg:block shrink-0">
        <ModeratorHeader
          activeDrawer={activeDrawer}
          setActiveDrawer={setActiveDrawer}
          executiveNodeClass={executiveNodeClass}
          activeNodeClass={activeNodeClass}
          meeting={meeting}
          participantCount={participantCount}
        />
      </div>

      <main className="flex-1 flex flex-col lg:flex-row p-0 relative z-10 overflow-hidden bg-black/20">
        <div className="flex-1 relative flex flex-col min-h-0">
          <TheaterView
            isAnnotating={isAnnotating}
            showGuide={activeDrawer === "script"}
            onCloseGuide={() => setActiveDrawer(null)}
            slideSrc={slideSrc}
            slideName={currentSlide?.name ?? "Presentation"}
            guide={currentSlide?.guide}
            isLoading={slidesLoading}
            error={slidesError}
            onRetry={reload}
            screenShareActive={!!screenShareStream}
            screenSharePresenter={screenSharePresenter}
            socket={socket}
            advisorName={advisorName}
          />

          {showObservers && isNarrowViewport && (
            <MobileObserverStrip
              localStream={localStream}
              remoteStreams={remoteStreams}
              meeting={meeting}
              participants={participants}
            />
          )}
        </div>

        {showObservers && !isNarrowViewport && (
          <div className="hidden lg:block h-full min-h-0 shrink-0">
            <ObserverSidebar
              participants={participants}
              remoteStreams={remoteStreams}
              localStream={localStream}
              advisorName={advisorName}
              muteUser={muteUser}
              requestUnmute={requestUnmute}
              muteAll={muteAll}
              isLocalMicOn={audioEnabled}
              isLocalCamOn={videoEnabled}
              meeting={meeting}
            />
          </div>
        )}
      </main>


      <FooterControls
        slides={slides}
        slidesLoading={slidesLoading}
        activeSlide={activeSlideId ?? ""}
        setActiveSlide={selectSlide}
        isMicOn={audioEnabled}
        setIsMicOn={handleMicToggle}
        isCamOn={videoEnabled}
        setIsCamOn={handleCamToggle}
        isAnnotating={isAnnotating}
        setIsAnnotating={setIsAnnotating}
        activeDrawer={activeDrawer}
        setActiveDrawer={setActiveDrawer}
        executiveNodeClass={executiveNodeClass}
        participantCount={participantCount}
        showObservers={showObservers}
        setShowObservers={setShowObservers}
        endSession={endSession}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={toggleScreenShare}
        devices={devices}
        currentCameraId={currentCameraId}
        currentMicrophoneId={currentMicrophoneId}
        onSwitchCamera={switchCamera}
        onSwitchMicrophone={switchMicrophone}
        onRefreshDevices={refreshDevices}
      />


      <Drawers
        activeDrawer={activeDrawer}
        setActiveDrawer={setActiveDrawer}
        participants={participants}
        remoteStreams={remoteStreams}
        muteUser={muteUser}
        requestUnmute={requestUnmute}
        muteAll={muteAll}
        meetingUuid={meeting?.uuid}
      />
    </div>
  );
}

export default function ModeratorPage() {
  const params = useParams();
  const roomId = (params?.roomId as string) ?? "";

  if (!roomId) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a] text-white/70 text-xs">
        Invalid meeting link.
      </div>
    );
  }

  return <ModeratorSessionShell roomId={roomId} />;
}
