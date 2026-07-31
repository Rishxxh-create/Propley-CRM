'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RiSparklingFill, RiCloseLine, RiSendPlaneFill, RiMicFill } from 'react-icons/ri';
import { cn } from '@/lib/utils';
import { useTools } from '@/lib/agent/use-tools';
import { TOOLS_FOR_GEMINI } from '@/lib/agent/tools';
import {
  ChatEntry,
  CopilotTurnResponse,
  GeminiMessage,
  isFunctionCallPart,
  isTextPart,
  Part,
} from '@/lib/agent/types';
import { api } from '@/lib/api/client';

const MAX_ITERATIONS = 10;

interface SpeechRecognitionResult {
  0: { transcript: string };
}
interface SpeechRecognitionEvent {
  results: ArrayLike<SpeechRecognitionResult>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.05;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function Copilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const messagesRef = useRef<GeminiMessage[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { execute } = useTools();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, isThinking]);

  const pushChat = useCallback((entry: ChatEntry) => {
    setChat((prev) => [...prev, entry]);
  }, []);

  const runLoop = useCallback(
    async (initialMessages: GeminiMessage[]) => {
      let messages = initialMessages;
      setIsThinking(true);

      try {
        for (let i = 0; i < MAX_ITERATIONS; i++) {
          const turn = await api<CopilotTurnResponse>('/api/v1/copilot/', {
            method: 'POST',
            body: JSON.stringify({ messages, tools: TOOLS_FOR_GEMINI }),
          });
          const parts: Part[] = turn.parts || [];

          messages = [...messages, { role: 'model', parts }];

          const functionResponseParts: Part[] = [];
          let askUserQuestion: string | null = null;

          for (const part of parts) {
            if (!isFunctionCallPart(part)) continue;
            const { name, args } = part.functionCall;
            const result = await execute(name, args || {});
            functionResponseParts.push({
              functionResponse: { name, response: result.response },
            });
            if (result.askUser) askUserQuestion = result.askUser;
          }

          if (functionResponseParts.length > 0) {
            messages = [
              ...messages,
              { role: 'user', parts: functionResponseParts },
            ];
          }

          if (askUserQuestion) {
            pushChat({ id: uid(), role: 'assistant', text: askUserQuestion });
            if (ttsEnabled) speak(askUserQuestion);
            messagesRef.current = messages;
            return;
          }

          if (functionResponseParts.length === 0) {
            const text = parts
              .filter(isTextPart)
              .map((p) => p.text)
              .join(' ')
              .trim();
            if (text) {
              pushChat({ id: uid(), role: 'assistant', text });
              if (ttsEnabled) speak(text);
            }
            messagesRef.current = messages;
            return;
          }
        }
        pushChat({
          id: uid(),
          role: 'assistant',
          text: '(stopped: iteration limit reached)',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Copilot error';
        pushChat({ id: uid(), role: 'assistant', text: `Error: ${message}` });
      } finally {
        messagesRef.current = messages;
        setIsThinking(false);
      }
    },
    [execute, pushChat, ttsEnabled]
  );

  const sendUserText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking) return;
      pushChat({ id: uid(), role: 'user', text: trimmed });
      setInput('');
      const messages: GeminiMessage[] = [
        ...messagesRef.current,
        { role: 'user', parts: [{ text: trimmed }] },
      ];
      await runLoop(messages);
    },
    [isThinking, pushChat, runLoop]
  );

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      pushChat({
        id: uid(),
        role: 'assistant',
        text: 'Voice input is not supported in this browser.',
      });
      return;
    }
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript || '';
      setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    setIsListening(true);
    try { rec.start(); } catch { setIsListening(false); }
  }, [pushChat]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return (
    <>
      {/* FLOATING ACTIVATION BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Open Propley Copilot"
        className={cn(
          'fixed z-[70] bottom-6 right-6 h-14 w-14 bg-ink text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-105 rounded-lg',
          isOpen && 'bg-gold'
        )}
      >
        <RiSparklingFill size={22} />
      </button>

      {/* CHAT PANEL */}
      {isOpen && (
        <div className="fixed z-[70] bottom-24 right-6 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-8rem)] bg-white border border-stone-alt shadow-2xl flex flex-col rounded-lg">
          <header className="flex items-center justify-between px-5 py-4 border-b border-stone-alt">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gold" />
              <h3 className="text-sm font-semibold text-ink tracking-tight">Propley Copilot</h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTtsEnabled((v) => !v)}
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-widest transition-colors',
                  ttsEnabled ? 'text-gold' : 'text-zinc-400 hover:text-ink'
                )}
                aria-label="Toggle voice output"
              >
                Voice {ttsEnabled ? 'on' : 'off'}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-ink"
                aria-label="Close"
              >
                <RiCloseLine size={20} />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {chat.length === 0 && (
              <div className="text-xs font-medium text-zinc-400 leading-relaxed">
                Try: <span className="text-ink font-semibold">&ldquo;Schedule a meeting for Rohit&rdquo;</span>
                <br />
                Or: <span className="text-ink font-semibold">&ldquo;Add the Ivory Pavilion project for next Tuesday at 3pm&rdquo;</span>
              </div>
            )}
            {chat.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  'text-sm leading-relaxed',
                  entry.role === 'user'
                    ? 'text-ink font-medium'
                    : 'text-zinc-600 font-normal'
                )}
              >
                <span
                  className={cn(
                    'inline-block text-[10px] font-semibold uppercase tracking-widest mr-2',
                    entry.role === 'user' ? 'text-gold' : 'text-zinc-400'
                  )}
                >
                  {entry.role === 'user' ? 'You' : 'Copilot'}
                </span>
                {entry.text}
              </div>
            ))}
            {isThinking && (
              <div className="text-xs font-medium text-zinc-400">Thinking…</div>
            )}
          </div>

          <form
            className="flex items-center gap-2 px-3 py-3 border-t border-stone-alt"
            onSubmit={(e) => {
              e.preventDefault();
              sendUserText(input);
            }}
          >
            <button
              type="button"
              onMouseDown={startListening}
              onMouseUp={stopListening}
              onMouseLeave={() => isListening && stopListening()}
              onTouchStart={(e) => { e.preventDefault(); startListening(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopListening(); }}
              className={cn(
                'h-10 w-10 flex items-center justify-center border border-stone-alt rounded-lg transition-colors shrink-0',
                isListening ? 'bg-gold text-white border-gold' : 'bg-white text-zinc-500 hover:text-ink'
              )}
              aria-label="Hold to talk"
              aria-pressed={isListening}
              title="Hold to talk"
            >
              <RiMicFill size={16} />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the Copilot…"
              className="flex-1 h-10 text-sm font-medium text-ink bg-white border-b border-stone-alt focus:border-gold outline-none px-2 placeholder:text-zinc-400 placeholder:font-normal rounded-lg"
              disabled={isThinking}
            />
            <button
              type="submit"
              disabled={isThinking || !input.trim()}
              className="h-10 w-10 flex items-center justify-center bg-ink text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shrink-0"
              aria-label="Send"
            >
              <RiSendPlaneFill size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
