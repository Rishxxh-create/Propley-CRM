'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceAgentStore } from '@/store/voice-agent-store';
import { Waveform } from '../waveform/Waveform';
import { cn } from '@/lib/utils';

interface TranscriptOverlayProps {
  isModeratorMode?: boolean;
}

export function TranscriptOverlay({ isModeratorMode = false }: TranscriptOverlayProps) {
  const { transcript, interimTranscript, isListening, state } = useVoiceAgentStore();

  const hasText = transcript.trim().length > 0 || interimTranscript.trim().length > 0;
  const isVisible = isListening || state === 'processing' || (state === 'executing' && hasText);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-xl text-center"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        <div
          className={cn(
            "px-6 py-4 border shadow-2xl backdrop-blur-md flex flex-col items-center gap-3 rounded-lg",
            isModeratorMode
              ? "bg-[#050505]/95 border-white/10 text-white"
              : "bg-white/95 border-stone-alt text-ink"
          )}
        >
          {/* Waveform visualizer */}
          {isListening && <Waveform isModeratorMode={isModeratorMode} barCount={15} />}

          {/* Transcript text content */}
          <div className="space-y-1">
            {state === 'processing' && !hasText ? (
              <p className={cn("text-xs font-semibold tracking-[0.12em] uppercase animate-pulse", isModeratorMode ? "text-gold-light" : "text-gold")}>
                Processing intent...
              </p>
            ) : hasText ? (
              <p className="text-sm md:text-base font-medium tracking-tight leading-relaxed">
                {transcript}
                {interimTranscript && (
                  <span className={isModeratorMode ? "text-zinc-500" : "text-zinc-400"}>
                    {' '}{interimTranscript}
                  </span>
                )}
              </p>
            ) : (
              <p className={cn("text-xs font-semibold tracking-[0.15em] uppercase", isModeratorMode ? "text-gold-light-muted" : "text-zinc-400")}>
                Listening... Speak now
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
