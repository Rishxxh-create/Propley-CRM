'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useVoiceAgentStore } from '@/store/voice-agent-store';
import { useVoiceAgent } from '@/context/VoiceAgentProvider';
import {
  RiCommandLine,
  RiSettings3Line,
  RiHistoryLine,
  RiLightbulbLine,
  RiCloseLine,
  RiCheckLine,
  RiCpuLine,
  RiEyeLine,
  RiEyeOffLine
} from 'react-icons/ri';
import { cn } from '@/lib/utils';
import { VOICE_ENGINE } from '@/lib/copy';
import type { IntentEngine } from '@/types/voice-agent';

interface CommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
  isModeratorMode?: boolean;
}

export function CommandCenter({ isOpen, onClose, isModeratorMode = false }: CommandCenterProps) {
  const { settings, updateSettings, commandHistory, recentSuggestions } = useVoiceAgentStore();
  const { triggerCommandString } = useVoiceAgent();

  const [activeTab, setActiveTab] = useState<'commands' | 'settings'>('commands');
  const [inputValue, setInputValue] = useState('');
  const [showSarvamKey, setShowSarvamKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [sarvamKeyDraft, setSarvamKeyDraft] = useState<string | null>(null);
  const [geminiKeyDraft, setGeminiKeyDraft] = useState<string | null>(null);
  const sarvamKeyInput = sarvamKeyDraft ?? settings.apiKey ?? '';
  const geminiKeyInput = geminiKeyDraft ?? settings.geminiApiKey ?? '';
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setInputValue('');
    setSarvamKeyDraft(null);
    setGeminiKeyDraft(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Handle outside click & ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    triggerCommandString(inputValue.trim());
    handleClose();
  };

  const handleSuggestionClick = (query: string) => {
    triggerCommandString(query);
    handleClose();
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSarvam = sarvamKeyInput.trim() || null;
    const trimmedGemini = geminiKeyInput.trim() || null;
    updateSettings({
      apiKey: trimmedSarvam,
      geminiApiKey: trimmedGemini,
      mode: trimmedSarvam ? 'live' : settings.mode,
    });
    handleClose();
  };

  const intentModes: { id: IntentEngine; label: string; hint: string }[] = [
    { id: 'hybrid', label: 'Hybrid', hint: 'Gemini first, rules fallback' },
    { id: 'gemini', label: 'Gemini', hint: 'AI-only intent' },
    { id: 'rules', label: 'Rules', hint: 'Local parser only' },
  ];

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Modal Card */}
      <div
        className={cn(
          "w-full max-w-xl border shadow-2xl overflow-hidden flex flex-col rounded-lg",
          isModeratorMode
            ? "bg-[#0b0b0b] border-white/10 text-white"
            : "bg-white border-stone-alt text-ink"
        )}
      >
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-stone-alt/25 px-5 py-3">
          <div className="flex gap-4 items-center">
            {/* Live mode badge */}
            {settings.mode === 'live' && settings.apiKey && (
              <span className={cn(
                'text-[9px] font-semibold tracking-[0.12em] uppercase px-2 py-0.5 border',
                isModeratorMode
                  ? 'bg-gold-light/10 border-gold-light/30 text-gold-light'
                  : 'bg-gold/10 border-gold/30 text-gold'
              )}>
                ● Sarvam Live
              </span>
            )}
            <button
              onClick={() => setActiveTab('commands')}
              className={cn(
                "text-xs font-semibold tracking-[0.1em] uppercase flex items-center gap-1.5 py-1 cursor-pointer border-b-2",
                activeTab === 'commands'
                  ? (isModeratorMode ? "border-gold-light text-white" : "border-gold text-ink")
                  : "border-transparent text-zinc-400 hover:text-zinc-500"
              )}
            >
              <RiCommandLine size={14} />
              Console
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                "text-xs font-semibold tracking-[0.1em] uppercase flex items-center gap-1.5 py-1 cursor-pointer border-b-2",
                activeTab === 'settings'
                  ? (isModeratorMode ? "border-gold-light text-white" : "border-gold text-ink")
                  : "border-transparent text-zinc-400 hover:text-zinc-500"
              )}
            >
              <RiSettings3Line size={14} />
              Config
            </button>
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
          >
            <RiCloseLine size={18} />
          </button>
        </div>

        {/* Console view */}
        {activeTab === 'commands' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Input Form */}
            <form onSubmit={handleSubmit} className="border-b border-stone-alt/20">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a voice command... (e.g. 'open meetings then filter completed')"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className={cn(
                  "w-full h-14 px-6 text-sm font-medium border-none outline-none focus:ring-0 placeholder:text-zinc-400",
                  isModeratorMode ? "bg-white/5 text-white" : "bg-stone/20 text-ink"
                )}
              />
            </form>

            {/* Recommendations scroll wrapper */}
            <div className="p-6 overflow-y-auto max-h-[320px] custom-scrollbar flex flex-col gap-6">
              {/* Recent History */}
              {commandHistory.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 flex items-center gap-1.5">
                    <RiHistoryLine size={12} />
                    Recent Searches
                  </p>
                  <div className="flex flex-col gap-1">
                    {commandHistory.map((cmd, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(cmd)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs font-medium transition-colors cursor-pointer rounded-lg border border-transparent",
                          isModeratorMode
                            ? "hover:bg-white/5 hover:border-white/5 text-zinc-300"
                            : "hover:bg-stone hover:border-stone-alt/40 text-zinc-700"
                        )}
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 flex items-center gap-1.5">
                  <RiLightbulbLine size={12} />
                  Suggested Commands
                </p>
                <div className="flex flex-col gap-1">
                  {(recentSuggestions.length > 0
                    ? recentSuggestions
                    : [...VOICE_ENGINE.trySaying]
                  ).slice(0, 6).map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 text-xs font-semibold tracking-tight transition-all cursor-pointer rounded-lg border border-transparent",
                        isModeratorMode
                          ? "hover:bg-white/5 hover:border-white/5 text-zinc-200"
                          : "hover:bg-stone hover:border-stone-alt/40 text-ink"
                      )}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Config Settings view */}
        {activeTab === 'settings' && (
          <div className="p-6 flex flex-col gap-6">
            <div className="space-y-4">
              {/* Connection Mode */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                  STT Engine Mode
                </label>
                <div className="flex border border-stone-alt/30 p-1 bg-stone/20">
                  <button
                    type="button"
                    onClick={() => updateSettings({ mode: 'simulation' })}
                    className={cn(
                      "flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors rounded-lg",
                      settings.mode === 'simulation'
                        ? (isModeratorMode ? "bg-white/10 text-white" : "bg-white text-ink shadow-sm")
                        : "text-zinc-400 hover:text-zinc-500"
                    )}
                  >
                    <RiCpuLine size={14} />
                    Native Speech (Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSettings({ mode: 'live' })}
                    className={cn(
                      "flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors rounded-lg",
                      settings.mode === 'live'
                        ? (isModeratorMode ? "bg-white/10 text-white" : "bg-white text-ink shadow-sm")
                        : "text-zinc-400 hover:text-zinc-500"
                    )}
                  >
                    <RiCommandLine size={14} />
                    Sarvam AI (Live)
                  </button>
                </div>
              </div>

              {/* Persistent Mode */}
              <div className="flex items-center justify-between py-2 border-b border-stone-alt/10">
                <div>
                  <p className="text-xs font-semibold">Continuous Listening</p>
                  <p className="text-[10px] text-zinc-400">Keep mic active after completing commands</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSettings({ persistentListening: !settings.persistentListening })}
                  className={cn(
                    "w-9 h-5 flex items-center px-0.5 transition-colors duration-200 ease-in-out cursor-pointer",
                    settings.persistentListening ? "bg-gold" : "bg-zinc-300"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 bg-white shadow-sm transition-transform duration-200 ease-in-out",
                      settings.persistentListening && "translate-x-4"
                    )}
                  />
                </button>
              </div>

              {/* End-of-speech silence timeout */}
              <div className="flex flex-col gap-2 py-2 border-b border-stone-alt/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">End-of-speech silence</p>
                    <p className="text-[10px] text-zinc-400">How long to wait after you stop talking</p>
                  </div>
                  <span className="text-xs font-semibold tabular-nums">{settings.silenceMs} ms</span>
                </div>
                <input
                  type="range"
                  min={700}
                  max={1000}
                  step={50}
                  value={settings.silenceMs}
                  onChange={(e) => updateSettings({ silenceMs: Number(e.target.value) })}
                  className="w-full accent-gold cursor-pointer"
                />
              </div>

              {/* Barge-in */}
              <div className="flex items-center justify-between py-2 border-b border-stone-alt/10">
                <div>
                  <p className="text-xs font-semibold">Interrupt to talk (barge-in)</p>
                  <p className="text-[10px] text-zinc-400">Start speaking to cut off the assistant</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSettings({ bargeIn: !settings.bargeIn })}
                  className={cn(
                    "w-9 h-5 flex items-center px-0.5 transition-colors duration-200 ease-in-out cursor-pointer",
                    settings.bargeIn ? "bg-gold" : "bg-zinc-300"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 bg-white shadow-sm transition-transform duration-200 ease-in-out",
                      settings.bargeIn && "translate-x-4"
                    )}
                  />
                </button>
              </div>

              {/* Speak replies */}
              <div className="flex items-center justify-between py-2 border-b border-stone-alt/10">
                <div>
                  <p className="text-xs font-semibold">Speak replies aloud</p>
                  <p className="text-[10px] text-zinc-400">Play the assistant&apos;s voice responses</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSettings({ ttsEnabled: !settings.ttsEnabled })}
                  className={cn(
                    "w-9 h-5 flex items-center px-0.5 transition-colors duration-200 ease-in-out cursor-pointer",
                    settings.ttsEnabled ? "bg-gold" : "bg-zinc-300"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 bg-white shadow-sm transition-transform duration-200 ease-in-out",
                      settings.ttsEnabled && "translate-x-4"
                    )}
                  />
                </button>
              </div>

              {/* Intent engine */}
              <div className="flex flex-col gap-2 border-b border-stone-alt/10 pb-4">
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                  Command intelligence (Gemini)
                </label>
                <div className="flex border border-stone-alt/30 p-1 bg-stone/20">
                  {intentModes.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => updateSettings({ intentEngine: mode.id })}
                      className={cn(
                        'flex-1 py-2 text-[10px] font-semibold transition-colors rounded-lg',
                        settings.intentEngine === mode.id
                          ? isModeratorMode
                            ? 'bg-white/10 text-white'
                            : 'bg-white text-ink shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-500'
                      )}
                      title={mode.hint}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-400">
                  After you speak, Gemini maps your request to the command registry (presentations,
                  clients, navigation).
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                    Gemini API Key
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showGeminiKey ? 'text' : 'password'}
                      placeholder="AIza… or set GEMINI_API_KEY in .env.local"
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyDraft(e.target.value)}
                      className={cn(
                        'w-full h-11 pr-10 text-xs font-medium border-b border-stone-alt bg-transparent outline-none focus:border-gold focus:ring-0',
                        isModeratorMode ? 'text-white' : 'text-ink'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-0 text-zinc-400 hover:text-zinc-500 p-2"
                    >
                      {showGeminiKey ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
                    </button>
                  </div>
                </div>

                {settings.mode === 'live' && (
                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                      Sarvam Subscription Key
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showSarvamKey ? 'text' : 'password'}
                        placeholder="Enter api-subscription-key"
                        value={sarvamKeyInput}
                        onChange={(e) => setSarvamKeyDraft(e.target.value)}
                        className={cn(
                          'w-full h-11 pr-10 text-xs font-medium border-b border-stone-alt bg-transparent outline-none focus:border-gold focus:ring-0',
                          isModeratorMode ? 'text-white' : 'text-ink'
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSarvamKey(!showSarvamKey)}
                        className="absolute right-0 text-zinc-400 hover:text-zinc-500 p-2"
                      >
                        {showSarvamKey ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-ink hover:bg-gold py-3 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1.5 rounded-lg"
                >
                  <RiCheckLine size={15} />
                  Save settings
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
