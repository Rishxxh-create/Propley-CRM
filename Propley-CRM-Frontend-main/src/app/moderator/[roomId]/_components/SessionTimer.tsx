"use client";

import { useState, useEffect } from "react";
import { RiTimeLine } from "react-icons/ri";

interface SessionTimerProps {
  compact?: boolean;
}

export function SessionTimer({ compact = false }: SessionTimerProps) {
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-gold-light">
        <RiTimeLine size={14} />
        {formatTime(timer)}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs font-semibold tabular-nums text-gold-light tracking-wide bg-gold/10 border border-gold-light/20 px-4 h-10 select-none">
      <RiTimeLine size={14} />
      {formatTime(timer)}
    </div>
  );
}
