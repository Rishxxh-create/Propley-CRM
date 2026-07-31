'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { EntryScreen } from './_components/EntryScreen';
import { useParticipantSession } from '@/hooks/use-participant-session';
import { resolveMeetingAdvisorName } from '@/lib/api/meetings';
import { apiClient } from '@/lib/api/api-client';

const ParticipantTheater = dynamic(
  () => import('./_components/ParticipantTheater').then((m) => m.ParticipantTheater),
  { ssr: false }
);

const VideoSurface = dynamic(
  () => import('./_components/VideoSurface').then((m) => m.VideoSurface),
  { ssr: false }
);

const CommandBar = dynamic(
  () => import('./_components/CommandBar').then((m) => m.CommandBar),
  { ssr: false }
);

function readStoredParticipantEntry(roomId: string) {
  if (!roomId) return { hasEntered: false, userName: '', phone: '' };
  // Avoid hydration mismatch: never read localStorage during initial render.
  if (typeof window === 'undefined') return { hasEntered: false, userName: '', phone: '' };
  try {
    const saved = localStorage.getItem(`propley_participant_${roomId}`);
    if (!saved) return { hasEntered: false, userName: '', phone: '' };
    const { name, phone: savedPhone } = JSON.parse(saved);
    if (name && savedPhone) {
      return { hasEntered: true, userName: name, phone: savedPhone };
    }
  } catch { /* ignore malformed storage */ }
  return { hasEntered: false, userName: '', phone: '' };
}

export default function ParticipantPage() {
  const params = useParams();
  const roomId = (params?.roomId as string) ?? '';

  const [hasEntered, setHasEntered] = useState(false);
  const [userName, setUserName] = useState('');
  const [phone, setPhone] = useState('');
  const [presenceVisible, setPresenceVisible] = useState(true);
  const [isAnnotating, setIsAnnotating] = useState(false);

  const onEndRef = useRef<() => void>(() => {});
  const stableOnEnd = useCallback(() => { onEndRef.current(); }, []);

  const resetParticipantSession = useCallback(() => {
    try {
      localStorage.removeItem(`propley_participant_${roomId}`);
      localStorage.removeItem('propley_participant_identity');
    } catch { /* ignore */ }
    setHasEntered(false);
    setUserName('');
    setPhone('');
    setPresenceVisible(true);
    setIsAnnotating(false);
  }, [roomId]);

  useEffect(() => {
    onEndRef.current = resetParticipantSession;
  }, [resetParticipantSession]);

  useEffect(() => {
    const saved = readStoredParticipantEntry(roomId);
    if (!saved.hasEntered) return;
    setHasEntered(true);
    setUserName(saved.userName);
    setPhone(saved.phone);
  }, [roomId]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== 'mandake' || !data.event) return;

      const { type, slide, meta } = data.event;
      const apiEventType = type === 'slide_exit' ? 'slide_view' : type;

      try {
        const payload = {
          event_id: apiEventType,
          name: type === 'slide_exit' ? `Slide view: ${slide}` : `${type} on ${slide}`,
          time: new Date().toISOString(),
          duration: meta?.durationMs || 0,
          user_name: userName || 'Client',
          user_mobile: phone || '',
          meta: {
            actor: 'participant',
            ...meta,
          },
        };

        console.log(
          '%c[API Payload] Recording Event:',
          'color: #00ff00; font-weight: bold; background: #222; padding: 2px 4px; border-radius: 4px;',
          payload
        );

        await apiClient.post(`/api/v1/events/${roomId}/record`, payload);
      } catch (err) {
        console.error(`Failed to record event ${apiEventType}:`, err);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [roomId, userName, phone]);

  const {
    meeting,
    remoteStreams,
    localStream,
    currentUrl,
    unmuteRequestFrom,
    acceptUnmuteRequest,
    declineUnmuteRequest,
    toggleLocalAudio,
    toggleLocalVideo,
    audioEnabled,
    videoEnabled,
    hangUp,
    participants,
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
  } = useParticipantSession(roomId, userName, phone, stableOnEnd);

  const handleJoin = (name: string, phoneNum: string) => {
    setUserName(name);
    setPhone(phoneNum);
    setHasEntered(true);
  };

  const handleMicToggle = (next: boolean) => {
    toggleLocalAudio(next);
  };

  const handleCamToggle = (next: boolean) => {
    toggleLocalVideo(next);
  };

  if (!roomId) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a] text-white/70 text-xs">
        Invalid meeting link.
      </div>
    );
  }

  const advisorDisplayName = resolveMeetingAdvisorName(meeting);

  return (
    <div className="fixed inset-0 w-full bg-[#0a0a0a] overflow-hidden font-sans text-white flex flex-col">
      {!hasEntered ? (
        <EntryScreen onJoin={handleJoin} roomId={roomId} />
      ) : (
        <div className="relative flex-1 flex flex-col z-10 overflow-hidden">
          <main className="flex-1 flex flex-col md:flex-row min-h-0 relative bg-black/20 overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 relative order-2 md:order-1">
              <ParticipantTheater
                isAnnotating={isAnnotating}
                setIsAnnotating={setIsAnnotating}
                currentUrl={currentUrl}
                screenShareActive={!!screenShareStream}
                screenSharePresenter={screenSharePresenter}
                socket={socket}
              />
            </div>

            <div className="order-1 md:order-2 md:h-full shrink-0">
              <VideoSurface
                isVisible={presenceVisible}
                localStream={localStream}
                remoteStreams={remoteStreams}
                userName={userName}
                advisorName={advisorDisplayName}
                meeting={meeting}
              />
            </div>
          </main>

          <footer className="shrink-0 relative z-20">
            <CommandBar
              isMicOn={audioEnabled}
              setIsMicOn={handleMicToggle}
              isCamOn={videoEnabled}
              setIsCamOn={handleCamToggle}
              presenceVisible={presenceVisible}
              setPresenceVisible={setPresenceVisible}
              onHangUp={hangUp}
              devices={devices}
              currentCameraId={currentCameraId}
              currentMicrophoneId={currentMicrophoneId}
              onSwitchCamera={switchCamera}
              onSwitchMicrophone={switchMicrophone}
              onRefreshDevices={refreshDevices}
            />
          </footer>
        </div>
      )}

      {unmuteRequestFrom && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="bg-zinc-900 border border-white/10 p-6 max-w-sm w-full text-center space-y-6">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-gold">Unmute Request</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Advisor <strong className="text-white">{unmuteRequestFrom}</strong> has requested you to unmute your microphone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={declineUnmuteRequest}
                className="flex-1 py-3 text-xs border border-white/10 hover:bg-white/5 transition-colors uppercase tracking-widest font-semibold"
              >
                Decline
              </button>
              <button
                onClick={acceptUnmuteRequest}
                className="flex-1 py-3 text-xs bg-gold hover:bg-gold-hover text-white transition-colors uppercase tracking-widest font-semibold"
              >
                Unmute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
