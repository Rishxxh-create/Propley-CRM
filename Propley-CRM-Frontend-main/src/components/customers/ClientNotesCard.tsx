'use client';

import { useState, useSyncExternalStore, useCallback } from 'react';
import {
  addClientNote,
  updateClientNote,
  deleteClientNote,
  formatClientNoteDate,
  readClientNotes,
  readClientNotesStatus,
  subscribeClientNotes,
  EMPTY_CLIENT_NOTES,
} from '@/lib/client-notes';
import { toast } from '@/lib/toast';
import { PAGE } from '@/lib/copy';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RiStickyNoteLine, RiEditLine, RiDeleteBinLine, RiTimeLine } from 'react-icons/ri';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ClientNotesCardProps {
  clientId: string;
}

export function ClientNotesCard({ clientId }: ClientNotesCardProps) {
  const [body, setBody] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const user = useAppSelector(selectAuthUser);
  const advisorName = user?.name?.trim() || 'Consultant';

  const subscribe = useCallback((onStoreChange: () => void) => {
    return subscribeClientNotes(onStoreChange);
  }, []);

  const getNotes = useCallback(() => {
    if (!clientId) return EMPTY_CLIENT_NOTES;
    return readClientNotes(clientId);
  }, [clientId]);

  const getStatus = useCallback(() => {
    if (!clientId) return 'idle';
    return readClientNotesStatus(clientId);
  }, [clientId]);

  const notes = useSyncExternalStore(subscribe, getNotes, () => EMPTY_CLIENT_NOTES);
  const status = useSyncExternalStore(subscribe, getStatus, () => 'idle');

  const canSave = body.trim().length > 0;

  const handleAdd = async () => {
    if (!canSave) return;
    setIsCreating(true);
    try {
      await addClientNote(clientId, body, advisorName);
      setBody('');
      toast.clientNoteSaved();
    } catch {
      toast.error('Failed to save note');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (noteId: number) => {
    if (!editNoteText.trim()) return;
    setIsUpdating(true);
    try {
      await updateClientNote(clientId, noteId, editNoteText);
      setEditingNoteId(null);
      setEditNoteText('');
      toast.clientNoteSaved();
    } catch {
      toast.error('Failed to update note');
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDelete = async () => {
    if (noteToDelete === null) return;
    setIsDeleting(true);
    try {
      await deleteClientNote(clientId, noteToDelete);
      toast.success('Note deleted');
    } catch {
      toast.error('Failed to delete note');
    } finally {
      setIsDeleting(false);
      setNoteToDelete(null);
    }
  };

  return (
    <>
      <section className="max-w-4xl border border-stone-alt bg-ivory">
        <header className="border-b border-stone-alt bg-stone/40 px-6 py-4 sm:px-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <RiStickyNoteLine className="text-gold" size={18} aria-hidden />
            {PAGE.customers.profile.notes}
          </h2>
        </header>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="space-y-3 border border-stone-alt bg-stone/30 p-4 sm:p-5">
            <label
              htmlFor="client-note-input"
              className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600"
            >
              New note
            </label>
            <textarea
              id="client-note-input"
              className="min-h-[100px] w-full resize-y border border-stone-alt bg-ivory px-3 py-3 text-sm font-medium leading-relaxed text-ink placeholder:font-normal placeholder:text-zinc-400 focus:border-gold focus:outline-none"
              placeholder={PAGE.customers.profile.notesPlaceholder}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex justify-end border-t border-stone-alt pt-4">
              <Button
                type="button"
                variant="propley"
                disabled={!canSave || isCreating}
                loading={isCreating}
                onClick={handleAdd}
                className={cn('min-w-[140px] !py-3 h-11')}
              >
                {PAGE.customers.profile.addNote}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-stone-alt pb-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                {PAGE.customers.profile.notesHistory(notes.length)}
              </h3>
            </div>

            {status === 'loading' ? (
              <ul className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="border border-stone-alt border-l-4 border-l-gold/30 bg-stone/30 px-4 py-3 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex justify-between items-center mt-4">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : notes.length === 0 ? (
              <p className="border border-dashed border-stone-alt bg-stone/20 px-4 py-8 text-center text-sm font-medium text-zinc-600">
                {PAGE.customers.profile.notesEmpty}
              </p>
            ) : (
              <ul className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto custom-scrollbar">
                {notes.map((n) => (
                  <li
                    key={n.id}
                    className="group relative overflow-hidden rounded-xl border border-stone-alt bg-white p-4 shadow-none! transition-all hover:border-gold/30"
                  >
                    <div className="absolute left-0 top-0 h-full w-1 bg-gold/50" />
                    {editingNoteId === n.id ? (
                      <div className="space-y-3">
                        <textarea
                          className="min-h-[100px] w-full resize-y rounded-lg border border-stone-alt bg-stone/20 px-3 py-3 text-sm font-medium leading-relaxed text-ink focus:border-gold focus:outline-none focus:bg-white"
                          value={editNoteText}
                          onChange={(e) => setEditNoteText(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                          <Button variant="propley" size="sm" onClick={() => handleUpdate(n.id)} loading={isUpdating} disabled={!editNoteText.trim() || isUpdating}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <p className="text-[14px] font-medium leading-relaxed text-ink whitespace-pre-wrap flex-1 pr-8 pl-1">{n.body}</p>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0 absolute top-3 right-3 bg-white/90 p-1 rounded-md backdrop-blur-sm border border-black/5 shadow-none!">
                            <button
                              onClick={() => {
                                setEditingNoteId(n.id);
                                setEditNoteText(n.body);
                              }}
                              className="p-1.5 text-zinc-400 hover:text-gold hover:bg-gold/10 rounded transition-colors"
                              title="Edit note"
                            >
                              <RiEditLine size={15} />
                            </button>
                            <button
                              onClick={() => setNoteToDelete(n.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Delete note"
                            >
                              <RiDeleteBinLine size={15} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-stone-alt/50 pt-3 pl-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-alt/50 text-ink">
                              {n.author.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-ink">{n.author}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-400">
                            <RiTimeLine size={13} />
                            <time dateTime={n.createdAt}>{formatClientNoteDate(n.createdAt)}</time>
                          </div>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <Dialog open={noteToDelete !== null} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setNoteToDelete(null)}>
              Cancel
            </Button>
            <Button variant="propley" className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete} loading={isDeleting} disabled={isDeleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
