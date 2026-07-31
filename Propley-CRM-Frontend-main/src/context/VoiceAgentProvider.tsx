'use client';

import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useVoiceAgentStore } from '@/store/voice-agent-store';
import { VoiceRoom, type TranscriptSegment, type VoiceState } from '@/services/voice-livekit/room';
import { executeTool } from '@/services/voice-livekit/tool-runner';
import { getCustomersByIds } from '@/lib/client-voice-lookup';
import { toast } from '@/lib/toast';
import type { AgentState } from '@/types/voice-agent';

interface VoiceAgentContextValue {
  toggleListening: () => void;
  triggerCommandString: (query: string) => Promise<void>;
  pickClientCandidate: (customerId: string) => Promise<void>;
}

const VoiceAgentContext = createContext<VoiceAgentContextValue | null>(null);

const STATE_MAP: Record<VoiceState, AgentState> = {
  idle: 'idle',
  listening: 'listening',
  thinking: 'processing',
  speaking: 'speaking',
};

export function VoiceAgentProvider({ children }: { children: ReactNode }) {
  const roomRef = useRef<VoiceRoom | null>(null);
  const connectingRef = useRef(false);
  const ensureRoomRef = useRef<(() => VoiceRoom) | null>(null);

  const reconnect = useCallback(async () => {
    const store = useVoiceAgentStore.getState();
    if (!store.isListening || connectingRef.current) return;

    console.warn('[VoiceAgent] agent left the room, rejoining');
    connectingRef.current = true;
    try {
      await roomRef.current?.disconnect();
      roomRef.current = null;
      const room = ensureRoomRef.current?.();
      await room?.connect();
    } catch (err) {
      console.error('[VoiceAgent] rejoin failed', err);
      store.setMicError('Lost the assistant. Tap the mic to retry.');
      store.setListening(false);
      store.setState('idle');
      roomRef.current = null;
    } finally {
      connectingRef.current = false;
    }
  }, []);

  const ensureRoom = useCallback((): VoiceRoom => {
    if (roomRef.current) return roomRef.current;

    const segmentIds = new Map<string, string>();

    const upsert = (sender: 'user' | 'agent', segment: TranscriptSegment) => {
      const store = useVoiceAgentStore.getState();
      const existing = segmentIds.get(segment.id);
      if (existing) {
        store.updateChatMessage(existing, segment.text);
      } else {
        segmentIds.set(segment.id, store.addChatMessage(sender, segment.text));
      }
      if (segment.final) {
        if (sender === 'user') store.addToHistory(segment.text);
        segmentIds.delete(segment.id);
      }
    };

    const room = new VoiceRoom({
      onStateChange: (state) => {
        const store = useVoiceAgentStore.getState();
        store.setState(STATE_MAP[state]);
        if (state === 'idle') store.setAudioLevel(0);
      },
      onUserTranscript: (segment) => upsert('user', segment),
      onAgentTranscript: (segment) => upsert('agent', segment),
      onAgentLost: () => {
        void reconnect();
      },
      onError: (err) => {
        const store = useVoiceAgentStore.getState();
        store.setMicError(err.message);
        store.setListening(false);
        store.setState('idle');
      },
    });

    roomRef.current = room;
    return room;
  }, [reconnect]);

  useEffect(() => {
    ensureRoomRef.current = ensureRoom;
  }, [ensureRoom]);

  const toggleListening = useCallback(async () => {
    const store = useVoiceAgentStore.getState();
    const { isListening, setListening, micError, clearMicError } = store;
    if (micError) clearMicError();
    if (connectingRef.current) return;

    const room = ensureRoom();

    if (isListening) {
      setListening(false);
      store.setState('idle');
      store.setAudioLevel(0);
      store.resetSlotFilling();
      await room.disconnect();
      roomRef.current = null;
      return;
    }

    connectingRef.current = true;
    setListening(true);
    store.setState('processing');
    try {
      await room.connect();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not start the voice session.';
      console.error('[VoiceAgent] connect failed', err);
      store.setMicError(message);
      toast.error(message);
      setListening(false);
      store.setState('idle');
      roomRef.current = null;
    } finally {
      connectingRef.current = false;
    }
  }, [ensureRoom]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const store = useVoiceAgentStore.getState();
      if (!store.isListening) return;
      void roomRef.current?.interruptAgent();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    return () => {
      void roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  const triggerCommandString = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const store = useVoiceAgentStore.getState();
    store.addChatMessage('user', trimmed);
    store.setCommandDraft('');
    toast.success('Start the mic to talk to the assistant.');
  }, []);

  const pickClientCandidate = useCallback(async (customerId: string) => {
    const store = useVoiceAgentStore.getState();
    const pending = store.pendingClientLookup;
    if (!pending?.candidateIds.includes(customerId)) return;

    const customer = getCustomersByIds([customerId])[0];
    if (!customer) return;

    store.addChatMessage('user', customer.name);
    store.clearPendingClientLookup();
    await executeTool('navigate', { path: `/customers/${customer.id}` });
    store.setState('idle');
  }, []);

  return (
    <VoiceAgentContext.Provider
      value={{ toggleListening, triggerCommandString, pickClientCandidate }}
    >
      {children}
    </VoiceAgentContext.Provider>
  );
}

export function useVoiceAgent(): VoiceAgentContextValue {
  const ctx = useContext(VoiceAgentContext);
  if (!ctx) throw new Error('useVoiceAgent must be used inside <VoiceAgentProvider>');
  return ctx;
}
