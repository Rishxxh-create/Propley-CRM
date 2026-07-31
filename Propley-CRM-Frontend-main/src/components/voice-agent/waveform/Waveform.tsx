'use client';

import { useEffect, useMemo, useState } from 'react';
import { useVoiceAgentStore } from '@/store/voice-agent-store';
import { cn } from '@/lib/utils';

interface WaveformProps {
  isModeratorMode?: boolean;
  barCount?: number;
}

const IDLE_BAR_HEIGHT = 2;

export function Waveform({ isModeratorMode = false, barCount = 11 }: WaveformProps) {
  const { audioLevel, isListening } = useVoiceAgentStore();
  const [animatedHeights, setAnimatedHeights] = useState<number[]>(() =>
    Array(barCount).fill(IDLE_BAR_HEIGHT)
  );

  useEffect(() => {
    if (!isListening) return;

    const interval = setInterval(() => {
      setAnimatedHeights(
        Array(barCount)
          .fill(0)
          .map(() => {
            const baseHeight = (audioLevel / 100) * 32;
            const scale = Math.random() * 0.9 + 0.3;
            return Math.max(3, baseHeight * scale);
          })
      );
    }, 60);

    return () => clearInterval(interval);
  }, [audioLevel, isListening, barCount]);

  const idleHeights = useMemo(() => Array(barCount).fill(IDLE_BAR_HEIGHT), [barCount]);
  const jitters = isListening ? animatedHeights : idleHeights;

  return (
    <div className="flex items-center gap-1.5 h-10 px-2 justify-center" aria-hidden="true">
      {jitters.map((height, i) => (
        <div
          key={i}
          className={cn(
            'w-0.5 transition-all duration-75 ease-out rounded-lg',
            isModeratorMode ? 'bg-gold-light' : 'bg-gold'
          )}
          style={{
            height: `${height}px`,
            opacity: isListening ? 0.3 + (height / 32) * 0.7 : 0.2,
          }}
        />
      ))}
    </div>
  );
}
