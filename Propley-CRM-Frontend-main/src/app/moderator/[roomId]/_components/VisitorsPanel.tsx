'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  RiMicLine,
  RiMicOffLine,
  RiVideoChatLine,
  RiVideoOffLine,
  RiVolumeMuteLine,
} from 'react-icons/ri';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import type { Participant } from '@/hooks/use-moderator-session';

type EnableXStream = {
  getClientID?: () => string;
  isAudioMuted?: () => boolean;
  isVideoMuted?: () => boolean;
  addEventListener: (event: string, cb: () => void) => void;
  removeEventListener: (event: string, cb: () => void) => void;
};

function useStreamMediaState(stream: EnableXStream | null) {
  const [isAudioMuted, setIsAudioMuted] = useState(
    stream?.isAudioMuted ? stream.isAudioMuted() : false,
  );
  const [isVideoMuted, setIsVideoMuted] = useState(
    stream?.isVideoMuted ? stream.isVideoMuted() : true,
  );

  useEffect(() => {
    if (!stream) return;

    const sync = () => {
      setIsAudioMuted(stream.isAudioMuted ? stream.isAudioMuted() : false);
      setIsVideoMuted(stream.isVideoMuted ? stream.isVideoMuted() : false);
    };

    sync();
    const onAudioMuted = () => setIsAudioMuted(true);
    const onAudioUnmuted = () => setIsAudioMuted(false);
    const onVideoMuted = () => setIsVideoMuted(true);
    const onVideoUnmuted = () => setIsVideoMuted(false);

    stream.addEventListener('stream-audio-muted', onAudioMuted);
    stream.addEventListener('stream-audio-unmuted', onAudioUnmuted);
    stream.addEventListener('stream-video-muted', onVideoMuted);
    stream.addEventListener('stream-video-unmuted', onVideoUnmuted);

    return () => {
      stream.removeEventListener('stream-audio-muted', onAudioMuted);
      stream.removeEventListener('stream-audio-unmuted', onAudioUnmuted);
      stream.removeEventListener('stream-video-muted', onVideoMuted);
      stream.removeEventListener('stream-video-unmuted', onVideoUnmuted);
    };
  }, [stream]);

  return { isAudioMuted, isVideoMuted };
}

function findStreamForParticipant(
  participant: Participant,
  remoteStreams: EnableXStream[],
): EnableXStream | null {
  if (!participant.socketId) return null;
  return (
    remoteStreams.find((s) => s.getClientID?.() === participant.socketId) ?? null
  );
}

function VisitorCard({
  participant,
  stream,
  muteUser,
  requestUnmute,
}: {
  participant: Participant;
  stream: EnableXStream | null;
  muteUser?: (id: string) => void;
  requestUnmute?: (id: string) => void;
}) {
  const { isAudioMuted: streamAudioMuted, isVideoMuted: streamVideoMuted } =
    useStreamMediaState(stream);
  const isClient = participant.role !== 'moderator';
  const socketId = participant.socketId ?? '';
  const audioMuted = participant.isMuted ?? streamAudioMuted;
  const videoMuted = stream ? streamVideoMuted : (participant.isVideoMuted ?? true);
  const displayRole = participant.role === 'moderator' ? 'Advisor' : 'Client';
  const locationString = participant.location
    ? `${participant.location.city || ''}${participant.location.city && participant.location.country ? ', ' : ''}${participant.location.country || ''}`
    : 'Active';

  return (
    <div className="p-4 border border-stone-alt bg-stone flex flex-col gap-3 group hover:border-gold/30 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-semibold text-ink truncate">{participant.name || 'Anonymous'}</p>
          <p className="text-[10px] font-medium text-zinc-400">{displayRole}</p>
        </div>
        <span className="text-[9px] font-bold text-gold shrink-0">{locationString}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5" aria-label="Media status">
          <span
            className={cn(
              'w-8 h-8 border flex items-center justify-center',
              audioMuted
                ? 'border-red-200 bg-red-50 text-red-600'
                : 'border-stone-alt bg-white text-ink',
            )}
            title={audioMuted ? 'Microphone off' : 'Microphone on'}
          >
            {audioMuted ? <RiMicOffLine size={14} /> : <RiMicLine size={14} />}
          </span>
          <span
            className={cn(
              'w-8 h-8 border flex items-center justify-center',
              videoMuted
                ? 'border-stone-alt bg-stone text-zinc-400'
                : 'border-gold/30 bg-gold/5 text-gold',
            )}
            title={videoMuted ? 'Camera off' : 'Camera on'}
          >
            {videoMuted ? <RiVideoOffLine size={14} /> : <RiVideoChatLine size={14} />}
          </span>
        </div>

        {isClient && socketId && (
          <button
            type="button"
            onClick={() => {
              if (audioMuted) requestUnmute?.(socketId);
              else muteUser?.(socketId);
            }}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'h-8 px-3 text-[10px] font-semibold rounded-lg border-stone-alt',
              audioMuted && 'border-gold/40 text-gold hover:bg-gold/5',
            )}
          >
            {audioMuted ? 'Ask unmute' : 'Mute'}
          </button>
        )}
      </div>
    </div>
  );
}

export interface VisitorsPanelProps {
  participants: Participant[];
  remoteStreams?: EnableXStream[];
  muteUser?: (targetSocketId: string) => void;
  requestUnmute?: (targetSocketId: string) => void;
  muteAll?: () => void;
}

export function VisitorsPanel({
  participants,
  remoteStreams = [],
  muteUser,
  requestUnmute,
  muteAll,
}: VisitorsPanelProps) {
  const clients = useMemo(
    () => participants.filter((p) => p.role !== 'moderator'),
    [participants],
  );

  const allClientsMuted = useMemo(() => {
    if (clients.length === 0) return false;
    return clients.every((p) => {
      const stream = findStreamForParticipant(p, remoteStreams);
      const audioMuted = p.isMuted ?? (stream?.isAudioMuted ? stream.isAudioMuted() : false);
      return audioMuted;
    });
  }, [clients, remoteStreams]);

  const handleMuteOrUnmuteAll = () => {
    if (allClientsMuted) {
      clients.forEach((p) => {
        if (!p.socketId) return;
        const stream = findStreamForParticipant(p, remoteStreams);
        const audioMuted = p.isMuted ?? (stream?.isAudioMuted ? stream.isAudioMuted() : false);
        if (audioMuted) requestUnmute?.(p.socketId);
      });
      return;
    }
    muteAll?.();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between sm:justify-start sm:gap-4">
          <span className="text-[10px] font-semibold text-zinc-400">Total Connections</span>
          <span className="text-[10px] bg-gold/10 text-gold px-2 py-0.5 font-bold">
            {participants.length} Live
          </span>
        </div>
        {clients.length > 0 && (
          <button
            type="button"
            onClick={handleMuteOrUnmuteAll}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'h-9 px-4 text-[10px] font-semibold rounded-lg border-stone-alt gap-2 w-full sm:w-auto',
            )}
          >
            <RiVolumeMuteLine size={14} />
            {allClientsMuted ? 'Unmute all clients' : 'Mute all clients'}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {participants.length === 0 ? (
          <p className="text-[10px] text-zinc-400 font-medium py-6 text-center border border-dashed border-stone-alt">
            No active visitors yet.
          </p>
        ) : (
          participants.map((v, i) => (
            <VisitorCard
              key={v.socketId || `visitor-${i}`}
              participant={v}
              stream={findStreamForParticipant(v, remoteStreams)}
              muteUser={muteUser}
              requestUnmute={requestUnmute}
            />
          ))
        )}
      </div>
    </div>
  );
}
