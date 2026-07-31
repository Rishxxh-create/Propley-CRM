export type AgentState = 'idle' | 'listening' | 'processing' | 'speaking' | 'executing' | 'success' | 'error';

export interface CommandExecution {
  id: string;
  commandId: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'error';
  args?: CommandArgs;
  error?: string;
}

export interface CommandArgs {
  path?: string;
  query?: string;
  status?: string;
  advisor?: string;
  project?: string;
  date?: string;
  time?: string;
  client?: string;
  drawer?: 'analytics' | 'script' | 'visitors' | null;
  slide?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface CommandDefinition {
  id: string;
  name: string;
  category: 'navigation' | 'session' | 'crm' | 'dashboard';
  description: string;
  aliases: string[];
  validate?: (args: CommandArgs) => boolean | string;
  execute: (args: CommandArgs) => Promise<void>;
}

export type IntentEngine = 'gemini' | 'rules' | 'hybrid';

export type SarvamSttPipeline = 'rest' | 'streaming';
export type SarvamSttMode = 'transcribe' | 'translate' | 'verbatim' | 'translit' | 'codemix';

export interface VoiceAgentSettings {
  mode: 'live' | 'simulation';
  /** Sarvam STT/TTS subscription key */
  apiKey: string | null;
  /** Google Gemini key for post-speech intent (optional if GEMINI_API_KEY is set server-side) */
  geminiApiKey: string | null;
  /** How to map spoken text → command queue */
  intentEngine: IntentEngine;
  persistentListening: boolean;
  /** REST (chunked) or WebSocket streaming with Sarvam VAD */
  sttPipeline: SarvamSttPipeline;
  /** translate = Hindi/Indic → English for CRM commands */
  sttMode: SarvamSttMode;
  /** BCP-47 hint; unknown lets Sarvam auto-detect */
  languageCode: string;
  /** Shorter end-of-utterance silence (local + Sarvam high_vad) */
  highVadSensitivity: boolean;

  silenceMs: number;

  bargeIn: boolean;
  /** Speak agent replies via Bulbul v3 */
  ttsEnabled: boolean;
  ttsSpeaker: string;
  ttsLanguageCode: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string; // ISO string
}

/** Agent message currently being synthesized or played (TTS) */
export interface AgentSpeechState {
  messageId: string;
  status: 'loading' | 'playing';
}

export interface SlotField {
  name: string;
  prompt: string;
  type?: 'string' | 'date' | 'time';
}

export type SlotFillingPhase = 'collecting' | 'preview';

export interface SlotFillingState {
  commandId: string;
  filledArgs: CommandArgs;
  missingFields: SlotField[];
  currentFieldIndex: number;
  phase: SlotFillingPhase;
}

/** Waiting for user to pick among multiple CRM name matches */
export interface PendingClientLookup {
  query: string;
  candidateIds: string[];
  /** info = read aloud details; open = navigate to profile only */
  intent: 'info' | 'open';
  /** Original spoken question for Gemini context */
  userQuestion?: string;
}
