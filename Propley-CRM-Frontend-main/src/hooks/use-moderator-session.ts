/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/store/hooks';
import { fetchMeetingsAllThunk } from '@/store/slices/meetingsThunks';
import {
  verifyModeratorSession,
  resetMeetingSession,
  fetchEnablexToken,
  resolveMeetingAdvisorName,
  fetchMeetingMetadata,
} from '@/lib/api/meetings';
import { toast } from '@/lib/toast';
import { io, Socket } from 'socket.io-client';
import { registerSocketDebugger } from '@/lib/socket-debug';
import { ENX_RECONNECT_OPTIONS, ENX_SHARE_PLAYER_OPTIONS, SHARE_CONTAINER_ID, PRESENTATION_STAGE_ID, installIosAudioUnlock, playSharedScreen, withCurrentTabCapture, cropShareToElement } from '@/lib/enx-media';

export type Participant = {
  socketId?: string;
  name?: string;
  mobile?: string;
  role?: string;
  isMuted?: boolean;
  /** Camera off — populate via backend `participants-update` / `video-state-changed` (see docs/backend-session-visitors-todo-rohit.md). */
  isVideoMuted?: boolean;
  location?: {
    city?: string;
    country?: string;
  } | null;
};

export type SessionPhase = 'authorizing' | 'authorized' | 'denied' | 'error';

