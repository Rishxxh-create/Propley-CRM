'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { scheduleMeeting, lookupCustomer, CustomerMatch, ScheduledMeeting } from '@/lib/api/scheduling';

export interface MeetingDraft {
  project: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerCity: string;
  date: Date | undefined;
  time: string;
}

export function emptyDraft(): MeetingDraft {
  return {
    project: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerCity: '',
    date: undefined,
    time: '',
  };
}

export type DraftStatus =
  | { ready: false; missing: Array<keyof MeetingDraft | 'start_time'> }
  | { ready: true; missing: [] };

export function getDraftStatus(draft: MeetingDraft): DraftStatus {
  const missing: Array<keyof MeetingDraft | 'start_time'> = [];
  if (!draft.customerName.trim()) missing.push('customerName');
  if (!draft.customerEmail.trim()) missing.push('customerEmail');
  if (!draft.date || !draft.time) missing.push('start_time');
  return missing.length === 0
    ? { ready: true, missing: [] }
    : { ready: false, missing };
}

function combineDateAndTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  const out = new Date(date);
  out.setHours(h || 0, m || 0, 0, 0);
  return out;
}

interface MeetingDraftContextValue {
  draft: MeetingDraft;
  setField: <K extends keyof MeetingDraft>(field: K, value: MeetingDraft[K]) => void;
  patch: (partial: Partial<MeetingDraft>) => void;
  reset: () => void;
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  matchedCustomer: CustomerMatch | null;
  isLookingUp: boolean;
  submit: () => Promise<ScheduledMeeting>;
  isSubmitting: boolean;
  submitError: string | null;
  lastScheduled: ScheduledMeeting | null;
  status: DraftStatus;
}

const MeetingDraftContext = createContext<MeetingDraftContextValue | null>(null);

const DEBOUNCE_MS = 350;

export function MeetingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<MeetingDraft>(emptyDraft);
  const [isOpen, setIsOpen] = useState(false);
  const [matchedCustomer, setMatchedCustomer] = useState<CustomerMatch | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastScheduled, setLastScheduled] = useState<ScheduledMeeting | null>(null);

  const setField = useCallback(<K extends keyof MeetingDraft>(field: K, value: MeetingDraft[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const patch = useCallback((partial: Partial<MeetingDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setDraft(emptyDraft());
    setMatchedCustomer(null);
    setSubmitError(null);
  }, []);

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);

  // Debounced customer lookup whenever email or phone changes.
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lookupSeqRef = useRef(0);
  useEffect(() => {
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    const email = draft.customerEmail.trim();
    const phone = draft.customerPhone.trim();
    if (!email && !phone) {
      setMatchedCustomer(null);
      setIsLookingUp(false);
      return;
    }
    setIsLookingUp(true);
    const mySeq = ++lookupSeqRef.current;
    lookupTimerRef.current = setTimeout(async () => {
      try {
        const match = await lookupCustomer({ email: email || undefined, phone: phone || undefined });
        if (mySeq !== lookupSeqRef.current) return;
        setMatchedCustomer(match);
      } catch {
        if (mySeq !== lookupSeqRef.current) return;
        setMatchedCustomer(null);
      } finally {
        if (mySeq === lookupSeqRef.current) setIsLookingUp(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    };
  }, [draft.customerEmail, draft.customerPhone]);

  // When a fresh match arrives, auto-fill empty fields from it.
  useEffect(() => {
    if (!matchedCustomer) return;
    setDraft((prev) => ({
      ...prev,
      customerName: prev.customerName.trim() ? prev.customerName : matchedCustomer.client_name,
      customerPhone:
        prev.customerPhone.trim() || !matchedCustomer.client_phone
          ? prev.customerPhone
          : matchedCustomer.client_phone,
      customerEmail: prev.customerEmail.trim() ? prev.customerEmail : matchedCustomer.client_email,
      customerCity:
        prev.customerCity.trim() || !matchedCustomer.client_city
          ? prev.customerCity
          : matchedCustomer.client_city,
    }));
  }, [matchedCustomer]);

  const status = useMemo(() => getDraftStatus(draft), [draft]);

  const submit = useCallback(async () => {
    if (!status.ready) {
      throw new Error(`Missing fields: ${status.missing.join(', ')}`);
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const startTime = combineDateAndTime(draft.date as Date, draft.time).toISOString();
      const meeting = await scheduleMeeting({
        client_name: draft.customerName.trim(),
        client_email: draft.customerEmail.trim(),
        client_phone: draft.customerPhone.trim() || null,
        client_city: draft.customerCity.trim() || null,
        project_id: null,
        start_time: startTime,
      });
      setLastScheduled(meeting);
      setIsOpen(false);
      setDraft(emptyDraft());
      setMatchedCustomer(null);
      return meeting;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to schedule meeting';
      setSubmitError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [draft, status]);

  const value: MeetingDraftContextValue = {
    draft,
    setField,
    patch,
    reset,
    isOpen,
    openDrawer,
    closeDrawer,
    matchedCustomer,
    isLookingUp,
    submit,
    isSubmitting,
    submitError,
    lastScheduled,
    status,
  };

  return <MeetingDraftContext.Provider value={value}>{children}</MeetingDraftContext.Provider>;
}

export function useMeetingDraft(): MeetingDraftContextValue {
  const ctx = useContext(MeetingDraftContext);
  if (!ctx) throw new Error('useMeetingDraft must be used inside <MeetingDraftProvider>');
  return ctx;
}
