'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceAgentStore } from '@/store/voice-agent-store';
import { RiLoader4Line, RiCheckLine, RiCloseLine, RiCheckboxBlankCircleLine } from 'react-icons/ri';
import { cn } from '@/lib/utils';

interface TimelineProps {
  isModeratorMode?: boolean;
}

export function Timeline({ isModeratorMode = false }: TimelineProps) {
  const { state, executionQueue, currentExecutionIndex } = useVoiceAgentStore();

  const isVisible = (state === 'executing' || state === 'success' || state === 'error') && executionQueue.length > 0;

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-24 right-6 z-[1000] w-80 shadow-2xl"
        initial={{ opacity: 0, x: 30, scale: 0.98 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 20, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className={cn(
            "p-5 border flex flex-col gap-4 rounded-lg",
            isModeratorMode
              ? "bg-[#0b0b0b]/95 border-white/10 text-white backdrop-blur-md"
              : "bg-white border-stone-alt text-ink"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-3 border-stone-alt/20">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Action Chain
            </span>
            <span
              className={cn(
                "text-[9px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5",
                state === 'success' && "bg-success-muted text-success border border-success/20",
                state === 'error' && "bg-error-muted text-error border border-error/20",
                state === 'executing' && "bg-gold/10 text-gold border border-gold/20"
              )}
            >
              {state}
            </span>
          </div>

          {/* List */}
          <div className="space-y-4">
            {executionQueue.map((item, idx) => {
              const isCurrent = idx === currentExecutionIndex;
              const isDone = item.status === 'success';
              const isErr = item.status === 'error';
              const isRun = item.status === 'running';

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 transition-opacity duration-200",
                    !isCurrent && !isDone && !isErr && "opacity-40"
                  )}
                >
                  {/* Status Indicator */}
                  <div className="mt-0.5 shrink-0">
                    {isRun ? (
                      <RiLoader4Line className="animate-spin text-gold" size={16} />
                    ) : isDone ? (
                      <RiCheckLine className="text-success" size={16} />
                    ) : isErr ? (
                      <RiCloseLine className="text-error" size={16} />
                    ) : (
                      <RiCheckboxBlankCircleLine className="text-zinc-400" size={14} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-xs font-semibold tracking-tight",
                        isCurrent && "text-gold font-medium",
                        isErr && "text-error",
                        isDone && (isModeratorMode ? "text-zinc-300 line-through" : "text-zinc-500 line-through")
                      )}
                    >
                      {item.label}
                    </p>
                    {item.error && (
                      <p className="text-[10px] text-error mt-0.5 leading-normal">
                        {item.error}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