export function useModeratorSession(roomId: string, advisorName: string) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [phase, setPhase] = useState<SessionPhase>('authorizing');
  const [meeting, setMeeting] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [enablexToken, setEnablexToken] = useState<string | null>(null);
  const [enablexRoomId, setEnablexRoomId] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<any[]>([]);
  const [localStream, setLocalStream] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const tokenFetchedRef = useRef(false);

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState<any>(null);
  const [screenSharePresenter, setScreenSharePresenter] = useState<string | null>(null);
  const [devices, setDevices] = useState<{
    cameras: { id: string; label: string }[];
    microphones: { id: string; label: string }[];
  }>({ cameras: [], microphones: [] });
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(null);
  const [currentMicrophoneId, setCurrentMicrophoneId] = useState<string | null>(null);
  const shareStreamRef = useRef<any>(null);
  // The current REMOTE sharer (from the share-started event / shareEventInfo). null = nobody is
  // sharing to us. Drives whether stream 101 should be surfaced as a received share.
  const remoteSharerRef = useRef<{ clientId: string; name: string } | null>(null);
  const joinRetryRef = useRef(0);
  const rejoinAttemptsRef = useRef(0);

  useEffect(() => installIosAudioUnlock(), []);

  useEffect(() => {
    let active = true;

    async function authorize() {
      try {
        const [response, metadata] = await Promise.all([
          verifyModeratorSession(roomId),
          fetchMeetingMetadata(roomId).catch(() => null)
        ]);
        if (!active) return;
        setMeeting({ ...response.meeting, ...metadata });
        setPhase('authorized');
      } catch (err: any) {
        if (!active) return;
        setPhase('denied');

        const status = err?.response?.status || err?.status;
        if (status === 404) {
          toast.error("Meeting not found.");
        } else {
          toast.error("Failed to open sales portal.");
        }
        router.push('/meetings');
      }
    }

    authorize();

    return () => {
      active = false;
    };
  }, [roomId, router]);

  useEffect(() => {
    if (phase !== 'authorized') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'authorized') return;

    let BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
    // Avoid mixed-content websocket issues when the frontend is served over https.
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && BASE_URL.startsWith('http:')) {
      BASE_URL = BASE_URL.replace(/^http:/, 'https:');
    }
    const socket = io(BASE_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    registerSocketDebugger(socket, 'moderator');

    // Track connect time to ignore stale session-ended events from previous sessions
    let connectTime = 0;
    const SESSION_ENDED_GRACE_MS = 4000; // ignore session-ended within 4s of connect

    socket.on('connect', async () => {
      connectTime = Date.now();
      setSocketConnected(true);
      socket.emit('join-meeting', {
        meetingId: roomId,
        role: 'moderator',
        name: advisorName,
        mobile: '',
        by: '',
      });

      if (tokenFetchedRef.current) {
        console.log('EnableX token already fetched, skipping duplicate call.');
        return;
      }
      tokenFetchedRef.current = true;

      try {
        const { token, roomId: exRoomId } = await fetchEnablexToken({
          uuid: roomId,
          name: advisorName,
          role: 'moderator',
          socketId: socket.id || '',
        });
        setEnablexToken(token);
        setEnablexRoomId(exRoomId);
      } catch (err) {
        console.error('Failed to fetch EnableX token:', err);
        toast.error('Failed to initialize audio/video session.');
      }
    });

    socket.on('participants-update', (updatedParticipants: Participant[]) => {
      setParticipants(updatedParticipants);
    });

    socket.on('urlChange', (payload: any) => {
      console.log('urlChange received:', payload);
    });

    socket.on('negotiation-needed', (payload: any) => {
      console.log('negotiation-needed received:', payload);
    });

    socket.on('session-ended', (payload: any) => {
      const elapsed = Date.now() - connectTime;
      if (elapsed < SESSION_ENDED_GRACE_MS) {
        // Stale event from a previous session disconnect — ignore it
        console.warn(`[session-ended] Ignored stale event received ${elapsed}ms after connect. Reason: ${payload?.reason}`);
        return;
      }
      console.log('session-ended received:', payload);
      toast.success('The sales session has ended.');
      router.push('/meetings');
    });

    socket.on('force-mute-self', (payload: any) => {
      console.log('force-mute-self received:', payload);
    });

    socket.on('mic-state-changed', (payload: { socketId: string; isMuted: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.socketId === payload.socketId ? { ...p, isMuted: payload.isMuted } : p
        )
      );
    });

    socket.on('unmute-request', (payload: any) => {
      console.log('unmute-request received:', payload);
    });

    socket.on('client-device-info', (payload: any) => {
      console.log('client-device-info received:', payload);
    });

    socket.on('participant:unmute-declined', (payload: { name: string }) => {
      toast.error(`${payload.name} declined the request to unmute.`);
    });

    // Relay events setup
    const relayEvents = [
      'whiteboard-draw',
      'whiteboard-clear',
      'moderator-cursor',
      'moderator-layout-shift',
      'answer',
      'callerCandidates',
      'calleeCandidates'
    ];
    relayEvents.forEach((evt) => {
      socket.on(evt, (payload: any) => {
        console.log(`Relay event ${evt} received:`, payload);
      });
    });

    return () => {
      setSocketConnected(false);
      socket.disconnect();
      tokenFetchedRef.current = false;
    };
  }, [phase, roomId, advisorName]);

  const roomRef = useRef<any>(null);

  // audioEnabled mirrors the EnableX SDK-confirmed mic state; desiredAudioOnRef holds the
  // last intent so a mute requested before the stream is published is replayed on join.
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const desiredAudioOnRef = useRef(true);
  const desiredVideoOnRef = useRef(true);
  const applyAudioStateRef = useRef<(enabled: boolean) => boolean>(() => false);
  const applyVideoStateRef = useRef<(enabled: boolean) => boolean>(() => false);

  const SCREEN_SHARE_STREAM_ID = 101;

  const refreshDevices = useCallback(() => {
    const Enx = (window as any).EnxRtc;
    if (!Enx?.getDevices) return;
    Enx.getDevices((arg: any) => {
      if (!arg || arg.result !== 0 || !arg.devices) return;
      setDevices({
        cameras: (arg.devices.cam || []).map((d: any) => ({ id: String(d.deviceId), label: d.label || 'Camera' })),
        microphones: (arg.devices.mic || []).map((d: any) => ({ id: String(d.deviceId), label: d.label || 'Microphone' })),
      });
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!enablexToken) return;
    if (typeof window === 'undefined' || !(window as any).EnxRtc) {
      console.warn('EnxRtc SDK is not loaded yet');
      return;
    }

    const streamInfo = {
      video: true,
      audio: true,
      data: true,
      attributes: {
        name: advisorName,
        role: 'moderator',
      },
    };

    // Check browser permission status for microphone
    if (typeof navigator !== 'undefined') {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'microphone' as PermissionName })
          .then((result) => {
            if (result.state === 'denied') {
              toast.error('Access denied');
            }
            result.onchange = () => {
              if (result.state === 'denied') {
                toast.error('Access denied');
              }
            };
          })
          .catch((e) => console.warn('Permissions query not supported for microphone', e));
      }

    }

    (window as any).EnxRtc.joinRoom(enablexToken, streamInfo, (room: any, err: any) => {
      if (!isMounted) {
        if (room && room.room && room.room.disconnect) {
          room.room.disconnect();
        }
        return;
      }

      if (err) {
        console.error('Failed to join EnableX room:', err);
        const isPermissionError =
          err.type === 'media-access-denied' ||
          (err.msg && err.msg.toLowerCase().includes('permission')) ||
          (err.message && err.message.toLowerCase().includes('permission')) ||
          err.code === 1152 ||
          (typeof err === 'string' && err.toLowerCase().includes('permission'));

        const isStaleRoom =
          err.error === 1100 || err.result === 1100 || err.result === 1161 ||
          (err.message && /invalid token|server connection/i.test(err.message));

        if (isStaleRoom && joinRetryRef.current < 1 && socketRef.current?.id) {
          joinRetryRef.current += 1;
          fetchEnablexToken({ uuid: roomId, name: advisorName, role: 'moderator', socketId: socketRef.current.id })
            .then(({ token: fresh }) => { if (isMounted) setEnablexToken(fresh); })
            .catch(() => toast.error('Failed to rejoin audio/video.'));
          return;
        }

        if (isPermissionError) toast.error('Access denied');
        else toast.error('Failed to join audio/video channel');
        return;
      }

      if (room) {
        console.log('Successfully joined EnableX room:', room);
        roomRef.current = room;
        joinRetryRef.current = 0;
        rejoinAttemptsRef.current = 0;

        const localStream = room.localStream;
        if (localStream) {
          setLocalStream(localStream);
          (window as { localStream?: unknown }).localStream = localStream;
          // Replay mute/unmute requested before the stream was ready (else early mute leaks).
          applyAudioStateRef.current(desiredAudioOnRef.current);
          applyVideoStateRef.current(desiredVideoOnRef.current);
        }

        try {
          const lc = (localStream && (localStream as any).config) || {};
          if (lc.video && typeof lc.video === 'object' && lc.video.deviceId) setCurrentCameraId(String(lc.video.deviceId));
          if (lc.audio && typeof lc.audio === 'object' && lc.audio.deviceId) setCurrentMicrophoneId(String(lc.audio.deviceId));
        } catch { /* ignore */ }
        refreshDevices();

        const actualRoom = room.room;

        // A share belongs on this (receiver) surface only when a DIFFERENT client is actively
        // sharing to us (remoteSharerRef, set from share-started) and the SDK agrees a share is
        // on (shareStatus) and I'm not the one sharing. Guards a stale 101 left over on join.
        const isRemoteShareActive = (rm: any) => {
          if (rm.isSharingClient) return false;
          const sharer = remoteSharerRef.current;
          if (!sharer || sharer.clientId === rm.clientId) return false;
          return rm.shareStatus !== false;
        };

        const surfaceShare = (rm: any) => {
          if (!isRemoteShareActive(rm)) return;
          const shared = rm.remoteStreams?.get?.(SCREEN_SHARE_STREAM_ID);
          if (!shared) return;
          shared.play(SHARE_CONTAINER_ID.moderator, ENX_SHARE_PLAYER_OPTIONS);
          setScreenShareStream(shared);
          setScreenSharePresenter(remoteSharerRef.current?.name || 'Participant');
          playSharedScreen(SHARE_CONTAINER_ID.moderator);
        };

        if (actualRoom) {
          actualRoom.addEventListener('stream-added', (event: any) => {
            actualRoom.subscribe(event.stream);
          });

          // 101 carries the shared screen — play it only once its media is actually subscribed,
          // otherwise the track stays muted (black) and the SDK loops reset-stream. surfaceShare
          // itself bails unless a remote share is genuinely active.
          actualRoom.addEventListener('stream-subscribed', (event: any) => {
            if (Number(event.stream?.getID?.()) !== SCREEN_SHARE_STREAM_ID) return;
            surfaceShare(actualRoom);
          });

          actualRoom.addEventListener('stream-removed', (event: any) => {
            const stream = event.stream;
            setRemoteStreams((prev) => prev.filter((s) => s.getID() !== stream.getID()));
          });

          actualRoom.addEventListener('network-reconnected', () => {
            setRemoteStreams([]);
          });

          actualRoom.addEventListener('active-talkers-updated', (event: any) => {
            const list = event?.message?.activeList || [];
            const myId = actualRoom.clientId;
            const next: any[] = [];
            list.forEach((item: any) => {
              if (!item || item.clientId === myId) return;
              const sid = parseInt(item.streamId, 10);
              if (sid === SCREEN_SHARE_STREAM_ID) return;
              const st = actualRoom.remoteStreams?.get?.(sid);
              if (st) {
                try { st.enxName = item.name; st.enxClientId = item.clientId; } catch (e) { /* ignore */ }
                next.push(st);
              }
            });
            setRemoteStreams(next);
          });

          actualRoom.addEventListener('share-started', (event: any) => {
            const sharerClientId = event?.message?.clientId;
            if (actualRoom.clientId && sharerClientId === actualRoom.clientId) return; // ignore my own share
            if (actualRoom.isSharingClient) return;
            remoteSharerRef.current = { clientId: sharerClientId, name: event?.message?.name || 'Participant' };
            // The shared screen (101) may already be subscribed (play now) or still arriving
            // (subscribe it; stream-subscribed will then play it).
            const shared = actualRoom.remoteStreams?.get?.(SCREEN_SHARE_STREAM_ID);
            if (shared) {
              if (shared.stream) surfaceShare(actualRoom);
              else { try { actualRoom.subscribe(shared); } catch { /* stream-subscribed handles play */ } }
            }
          });

          actualRoom.addEventListener('share-stopped', () => {
            remoteSharerRef.current = null;
            const node = document.getElementById(SHARE_CONTAINER_ID.moderator);
            if (node) node.innerHTML = '';
            setScreenShareStream(null);
            setScreenSharePresenter(null);
            shareStreamRef.current = null;
            setIsScreenSharing(false);
          });

          const existingStreams = room.streams || actualRoom.streams || [];
          if (Array.isArray(existingStreams)) {
            existingStreams.forEach((s: any) => {
              try { actualRoom.subscribe(s); } catch { /* ignore */ }
            });
          }

          // Joined while a remote share is already in progress — shareEventInfo carries the sharer
          // (set by the SDK's stored-event branch). Seed the ref, then subscribe 101 so its media
          // negotiates; stream-subscribed then plays it (via surfaceShare's own guard).
          const joinInfo = actualRoom.shareEventInfo;
          if (actualRoom.shareStatus && !actualRoom.isSharingClient && joinInfo?.clientId && joinInfo.clientId !== actualRoom.clientId) {
            remoteSharerRef.current = { clientId: joinInfo.clientId, name: joinInfo.name || 'Participant' };
            const shared = actualRoom.remoteStreams?.get?.(SCREEN_SHARE_STREAM_ID);
            if (shared) {
              if (shared.stream) surfaceShare(actualRoom);
              else { try { actualRoom.subscribe(shared); } catch { /* stream-subscribed handles play */ } }
            }
          }

          // SDK exhausted its own reconnect window — rejoin with a fresh token; the join
          // success path replays the last mute/camera intent.
          const rejoin = () => {
            if (!isMounted) return;
            if (rejoinAttemptsRef.current >= 3) {
              toast.error('Connection lost. Please refresh to rejoin.');
              return;
            }
            rejoinAttemptsRef.current += 1;
            window.setTimeout(() => {
              if (!isMounted || !socketRef.current?.id) return;
              fetchEnablexToken({ uuid: roomId, name: advisorName, role: 'moderator', socketId: socketRef.current.id })
                .then(({ token: fresh }) => { if (isMounted) setEnablexToken(fresh); })
                .catch(() => { if (isMounted) rejoin(); });
            }, 1500 * rejoinAttemptsRef.current);
          };
          actualRoom.addEventListener('network-reconnect-timeout', rejoin);
          actualRoom.addEventListener('network-reconnect-failed', rejoin);
        }
      }
    }, ENX_RECONNECT_OPTIONS);

    return () => {
      isMounted = false;
      if (shareStreamRef.current) {
        try {
          if (roomRef.current?.room?.stopScreenShare) {
            roomRef.current.room.stopScreenShare(shareStreamRef.current, () => {});
          }
        } catch { /* ignore */ }
        shareStreamRef.current = null;
      }
      if (roomRef.current) {
        const localStream = roomRef.current.localStream;
        if (localStream) {
          try {
            const nativeStream = localStream.stream || localStream;
            if (nativeStream && typeof nativeStream.getTracks === 'function') {
              nativeStream.getTracks().forEach((track: any) => {
                if (typeof track.stop === 'function') track.stop();
              });
            }
          } catch (e) {}
          if (typeof (localStream as any).disconnect === 'function') {
            try { (localStream as any).disconnect(); } catch (e) {}
          } else if (typeof localStream.close === 'function') {
            try { localStream.close(); } catch (e) {}
          }
        }
        if (roomRef.current.room && roomRef.current.room.disconnect) {
          try { roomRef.current.room.disconnect(); } catch (e) {}
        }
        roomRef.current = null;
      }
      setLocalStream(null);
      setRemoteStreams([]);
      setScreenShareStream(null);
      setScreenSharePresenter(null);
      setIsScreenSharing(false);
      (window as { localStream?: unknown }).localStream = undefined;
    };
  }, [enablexToken, advisorName, refreshDevices, roomId]);

  const emitUrlChange = useCallback((payload: { src: string; title: string }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('urlChange', { ...payload, by: '' });
    }
  }, []);

  const emitMicState = useCallback((isMuted: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('mic-state-changed', { isMuted, by: '' });
    }
  }, []);

  const endSession = useCallback(async () => {
    // The local user leaves, but the session remains active for others.
    // We intentionally do not call resetMeetingSession(roomId) here.
    if (roomRef.current) {
      const room = roomRef.current.room;
      
      if (room && remoteStreams) {
        remoteStreams.forEach((stream) => {
          if (room.unsubscribe) {
            try {
              room.unsubscribe(stream, () => {
                console.log('Unsubscribed from stream:', stream.getID());
              });
            } catch (e) {
              console.error('Error unsubscribing stream:', e);
            }
          }
        });
      }

      const localStream = roomRef.current.localStream;
      if (localStream) {
        try {
          const nativeStream = localStream.stream || localStream;
          if (nativeStream && typeof nativeStream.getTracks === 'function') {
            nativeStream.getTracks().forEach((track: any) => {
              if (typeof track.stop === 'function') {
                track.stop();
              }
            });
          }
        } catch (e) {
          console.error('Error stopping native tracks:', e);
        }

        if (typeof (localStream as any).disconnect === 'function') {
          (localStream as any).disconnect();
        } else if (typeof localStream.close === 'function') {
          localStream.close();
        }
      }

      if (room && room.disconnect) {
        try {
          room.disconnect();
          console.log('Local user disconnected. Session remains active for others.');
        } catch (e) {
          console.error('Error disconnecting room:', e);
        }
      }
      roomRef.current = null;
    }
    if (socketRef.current) {
      if (socketRef.current.connected) {
        socketRef.current.emit('moderator:end-session');
      }
      socketRef.current.disconnect();
    }
    setRemoteStreams([]);
    void dispatch(fetchMeetingsAllThunk({ force: true }));
    router.push('/meetings');
  }, [roomId, router, remoteStreams, dispatch]);

  // Flip audioEnabled only inside the SDK callback so the icon tracks the published state.
  const applyAudioState = useCallback((enabled: boolean) => {
    const localStream = roomRef.current?.localStream;
    if (!localStream) return false;
    if (enabled) {
      if (typeof localStream.unmuteAudio !== 'function') return false;
      localStream.unmuteAudio(() => {
        if (desiredAudioOnRef.current !== true) return;
        setAudioEnabled(true);
        emitMicState(false);
      });
    } else {
      if (typeof localStream.muteAudio !== 'function') return false;
      localStream.muteAudio(() => {
        if (desiredAudioOnRef.current !== false) return;
        setAudioEnabled(false);
        emitMicState(true);
      });
    }
    return true;
  }, [emitMicState]);

  const applyVideoState = useCallback((enabled: boolean) => {
    const localStream = roomRef.current?.localStream;
    if (!localStream) return false;
    if (enabled) {
      if (typeof localStream.unmuteVideo !== 'function') return false;
      localStream.unmuteVideo(() => {
        if (desiredVideoOnRef.current === true) setVideoEnabled(true);
      });
    } else {
      if (typeof localStream.muteVideo !== 'function') return false;
      localStream.muteVideo(() => {
        if (desiredVideoOnRef.current === false) setVideoEnabled(false);
      });
    }
    return true;
  }, []);

  useEffect(() => {
    applyAudioStateRef.current = applyAudioState;
    applyVideoStateRef.current = applyVideoState;
  }, [applyAudioState, applyVideoState]);

  const toggleLocalAudio = useCallback((enabled: boolean) => {
    desiredAudioOnRef.current = enabled;
    applyAudioState(enabled);
  }, [applyAudioState]);

  const toggleLocalVideo = useCallback((enabled: boolean) => {
    desiredVideoOnRef.current = enabled;
    applyVideoState(enabled);
  }, [applyVideoState]);

  const toggleScreenShare = useCallback(() => {
    const room = roomRef.current?.room;
    if (!room) return;
    if (shareStreamRef.current) {
      try { room.stopScreenShare(shareStreamRef.current, () => {}); } catch (e) { console.error('Failed to stop screen share:', e); }
      shareStreamRef.current = null;
      setIsScreenSharing(false);
      return;
    }
    if (typeof room.startScreenShare !== 'function') {
      toast.error('Screen sharing is not available.');
      return;
    }
    try {
      // Force capture of the current presentation tab (no whole-screen/other-window option).
      const share = withCurrentTabCapture(() => room.startScreenShare((result: any) => {
        if (result && result.error) {
          shareStreamRef.current = null;
          setIsScreenSharing(false);
          toast.error('Could not start screen share.');
        }
      }));
      if (share) {
        shareStreamRef.current = share;
        setIsScreenSharing(true);
        // Crop the shared tab down to just the presentation iframe (best-effort, Chromium-only;
        // falls back to full-tab where unsupported). ScreenSharelocalStream is the captured stream.
        cropShareToElement(() => room.ScreenSharelocalStream ?? share, PRESENTATION_STAGE_ID.moderator);
        if (typeof share.addEventListener === 'function') {
          share.addEventListener('stream-ended', () => {
            try { room.stopScreenShare(shareStreamRef.current, () => {}); } catch { /* ignore */ }
            shareStreamRef.current = null;
            setIsScreenSharing(false);
          });
        }
      }
    } catch (e) {
      console.error('Failed to start screen share:', e);
      shareStreamRef.current = null;
      setIsScreenSharing(false);
      toast.error('Could not start screen share.');
    }
  }, []);

  const switchCamera = useCallback((deviceId: string) => {
    const local = roomRef.current?.localStream;
    if (!local?.switchCamera) return;
    try {
      local.switchCamera(local, deviceId, (stream: any) => {
        if (stream && typeof stream.getID === 'function') {
          roomRef.current.localStream = stream;
          (window as { localStream?: unknown }).localStream = stream;
          setLocalStream(stream);
        }
        setCurrentCameraId(deviceId);
      });
    } catch (e) {
      console.error('Failed to switch camera:', e);
    }
  }, []);

  const switchMicrophone = useCallback((deviceId: string) => {
    const local = roomRef.current?.localStream;
    if (!local?.switchMicrophone) return;
    try {
      local.switchMicrophone(local, deviceId, (stream: any) => {
        if (stream && typeof stream.getID === 'function') {
          roomRef.current.localStream = stream;
          (window as { localStream?: unknown }).localStream = stream;
          setLocalStream(stream);
        }
        setCurrentMicrophoneId(deviceId);
      });
    } catch (e) {
      console.error('Failed to switch microphone:', e);
    }
  }, []);

  const muteUser = useCallback((targetSocketId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('moderator:mute-user', { targetSocketId, by: advisorName });
    }
  }, [advisorName]);

  const requestUnmute = useCallback((targetSocketId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('moderator:unmute-request', { targetSocketId, by: advisorName });
    }
  }, [advisorName]);

  const muteAll = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('moderator:mute-all', { by: advisorName });
    }
  }, [advisorName]);

  return {
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
    socket: socketRef.current,
    // Screen share
    isScreenSharing,
    toggleScreenShare,
    screenShareStream,
    screenSharePresenter,
    // Device picker
    devices,
    currentCameraId,
    currentMicrophoneId,
    refreshDevices,
    switchCamera,
    switchMicrophone,
  };
}




