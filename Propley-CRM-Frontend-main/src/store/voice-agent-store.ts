import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { useRouter } from 'next/navigation';
import { VOICE_ENGINE } from '@/lib/copy';
import type {
  AgentState,
  CommandExecution,
  VoiceAgentSettings,
  ChatMessage,
  SlotFillingState,
  SlotField,
  CommandArgs,
  PendingClientLookup,
  AgentSpeechState,
} from '@/types/voice-agent';

type VoiceAgentRouter = ReturnType<typeof useRouter>;

interface VoiceAgentState {
  // Agent Status
  state: AgentState;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  /** Live + final text shown in the command input before execute */
  commandDraft: string;
  /** Mic off, draft visible, execute pending */
  isReviewingCommand: boolean;
  audioLevel: number;

  // Split Layout and Chat
  isPanelOpen: boolean;
  suggestionsHidden: boolean;
  chatHistory: ChatMessage[];
  slotFilling: SlotFillingState | null;
  pendingClientLookup: PendingClientLookup | null;

  // Execution queue
  executionQueue: CommandExecution[];
  currentExecutionIndex: number;
  commandHistory: string[];
  recentSuggestions: string[];

  // Settings
  settings: VoiceAgentSettings;

  // React Callbacks (populated at runtime by mounted components)
  router: VoiceAgentRouter | null;
  activeTemplateTab: string | null;
  moderatorState: {
    isMicOn: boolean;
    isCamOn: boolean;
    showObservers: boolean;
    activeSlide: string;
    activeDrawer: 'analytics' | 'script' | 'visitors' | null;
  };
  clientProfileState: {
    activeSection: 'overview' | 'activity' | 'presentations' | 'advisor' | 'notes';
  };

  // Mic error state (set when getUserMedia fails)
  micError: string | null;

  /** TTS in progress for a specific agent message */
  agentSpeech: AgentSpeechState | null;

  // Actions
  setState: (state: AgentState) => void;
  setListening: (isListening: boolean) => void;
  setTranscript: (transcript: string) => void;
  setInterimTranscript: (interimTranscript: string) => void;
  setCommandDraft: (commandDraft: string) => void;
  setReviewingCommand: (isReviewingCommand: boolean) => void;
  setAudioLevel: (audioLevel: number) => void;
  setRouter: (router: VoiceAgentRouter | null) => void;
  setMicError: (error: string) => void;
  clearMicError: () => void;

  // Split panel actions
  setPanelOpen: (isOpen: boolean) => void;
  setSuggestionsHidden: (hidden: boolean) => void;
  addChatMessage: (sender: ChatMessage['sender'], text: string) => string;
  updateChatMessage: (id: string, text: string) => void;
  clearChatHistory: () => void;
  setAgentSpeech: (state: AgentSpeechState | null) => void;

  // Slot-filling actions
  startSlotFilling: (commandId: string, initialArgs: CommandArgs, missingFields: SlotField[]) => void;
  updateSlotValue: (field: string, value: unknown) => void;
  advanceSlotIndex: () => void;
  enterSlotPreview: () => void;
  syncSlotCollecting: (filledArgs: CommandArgs, missingFields: SlotField[]) => void;
  resetSlotFilling: () => void;
  setPendingClientLookup: (pending: PendingClientLookup | null) => void;
  clearPendingClientLookup: () => void;

  // Queue management
  setExecutionQueue: (queue: CommandExecution[]) => void;
  updateExecutionStatus: (id: string, status: CommandExecution['status'], error?: string) => void;
  setCurrentExecutionIndex: (index: number) => void;
  resetQueue: () => void;
  addToHistory: (query: string) => void;

  // Settings actions
  updateSettings: (settings: Partial<VoiceAgentSettings>) => void;

  // Sync states
  setModeratorState: (state: Partial<VoiceAgentState['moderatorState']>) => void;
  setClientProfileState: (state: Partial<VoiceAgentState['clientProfileState']>) => void;
}

