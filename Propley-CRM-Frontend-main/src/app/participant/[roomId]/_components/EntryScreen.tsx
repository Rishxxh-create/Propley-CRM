'use client';

import { useState, useEffect } from 'react';
import { RiArrowRightLine } from 'react-icons/ri';
import { motion } from 'framer-motion';
import { PropleyLogo } from '@/components/PropleyLogo';

interface EntryScreenProps {
  onJoin: (name: string, phone: string) => void;
  roomId?: string;
}

export function EntryScreen({ onJoin, roomId }: EntryScreenProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isReturning, setIsReturning] = useState(false);

  // Pre-fill from localStorage on mount
  useEffect(() => {
    const storageKey = roomId ? `propley_participant_${roomId}` : 'propley_participant_identity';
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const { name: savedName, phone: savedPhone } = JSON.parse(saved);
        if (savedName) { setName(savedName); setIsReturning(true); }
        if (savedPhone) setPhone(savedPhone);
      }
    } catch {
      // ignore malformed storage
    }
  }, [roomId]);

  /** Strip to pure digits, removing any leading country code */
  const cleanPhone = (raw: string): string => {
    let digits = raw.replace(/\D/g, '');
    // Strip leading 91 country code if user typed it
    if (digits.length > 10 && digits.startsWith('91')) {
      digits = digits.slice(2);
    }
    // Strip leading 0 (trunk prefix)
    if (digits.length > 10 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    return digits.slice(0, 10);
  };

  const validatePhone = (num: string): string | null => {
    const digits = cleanPhone(num);
    if (digits.length === 0) return 'Please enter your phone number';
    if (digits.length < 10) return 'Phone number must be 10 digits';
    if (!/^[6-9]/.test(digits)) return 'Indian mobile numbers start with 6, 7, 8 or 9';
    return null; // valid
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Extract only digits and cap at 10
    const digits = cleanPhone(raw);
    // Format as "XXXXX XXXXX" for readability
    const formatted = digits.length > 5
      ? `${digits.slice(0, 5)} ${digits.slice(5)}`
      : digits;
    setPhone(formatted);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    const phoneError = validatePhone(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    const formattedPhone = `+91${cleanPhone(phone)}`;
    // Persist identity to localStorage
    const storageKey = roomId ? `propley_participant_${roomId}` : 'propley_participant_identity';
    try {
      localStorage.setItem(storageKey, JSON.stringify({ name: name.trim(), phone: formattedPhone }));
      // Also save globally for cross-room reuse
      localStorage.setItem('propley_participant_identity', JSON.stringify({ name: name.trim(), phone: formattedPhone }));
    } catch {
      // ignore storage errors
    }
    onJoin(name.trim(), formattedPhone);
  };

  const phoneDigits = cleanPhone(phone);
  const isPhoneValid = phoneDigits.length === 10 && /^[6-9]/.test(phoneDigits);

  return (
    <div className="fixed inset-0 z-[100] bg-ivory flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* GOLD TOP ACCENT */}
      <div className="absolute top-0 left-0 w-full h-[6px] bg-gold" />

      {/* AMBIENT BACKGROUND TEXTURE */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20vw] font-semibold text-ink whitespace-nowrap tracking-tighter">
          PROPLEY
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-[400px] space-y-10 relative z-10"
      >
        {/* LOGO & INVITE */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <PropleyLogo size="xl" priority />
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="h-[1px] w-8 bg-gold/30" />
            <span className="text-[10px] font-semibold text-gold tracking-[0.4em] uppercase">Private Invitation</span>
            <div className="h-[1px] w-8 bg-gold/30" />
          </div>
        </div>

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Enter your name"
              className="w-full bg-transparent border-b border-zinc-200 py-3 text-ink placeholder:text-zinc-300 focus:outline-none focus:border-gold transition-colors text-base font-medium"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
              Contact Number
            </label>
            <div className="relative flex items-center">
              <span className={`shrink-0 text-base font-medium pr-2 py-3 select-none transition-colors ${phoneDigits.length > 0 ? 'text-ink' : 'text-zinc-300'}`}>
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={14}
                value={phone}
                onChange={handlePhoneChange}
                placeholder="00000 00000"
                className="w-full bg-transparent border-b border-zinc-200 py-3 text-ink placeholder:text-zinc-300 focus:outline-none focus:border-gold transition-colors text-base font-medium"
              />
              {phoneDigits.length > 0 && (
                <span className={`absolute right-0 bottom-3 text-[10px] font-medium transition-colors ${isPhoneValid ? 'text-green-600' : 'text-zinc-300'}`}>
                  {phoneDigits.length}/10
                </span>
              )}
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[10px] font-bold text-red-500 uppercase tracking-widest"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={!name.trim() || !phone.trim()}
            className="w-full group relative flex items-center justify-between bg-ink text-white px-8 py-5 rounded-lg transition-all hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] relative z-10">
              Join Meeting
            </span>
            <RiArrowRightLine size={20} className="transition-transform group-hover:translate-x-2 relative z-10" />

            {/* HOVER SHIMMER */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </button>
        </form>

        <p className="text-center text-[10px] font-medium text-zinc-400 leading-relaxed">
          By entering, you agree to our premium service terms.<br />
          Experience optimized for high-end architectural visualization.
        </p>
      </motion.div>

      {/* DECORATIVE GEOMETRY */}
      <div className="absolute bottom-12 right-12 w-24 h-24 border border-gold/10 pointer-events-none" />
      <div className="absolute top-24 left-24 w-12 h-12 border border-gold/10 pointer-events-none" />
    </div>
  );
}
