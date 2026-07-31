'use client';

import { useState, useEffect, useRef } from 'react';
import {
  RiCloseLine,
  RiMapPinLine,
  RiPhoneLine,
  RiMailSendLine,
  RiCalendarCheckLine,
  RiWhatsappLine,
  RiSparklingLine,
  RiDeleteBinLine,
  RiStickyNoteLine,
  RiShakeHandsLine,
  RiCalendarEventLine,
  RiArrowRightUpLine,
} from 'react-icons/ri';
import { formatDistanceToNow } from 'date-fns';
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Customer } from '@/lib/mock-data';
import { fetchClientById } from '@/lib/api/clients';
import type { ApiClientActivity } from '@/lib/api/types/clients';
import { ClientNotesCard } from '@/components/customers/ClientNotesCard';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { brandLogoForLeadSource } from '@/lib/brand-logos';
import { getLeadSourceLabel } from '@/lib/lead-source-options';
import { useSyncExternalStore, useCallback } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';
import {
  readClientNotes,
  readClientNotesStatus,
  subscribeClientNotes,
  addClientNote,
  updateClientNote,
  deleteClientNote,
  formatClientNoteDate,
} from '@/lib/client-notes';

interface CustomerInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

function eventIcon(type: string): React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }> {
  const t = type.toLowerCase();
  if (t.includes('delete') || t.includes('trash')) return RiDeleteBinLine;
  if (t.includes('note')) return RiStickyNoteLine;
  return RiShakeHandsLine;
}

function nodeClass(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('delete') || t.includes('trash')) {
    return 'border-stone-alt bg-stone/60 text-zinc-500';
  }
  if (t.includes('note')) {
    return 'border-gold/40 bg-gold/10 text-gold';
  }
  return 'border-stone-alt bg-stone/60 text-zinc-600';
}

function formatText(text?: string): string {
  if (!text) return '';
  return text
    .replace(/vsv_scheduled/gi, 'Virtual Site Visit Scheduled')
    .replace(/vsv_done/gi, 'Virtual Site Visit Done')
    .replace(/\bVSV\b/gi, 'Virtual Site Visit');
}

function formatDealValue(val?: number): string {
  if (!val) return '—';
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(1)} Cr`;
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(0)} L`;
  }
  return `₹${val.toLocaleString('en-IN')}`;
}

