'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useVoiceAgentStore } from '@/store/voice-agent-store';
import { useVoiceAgent } from '@/context/VoiceAgentProvider';
import { Orb } from './orb/Orb';
import { TranscriptOverlay } from './transcript/TranscriptOverlay';
import { Timeline } from './timeline/Timeline';
import { RiKeyboardLine, RiMicOffLine } from 'react-icons/ri';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function OrbContainer() {
  const router = useRouter();
  const pathname = usePathname();

  const {
    setListening,
    setRouter,
    micError,
    clearMicError,
    isPanelOpen,
    setPanelOpen,
  } = useVoiceAgentStore();

  const { toggleListening } = useVoiceAgent();

  // Sync Next.js router to Zustand store
  useEffect(() => {
    setRouter(router);
  }, [router, setRouter]);

  const isModeratorMode = pathname?.startsWith('/moderator/');
  const isSessionRoute =
    pathname?.startsWith('/moderator/') || pathname?.startsWith('/participant/');
  const isAuthPage = pathname === '/auth';
  const isDemoPage = pathname?.startsWith('/demo');

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true');

      if (isTyping) return;

      // Cmd+K or Ctrl+K -> Toggle Split Layout Sidebar Panel
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPanelOpen(!isPanelOpen);
        return;
      }

      // Shift+Space -> Toggle listening
      if (e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        // If sidebar not open, open it automatically when starting to talk
        if (!isPanelOpen) {
          setPanelOpen(true);
        }
        toggleListening();
        return;
      }

      // Space alone -> Push-to-Talk (listen on hold, stop on release)
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (!isPanelOpen) {
          setPanelOpen(true);
        }
        setListening(true);
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true');

      if (isTyping) return;

      // Release Space -> stop listening for PTT
      if (e.code === 'Space') {
        const storeSettings = useVoiceAgentStore.getState().settings;
        if (!storeSettings.persistentListening) {
          e.preventDefault();
          setListening(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [toggleListening, setListening, isPanelOpen, setPanelOpen]);

  if (isAuthPage || isDemoPage || isSessionRoute) return null;

  return (
    <>
      {/* Floating Orb Wrapper — slides horizontally when split sidebar is toggled */}
      <div
        className={cn(
          "fixed bottom-6 z-[999] flex items-center gap-3 transition-[right] duration-300 ease-[0.25,1,0.5,1]",
          isPanelOpen
            ? "right-6 max-md:right-6 md:right-[calc(300px+1.5rem)] lg:right-[calc(340px+1.5rem)] xl:right-[calc(400px+1.5rem)] 2xl:right-[calc(450px+1.5rem)]"
            : "right-6"
        )}
      >
        {/* Toggle Panel / Open Console Keyboard Button */}
        <button
          onClick={() => setPanelOpen(!isPanelOpen)}
          className={cn(
            "w-10 h-10 border flex items-center justify-center transition-all duration-300 opacity-60 hover:opacity-100 cursor-pointer shadow-md rounded-lg",
            isModeratorMode 
              ? "bg-[#0b0b0b] border-white/10 text-white/70 hover:text-white" 
              : "bg-white border-stone-alt text-zinc-500 hover:text-ink",
            isPanelOpen && "opacity-100 border-gold text-gold"
          )}
          title="Toggle Voice Console (Cmd+K)"
        >
          <RiKeyboardLine size={16} />
        </button>

        {/* Floating Orb button */}
        <Orb
          onClick={() => {
            if (!isPanelOpen) {
              setPanelOpen(true);
            }
            toggleListening();
          }}
          isModeratorMode={isModeratorMode}
        />
      </div>

      {/* No-Microphone error banner */}
      <AnimatePresence>
        {micError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "fixed bottom-24 z-[1001] max-w-xs border shadow-xl rounded-lg flex items-start gap-3 p-4 transition-all duration-300 ease-[0.25,1,0.5,1]",
              isPanelOpen
                ? "right-6 max-md:right-6 md:right-[calc(300px+1.5rem)] lg:right-[calc(340px+1.5rem)] xl:right-[calc(400px+1.5rem)] 2xl:right-[calc(450px+1.5rem)]"
                : "right-6",
              isModeratorMode 
                ? "bg-[#0d0d0d] border-white/10 text-white" 
                : "bg-white border-stone-alt text-ink"
            )}
          >
            <RiMicOffLine size={18} className="text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">
                {micError === 'NotAllowedError' ? 'Microphone access denied' : 'No microphone found'}
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                {micError === 'NotAllowedError'
                  ? 'Allow mic access in browser settings, then try again.'
                  : 'Switch to Native Speech (free) mode — it works without a mic device.'}
              </p>
              <button
                onClick={clearMicError}
                className="mt-2 text-[10px] font-semibold text-gold hover:text-gold-hover underline underline-offset-2"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Overlay Transcripts (only shown if split panel is closed to avoid clutter) */}
      {!isPanelOpen && <TranscriptOverlay isModeratorMode={isModeratorMode} />}

      {/* Chained Timeline execution indicator */}
      <Timeline isModeratorMode={isModeratorMode} />
    </>
  );
}
