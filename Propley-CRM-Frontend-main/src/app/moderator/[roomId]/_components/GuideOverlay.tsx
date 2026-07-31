'use client';

import { motion } from 'framer-motion';
import { RiCloseLine } from 'react-icons/ri';

interface GuideOverlayProps {
  onClose: () => void;
  guide?: {
    title: string;
    script: string;
  };
}

export function GuideOverlay({ onClose, guide }: GuideOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="absolute top-20 bottom-24 right-4 md:right-10 w-[calc(100%-2rem)] md:w-[380px] flex flex-col bg-obsidian/95 md:bg-black/60 md:backdrop-blur-2xl border border-white/10 z-[55] shadow-2xl overflow-hidden"
    >
      <div className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between bg-gold/5 shrink-0">
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold text-gold-light uppercase tracking-widest">Active Perspective</p>
          <h4 className="text-base md:text-lg font-semibold text-white italic leading-tight">{guide?.title || 'Master Bedroom Gallery'}</h4>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors text-white/70"
        >
          <RiCloseLine size={20} />
        </button>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sales Narrative</p>
          <div className="text-sm font-medium text-white/80 leading-relaxed italic border-l-2 border-gold pl-4 space-y-4">
            {guide?.script ? (
              guide.script.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))
            ) : (
              <p>&ldquo;Welcome to the master sanctuary. Notice how the floor-to-ceiling windows invite the morning light, creating a natural awakening.&rdquo;</p>
            )}
          </div>
        </div>

        {!guide && (
          <div className="space-y-4 pt-4 border-t border-white/5">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tactical Insights</p>
            <ul className="space-y-3">
              {[
                'Highlight the integrated smart lighting system.',
                'Point out the seamless walk-in closet transition.',
                'Wait for client response before moving to ensuite.'
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-xs font-medium text-white/60">
                  <span className="w-1.5 h-1.5 bg-gold shrink-0 mt-1.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

    </motion.div>
  );
}