export default function CustomerInfoDrawer({ isOpen, onClose, customer }: CustomerInfoDrawerProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes'>('timeline');
  const [activities, setActivities] = useState<ApiClientActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Notes Management state & hooks
  const user = useAppSelector(selectAuthUser);
  const advisorName = user?.name?.trim() || 'Consultant';

  const [noteBody, setNoteBody] = useState('');
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [isUpdatingNote, setIsUpdatingNote] = useState(false);

  // Sync notes from store
  const notes = useSyncExternalStore(
    useCallback((onStoreChange: () => void) => subscribeClientNotes(onStoreChange), []),
    useCallback(() => customer ? readClientNotes(customer.id) : [], [customer?.id]),
    () => []
  );

  const handleAddNote = async () => {
    if (!noteBody.trim() || !customer) return;
    setIsCreatingNote(true);
    try {
      await addClientNote(customer.id, noteBody, advisorName);
      setNoteBody('');
      toast.success('Note added');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleUpdateNote = async (noteId: number) => {
    if (!editNoteText.trim() || !customer) return;
    setIsUpdatingNote(true);
    try {
      await updateClientNote(customer.id, noteId, editNoteText);
      setEditingNoteId(null);
      setEditNoteText('');
      toast.success('Note updated');
    } catch {
      toast.error('Failed to update note');
    } finally {
      setIsUpdatingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!customer) return;
    try {
      await deleteClientNote(customer.id, noteId);
      toast.success('Note deleted');
    } catch {
      toast.error('Failed to delete note');
    }
  };

  // Virtual Infinite Scroll for Timeline
  const [visibleCount, setVisibleCount] = useState(6);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (customer && isOpen) {
      let timerDone = false;
      let apiDone = false;
      let fetchedActivities: ApiClientActivity[] = [];

      queueMicrotask(() => {
        setInitialLoading(true);
        setActivities([]);
        setVisibleCount(6);
        setLoadingActivities(true);
      });

      const timer = setTimeout(() => {
        timerDone = true;
        if (apiDone) {
          queueMicrotask(() => {
            setActivities(fetchedActivities);
            setInitialLoading(false);
          });
        }
      }, 700);

      fetchClientById(customer.id)
        .then((data) => {
          if (data && data.activities) {
            fetchedActivities = data.activities;
          }
        })
        .catch((e) => console.error('Error fetching activities:', e))
        .finally(() => {
          apiDone = true;
          queueMicrotask(() => {
            setLoadingActivities(false);
            if (timerDone) {
              setActivities(fetchedActivities);
              setInitialLoading(false);
            }
          });
        });

      return () => {
        clearTimeout(timer);
      };
    }
  }, [customer?.id, isOpen]);

  const handleScroll = () => {
    if (!scrollContainerRef.current || isLoadingMore || activeTab !== 'timeline') return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;

    // Check if scrolled near the bottom
    if (scrollHeight - scrollTop - clientHeight < 30) {
      if (visibleCount < activities.length) {
        setIsLoadingMore(true);
        setTimeout(() => {
          setVisibleCount((prev) => Math.min(prev + 5, activities.length));
          setIsLoadingMore(false);
        }, 500); // Small delay to show loading animation
      }
    }
  };

  if (!customer) return null;

  const initials = customer.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const displayActivities = activities;
  const paginatedActivities = displayActivities.slice(0, visibleCount);

  const handleDoItNow = () => {
    toast.success('AI Suggestion initiated: Floor-plan deck sent to client!');
  };

  const formattedActivitiesList = paginatedActivities.map(act => {
    const timeString = act.created_at ? formatDistanceToNow(new Date(act.created_at), { addSuffix: true }) : '';
    const dateTitle = act.type === 'note_added' || act.type === 'note_deleted' ? 'NOTE DELETED' : (act.title || 'PIPELINE STAGE UPDATED');
    return {
      ...act,
      timeString,
      dateTitle: dateTitle.toUpperCase()
    };
  });


  // 1. SKELETON DETAILED LOADING VIEW
  if (initialLoading) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
        <DrawerContent className="flex h-full w-full flex-col rounded-lg border-s border-stone-alt bg-white outline-none sm:w-[500px] shadow-none! p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-alt">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-xl bg-zinc-200 animate-pulse" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 bg-zinc-200 animate-pulse" />
                <Skeleton className="h-3 w-20 bg-zinc-100 animate-pulse" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-full bg-zinc-200 animate-pulse" />
          </div>
          <Skeleton className="h-24 w-full bg-zinc-100 rounded-xl animate-pulse" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 bg-zinc-100 rounded-lg animate-pulse" />)}
          </div>
          <Skeleton className="h-28 w-full bg-zinc-100 rounded-xl animate-pulse" />
          <div className="space-y-4 pt-4">
            <Skeleton className="h-4 w-32 bg-zinc-200 animate-pulse" />
            <div className="space-y-5 pl-4 border-l border-zinc-200">
              {[1, 2, 3].map(i => (
                <div key={i} className="relative space-y-1">
                  <div className="absolute -left-[23px] top-1.5 h-2 w-2 rounded-full bg-zinc-300 animate-pulse" />
                  <Skeleton className="h-3 w-1/3 bg-zinc-200 animate-pulse" />
                  <Skeleton className="h-4 w-3/4 bg-zinc-100 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent className="flex h-full w-full flex-col rounded-lg border-s border-stone-alt bg-white outline-none sm:w-[500px] shadow-none!">

        {/* HEADER BAR */}
        <div className="p-6 pb-4 border-b border-stone-alt shrink-0 relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 2. GRADIENT PROFILE ICON */}
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-warm-dark to-warm-darker flex items-center justify-center font-bold text-white text-md border-none shadow-none!">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink flex items-center gap-1.5">
                {customer.name}
                <Link
                  href={`/customers/${customer.id}`}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-stone-alt bg-stone hover:bg-stone-alt/50 text-zinc-500 hover:text-ink transition-colors flex items-center gap-1 ml-2 font-semibold shadow-none!"
                >
                  View Profile <RiArrowRightUpLine size={10} />
                </Link>
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-500">
                <span className="bg-stone border border-stone-alt/60 rounded px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 capitalize">
                  {customer.dealStage || 'Inquiry'}
                </span>
                {customer.city && customer.city !== '—' && (
                  <span className="flex items-center gap-0.5">
                    <RiMapPinLine size={10} />
                    {customer.city}
                  </span>
                )}
                {customer.phone && (
                  <span className="flex items-center gap-0.5 font-medium">
                    <RiPhoneLine size={10} />
                    {customer.phone.startsWith('+') ? customer.phone : `+${customer.phone}`}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* 1. HIDE DEAL VALUE IF NOT AVAILABLE */}
            {customer.dealValue ? (
              <div className="text-right">
                <span className="text-xs font-semibold text-zinc-400 block uppercase tracking-wider label-premium">Deal Value</span>
                <span className="text-lg font-bold text-ink">{formatDealValue(customer.dealValue)}</span>
              </div>
            ) : null}
            <DrawerClose asChild>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-alt text-zinc-400 transition-colors hover:text-ink hover:bg-stone/30 cursor-pointer shadow-none!"
              >
                <RiCloseLine size={20} />
              </button>
            </DrawerClose>
          </div>
        </div>

        {/* SCROLLABLE VIEWPORT FOR INFINITE LOAD */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="custom-scrollbar flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* LEAD ACQUISITION CARD */}
          {(() => {
            const leadSourceLabel = getLeadSourceLabel(customer.leadSource) || 'Direct / other';
            const brand = customer.leadSource ? brandLogoForLeadSource(customer.leadSource) : undefined;
            return (
              <div className="bg-stone/30 border border-stone-alt rounded-xl p-4 flex gap-3 shadow-none!">
                <div className="h-9 w-9 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-bold shrink-0 border border-gold/20">
                  {brand ? (
                    <BrandLogo brand={brand} size={18} alt={leadSourceLabel} />
                  ) : (
                    leadSourceLabel.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink">Source · {leadSourceLabel}</span>
                    <span className="bg-stone-alt text-[9px] font-semibold text-zinc-500 px-1.5 py-0.2 rounded border border-stone-alt/50 capitalize">
                      {customer.leadSource || 'direct'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug">
                    Client acquired via {leadSourceLabel.toLowerCase()} channel.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* QUICK ACTION BUTTONS */}
          <div className="grid grid-cols-4 gap-2">
            <a
              href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-white font-semibold text-[11px] transition-colors shadow-none! hover:opacity-90"
              style={{ backgroundColor: '#075E54' }}
            >
              <RiWhatsappLine size={14} />
              WhatsApp
            </a>
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-stone-alt bg-white text-ink font-semibold text-[11px] transition-colors hover:bg-stone/20 shadow-none!"
            >
              <RiPhoneLine size={14} className="text-zinc-500" />
              Call
            </a>
            <a
              href={`mailto:${customer.email}`}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-stone-alt bg-white text-ink font-semibold text-[11px] transition-colors hover:bg-stone/20 shadow-none!"
            >
              <RiMailSendLine size={14} className="text-zinc-500" />
              Compose
            </a>
            <Link
              href={`/meetings/new?client=${customer.id}`}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-stone-alt bg-white text-ink font-semibold text-[11px] transition-colors hover:bg-stone/20 shadow-none!"
            >
              <RiCalendarCheckLine size={14} className="text-zinc-500" />
              Schedule
            </Link>
          </div>


          {/* 3. TABS: TIMELINE & NOTES */}
          <div className="flex gap-6 border-b border-stone-alt mt-2">
            <button
              onClick={() => setActiveTab('timeline')}
              className={cn(
                "flex items-center gap-2 pb-3 text-[11px] font-semibold tracking-wider uppercase transition-all border-b-2 cursor-pointer shadow-none!",
                activeTab === 'timeline'
                  ? "border-gold text-ink"
                  : "border-transparent text-zinc-400 hover:text-ink hover:border-zinc-300"
              )}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={cn(
                "flex items-center gap-2 pb-3 text-[11px] font-semibold tracking-wider uppercase transition-all border-b-2 cursor-pointer shadow-none!",
                activeTab === 'notes'
                  ? "border-gold text-ink"
                  : "border-transparent text-zinc-400 hover:text-ink hover:border-zinc-300"
              )}
            >
              Notes & files
            </button>
          </div>

          {/* TAB CONTENT */}
          <div className="pt-2">
            {activeTab === 'timeline' && (
              <div className="relative pl-0 space-y-6">
                {/* 4. REDESIGNED TIMELINE WITH ICON BLOCKS */}
                {formattedActivitiesList.map((act, idx) => {
                  const Icon = eventIcon(act.type);
                  const isLast = idx === formattedActivitiesList.length - 1;
                  const isDeleted = act.type.toLowerCase().includes('delete');
                  return (
                    <div
                      key={act.id}
                      className="relative pl-[52px] pb-6 last:pb-0"
                    >
                      {!isLast && (
                        <div className="absolute top-[38px] left-[19px] w-[2px] h-[calc(100%-24px)] bg-black/5" />
                      )}
                      <div
                        className={cn(
                          'absolute top-0 left-0 w-10 h-10 rounded-lg flex items-center justify-center z-10 border shadow-none!',
                          nodeClass(act.type)
                        )}
                      >
                        <Icon size={18} aria-hidden />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 pt-0.5 ml-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={cn("text-[13px] font-semibold leading-tight text-ink", isDeleted && "text-zinc-400 line-through")}>
                              {formatText(act.description)}
                            </h3>
                            {isDeleted && (
                              <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide bg-stone/30 text-zinc-500 border border-stone-alt">
                                Deleted Note
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-zinc-500 font-medium">
                            {formatText(act.title)}
                          </p>
                        </div>
                        <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5 mt-1 sm:mt-0">
                          <div className="text-[11px] text-zinc-400 font-medium shrink-0">
                            {act.timeString}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 5. TIMELINE SKELETON LOADER FOR LOADING MORE */}
                {isLoadingMore && (
                  <div className="space-y-6 pt-4">
                    {[1, 2].map(i => (
                      <div key={i} className="relative pl-[52px] min-h-[50px]">
                        <div className="absolute top-[38px] left-[19px] w-[2px] h-[calc(100%-24px)] bg-black/5" />
                        <Skeleton className="absolute top-0 left-0 w-10 h-10 rounded-lg bg-zinc-200 animate-pulse" />
                        <div className="space-y-2 pt-1 ml-2">
                          <Skeleton className="h-3.5 w-1/3 bg-zinc-200 animate-pulse" />
                          <Skeleton className="h-4 w-3/4 bg-zinc-100 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-6">
                {/* Minimalist modern text-area block */}
                <div className="space-y-3 bg-stone/20 p-4 border border-stone-alt rounded-xl shadow-none!">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    New Note
                  </label>
                  <textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    placeholder="Add a note about preferences, budget, or follow-up..."
                    className="min-h-[90px] w-full resize-none border-0 bg-transparent text-xs font-medium leading-relaxed text-ink placeholder:font-normal placeholder:text-zinc-400 focus:outline-none focus:ring-0 px-0"
                  />
                  <div className="flex justify-end border-t border-stone-alt pt-3">
                    <Button
                      type="button"
                      variant="propley"
                      disabled={!noteBody.trim() || isCreatingNote}
                      loading={isCreatingNote}
                      onClick={handleAddNote}
                      className="h-8 px-4 text-[11px] rounded-lg"
                    >
                      Save Note
                    </Button>
                  </div>
                </div>

                {/* Minimalist notes list */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-stone-alt pb-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                      Saved Notes ({notes.length})
                    </h3>
                  </div>

                  {notes.length === 0 ? (
                    <p className="text-xs text-zinc-400 font-semibold py-2">No notes recorded yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {notes.map(note => (
                        <div key={note.id} className="relative group pl-4 border-l-2 border-gold py-1">
                          {editingNoteId === note.id ? (
                            <div className="space-y-3">
                              <textarea
                                className="min-h-[80px] w-full resize-none border border-stone-alt bg-stone/10 p-2 text-xs font-medium rounded-lg focus:border-gold focus:outline-none"
                                value={editNoteText}
                                onChange={(e) => setEditNoteText(e.target.value)}
                              />
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                                <Button variant="propley" size="sm" className="h-7 text-[10px]" onClick={() => handleUpdateNote(note.id)} loading={isUpdatingNote} disabled={!editNoteText.trim() || isUpdatingNote}>Save</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex justify-between items-start">
                                <p className="text-xs font-medium leading-relaxed text-ink whitespace-pre-wrap flex-1 pr-14">{note.body}</p>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 absolute top-0 right-0">
                                  <button
                                    onClick={() => {
                                      setEditingNoteId(note.id);
                                      setEditNoteText(note.body);
                                    }}
                                    className="text-[10px] font-bold text-zinc-400 hover:text-gold transition-colors cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="text-[10px] font-bold text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                                <span className="font-semibold text-zinc-500">{note.author}</span>
                                <span>{formatClientNoteDate(note.createdAt)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </DrawerContent>
    </Drawer>
  );
}
