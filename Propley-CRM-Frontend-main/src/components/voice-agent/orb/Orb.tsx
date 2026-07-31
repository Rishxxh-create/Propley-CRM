'use client';

import { motion } from 'framer-motion';
import { useVoiceAgentStore } from '@/store/voice-agent-store';
import { RiMicLine, RiLoader4Line, RiCheckLine, RiCloseLine, RiStopFill, RiVolumeUpLine } from 'react-icons/ri';
import { cn } from '@/lib/utils';

interface OrbProps {
  onClick: () => void;
  isModeratorMode?: boolean;
}

export function Orb({ onClick, isModeratorMode = false }: OrbProps) {
  const { state, isListening, audioLevel, agentSpeech } = useVoiceAgentStore();
  const isSpeaking = state === 'speaking' || !!agentSpeech;

  // Scale based on audio level when listening
  const pulseScale = isListening ? 1 + (audioLevel / 100) * 0.4 : 1;

  // Determine state icon
  const getIcon = () => {
    if (isSpeaking) {
      return (
        <RiVolumeUpLine
          className={isModeratorMode ? 'text-gold-light' : 'text-gold'}
          size={20}
        />
      );
    }
    switch (state) {
      case 'processing':
        return <RiLoader4Line className="animate-spin text-gold" size={20} />;
      case 'executing':
        return <RiLoader4Line className="animate-spin text-gold" size={20} />;
      case 'success':
        return <RiCheckLine className="text-success" size={20} />;
      case 'error':
        return <RiCloseLine className="text-error" size={20} />;
      case 'listening':
        // Show a stop icon so it's obvious clicking again will turn the mic off.
        return (
          <RiStopFill
            className={isModeratorMode ? 'text-gold-light' : 'text-gold'}
            size={20}
          />
        );
      default:
        return <RiMicLine className="text-zinc-400 group-hover:text-gold transition-colors" size={18} />;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative focus:outline-none cursor-pointer"
      aria-label="Toggle voice assistant"
    >
      {/* Dynamic Pulses (Outer rings) */}
      {isListening && (
        <>
          <motion.div
            className={cn(
              "absolute inset-0 -m-3 rounded-full opacity-20 pointer-events-none",
              isModeratorMode ? "bg-gold-light/40" : "bg-gold/30"
            )}
            animate={{ scale: pulseScale * 1.3 }}
            transition={{ type: 'spring', damping: 15 }}
          />
          <motion.div
            className={cn(
              "absolute inset-0 -m-6 rounded-full opacity-10 pointer-events-none",
              isModeratorMode ? "bg-gold-light/20" : "bg-gold/15"
            )}
            animate={{ scale: pulseScale * 1.6 }}
            transition={{ type: 'spring', damping: 12, delay: 0.05 }}
          />
        </>
      )}

      {/* Speaking aura (agent talking) */}
      {isSpeaking && !isListening && (
        <motion.div
          className={cn(
            "absolute inset-0 -m-3 rounded-full pointer-events-none",
            isModeratorMode ? "bg-gold-light/30" : "bg-gold/25"
          )}
          animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0.12, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
        />
      )}

      {/* Main Orb Body */}
      <motion.div
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-300 relative z-10 shadow-lg",
          isModeratorMode
            ? cn(
                "bg-[#0d0d0d]/80 border-white/10 text-white backdrop-blur-md",
                isListening && "border-gold-light/50 shadow-[0_0_25px_rgba(255,201,119,0.25)]"
              )
            : cn(
                "bg-white border-stone-alt text-ink",
                isListening && "border-gold/40 shadow-[0_0_20px_rgba(139,107,63,0.18)]",
                (state === 'success') && "border-success/30",
                (state === 'error') && "border-error/30"
              )
        )}
        animate={{
          scale: pulseScale,
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {getIcon()}

        {/* Breathing aura when idle */}
        {state === 'idle' && (
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full -m-px opacity-30 pointer-events-none border",
              isModeratorMode ? "border-gold-light/20" : "border-gold/30"
            )}
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.div>
    </button>
  );
}