export const useVoiceAgentStore = create<VoiceAgentState>()(subscribeWithSelector((set) => {
  // Load settings from localStorage if in client-side browser
  const getInitialSettings = (): VoiceAgentSettings => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('propley_voice_agent_settings');
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<VoiceAgentSettings>;
          const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? null;
          const envKey = process.env.NEXT_PUBLIC_SARVAM_API_KEY ?? null;
          return {
            mode: parsed.mode ?? (envKey ? 'live' : 'simulation'),
            apiKey: parsed.apiKey ?? envKey,
            geminiApiKey: parsed.geminiApiKey ?? geminiKey,
            intentEngine: 'gemini',
            persistentListening: parsed.persistentListening ?? true,
            sttPipeline: parsed.sttPipeline ?? 'streaming',
            sttMode: parsed.sttMode ?? 'translate',
            languageCode: parsed.languageCode ?? 'en-IN',
            highVadSensitivity: parsed.highVadSensitivity ?? false,
            silenceMs: parsed.silenceMs ?? 800,
            bargeIn: false,
            ttsEnabled: parsed.ttsEnabled ?? Boolean(parsed.apiKey ?? envKey),
            ttsSpeaker: parsed.ttsSpeaker ?? 'shubh',
            ttsLanguageCode: parsed.ttsLanguageCode ?? 'en-IN',
          };
        }
      } catch (e) {
        console.error('Failed to load voice agent settings', e);
      }
    }
    // Default: live mode with pre-configured Sarvam key
    // The key is loaded from env var at build time (client-side safe with NEXT_PUBLIC_ prefix)
    const envKey = process.env.NEXT_PUBLIC_SARVAM_API_KEY ?? null;
    const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? null;
    return {
      mode: envKey ? 'live' : 'simulation',
      apiKey: envKey,
      geminiApiKey: geminiKey,
      intentEngine: 'gemini',
      persistentListening: true,
      sttPipeline: 'streaming',
      sttMode: 'translate',
      languageCode: 'en-IN',
      highVadSensitivity: false,
      silenceMs: 800,
      bargeIn: false,
      ttsEnabled: Boolean(envKey),
      ttsSpeaker: 'shubh',
      ttsLanguageCode: 'en-IN',
    };
  };

  return {
    state: 'idle',
    isListening: false,
    transcript: '',
    interimTranscript: '',
    commandDraft: '',
    isReviewingCommand: false,
    audioLevel: 0,

    // Split Layout and Chat default states
    isPanelOpen: false,
    suggestionsHidden: false,
    chatHistory: [
      {
        id: 'welcome',
        sender: 'agent',
        text: 'Welcome to Propley Voice Engine. How can I assist you with your presentations or portfolio today?',
        timestamp: new Date().toISOString(),
      }
    ],
    slotFilling: null,
    pendingClientLookup: null,

    executionQueue: [],
    currentExecutionIndex: -1,
    commandHistory: [],
    micError: null,
    agentSpeech: null,
    recentSuggestions: [...VOICE_ENGINE.trySaying],

    settings: getInitialSettings(),

    router: null,
    activeTemplateTab: null,
    moderatorState: {
      isMicOn: true,
      isCamOn: true,
      showObservers: true,
      activeSlide: '04',
      activeDrawer: null,
    },
    clientProfileState: {
      activeSection: 'overview',
    },

    setState: (state) => set({ state }),
    setListening: (isListening) => set({ isListening }),
    setTranscript: (transcript) => set({ transcript }),
    setInterimTranscript: (interimTranscript) => set({ interimTranscript }),
    setCommandDraft: (commandDraft) => set({ commandDraft }),
    setReviewingCommand: (isReviewingCommand) => set({ isReviewingCommand }),
    setAudioLevel: (audioLevel) => set({ audioLevel }),
    setRouter: (router) => set({ router }),
    setMicError: (micError) => set({ micError }),
    clearMicError: () => set({ micError: null }),

    // Split panel actions
    setPanelOpen: (isPanelOpen) => set({ isPanelOpen }),
    setSuggestionsHidden: (suggestionsHidden) => set({ suggestionsHidden }),
    addChatMessage: (sender, text) => {
      const id = Math.random().toString(36).substring(2, 9);
      set((prev) => ({
        chatHistory: [
          ...prev.chatHistory,
          {
            id,
            sender,
            text,
            timestamp: new Date().toISOString(),
          },
        ],
      }));
      return id;
    },
    updateChatMessage: (id, text) => {
      set((prev) => ({
        chatHistory: prev.chatHistory.map((m) => (m.id === id ? { ...m, text } : m)),
      }));
    },
    setAgentSpeech: (agentSpeech) => set({ agentSpeech }),
    clearChatHistory: () => set({
      chatHistory: [
        {
          id: 'welcome',
          sender: 'agent',
          text: 'Welcome to Propley Voice Engine. How can I assist you with your presentations or portfolio today?',
          timestamp: new Date().toISOString(),
        }
      ]
    }),

    // Slot-filling actions
    startSlotFilling: (commandId, initialArgs, missingFields) => set({
      slotFilling: {
        commandId,
        filledArgs: initialArgs,
        missingFields,
        currentFieldIndex: 0,
        phase: 'collecting',
      },
    }),
    enterSlotPreview: () => set((prev) => {
      if (!prev.slotFilling) return {};
      return {
        slotFilling: { ...prev.slotFilling, phase: 'preview' },
      };
    }),
    updateSlotValue: (field, value) => set((prev) => {
      if (!prev.slotFilling) return {};
      return {
        slotFilling: {
          ...prev.slotFilling,
          filledArgs: {
            ...prev.slotFilling.filledArgs,
            [field]:
              value === undefined || value === null ? undefined : String(value),
          }
        }
      };
    }),
    advanceSlotIndex: () => set((prev) => {
      if (!prev.slotFilling) return {};
      return {
        slotFilling: {
          ...prev.slotFilling,
          currentFieldIndex: prev.slotFilling.currentFieldIndex + 1
        }
      };
    }),
    syncSlotCollecting: (filledArgs, missingFields) => set((prev) => {
      if (!prev.slotFilling) return {};
      return {
        slotFilling: {
          ...prev.slotFilling,
          filledArgs,
          missingFields,
          currentFieldIndex: 0,
          phase: 'collecting',
        },
      };
    }),
    resetSlotFilling: () => set({ slotFilling: null }),
    setPendingClientLookup: (pending) => set({ pendingClientLookup: pending }),
    clearPendingClientLookup: () => set({ pendingClientLookup: null }),

    setExecutionQueue: (executionQueue) => set({ executionQueue, currentExecutionIndex: 0 }),
    updateExecutionStatus: (id, status, error) => set((prev) => ({
      executionQueue: prev.executionQueue.map((item) => 
        item.id === id ? { ...item, status, error } : item
      )
    })),
    setCurrentExecutionIndex: (currentExecutionIndex) => set({ currentExecutionIndex }),
    resetQueue: () => set({ executionQueue: [], currentExecutionIndex: -1 }),
    addToHistory: (query) => set((prev) => {
      const history = [query, ...prev.commandHistory.filter((q) => q !== query)].slice(0, 15);
      return { commandHistory: history };
    }),

    updateSettings: (newSettings) => set((prev) => {
      const settings = { ...prev.settings, ...newSettings };
      if (typeof window !== 'undefined') {
        localStorage.setItem('propley_voice_agent_settings', JSON.stringify(settings));
      }
      return { settings };
    }),

    setModeratorState: (modState) => set((prev) => ({
      moderatorState: { ...prev.moderatorState, ...modState }
    })),
    setClientProfileState: (clientState) => set((prev) => ({
      clientProfileState: { ...prev.clientProfileState, ...clientState }
    })),
  };
}));

