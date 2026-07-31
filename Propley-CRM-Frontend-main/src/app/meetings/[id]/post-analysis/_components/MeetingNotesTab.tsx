'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiStickyNoteLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
} from 'react-icons/ri';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { RootState } from '@/store';
import {
  fetchMeetingNotesThunk,
  createMeetingNoteThunk,
  updateMeetingNoteThunk,
  deleteMeetingNoteThunk,
} from '@/store/slices/meetingsThunks';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MeetingNotesTabProps {
  meetingUuid: string;
  cardPadding: string;
  flat?: boolean;
}

export function MeetingNotesTab({ meetingUuid, cardPadding, flat = false }: MeetingNotesTabProps) {
  const dispatch = useAppDispatch();
  const notes = useAppSelector((state: RootState) => state.meetings.notes || []);
  const status = useAppSelector((state: RootState) => state.meetings.notesStatus);

  const [isCreating, setIsCreating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteIdToDelete, setNoteIdToDelete] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    dispatch(fetchMeetingNotesThunk(meetingUuid));
  }, [dispatch, meetingUuid]);

  const handleCreate = async () => {
    if (!draft.trim() || isMutating) return;
    setIsMutating(true);
    try {
      const result = await dispatch(createMeetingNoteThunk({ meetingUuid, payload: { note: draft } }));
      if (createMeetingNoteThunk.fulfilled.match(result)) {
        setDraft('');
        setIsCreating(false);
      } else if (createMeetingNoteThunk.rejected.match(result)) {
        toast.error(String(result.payload) || 'Failed to create note');
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdate = async (noteId: string) => {
    if (!draft.trim() || isMutating) return;
    setIsMutating(true);
    try {
      const result = await dispatch(updateMeetingNoteThunk({ meetingUuid, noteId, payload: { note: draft } }));
      if (updateMeetingNoteThunk.fulfilled.match(result)) {
        setDraft('');
        setEditingNoteId(null);
      } else if (updateMeetingNoteThunk.rejected.match(result)) {
        toast.error(String(result.payload) || 'Failed to update note');
      }
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = (noteId: string) => {
    setNoteIdToDelete(noteId);
  };

  const confirmDelete = async () => {
    if (!noteIdToDelete || isMutating) return;
    setIsMutating(true);
    try {
      const result = await dispatch(deleteMeetingNoteThunk({ meetingUuid, noteId: noteIdToDelete }));
      if (deleteMeetingNoteThunk.fulfilled.match(result)) {
        setNoteIdToDelete(null);
      } else if (deleteMeetingNoteThunk.rejected.match(result)) {
        toast.error(String(result.payload) || 'Failed to delete note');
      }
    } finally {
      setIsMutating(false);
    }
  };

  const startEdit = (noteId: string, content: string) => {
    setDraft(content);
    setEditingNoteId(noteId);
    setIsCreating(false);
  };

  const cancelEdit = () => {
    setDraft('');
    setEditingNoteId(null);
    setIsCreating(false);
  };

  const isLoading = status === 'loading';

  const content = (
    <div className="space-y-6">
      {flat ? (
        !isCreating && !editingNoteId ? (
          <div className="flex items-center justify-between pb-2 border-b border-stone-alt">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Active Notes ({notes.length})
            </span>
            <Button
              variant="outline"
              onClick={() => {
                setDraft('');
                setIsCreating(true);
                setEditingNoteId(null);
              }}
              className="h-9 rounded-md border-stone-alt px-4 text-xs font-semibold bg-white hover:bg-stone text-ink"
            >
              <RiAddLine size={16} className="-ml-1 mr-1" />
              Create Note
            </Button>
          </div>
        ) : null
      ) : (
        <div className="flex flex-col gap-4 border-b border-stone-alt pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <RiStickyNoteLine className="text-gold" size={18} />
            <h2 className="text-sm font-semibold text-ink">Session Notes</h2>
          </div>
          {!isCreating && !editingNoteId && (
            <Button
              variant="outline"
              onClick={() => {
                setDraft('');
                setIsCreating(true);
                setEditingNoteId(null);
              }}
              className="h-9 rounded-md border-stone-alt px-4 text-xs font-semibold"
            >
              <RiAddLine size={16} className="-ml-1 mr-1" />
              Create Note
            </Button>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {(isCreating || editingNoteId) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "space-y-4 overflow-hidden",
              flat ? "border-b border-stone-alt pb-6" : "rounded-lg border border-stone-alt bg-stone/20 p-6"
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              {isCreating ? 'New Note' : 'Edit Note'}
            </p>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write your note here..."
              className="min-h-[120px] resize-y border border-stone-alt bg-white px-4 py-3 text-xs text-ink placeholder:font-normal placeholder:text-zinc-400 focus-visible:border-gold rounded-md"
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <Button
                variant="ghost"
                onClick={cancelEdit}
                disabled={isMutating}
                className="h-9 px-4 text-xs"
              >
                <RiCloseLine className="mr-1" size={14} /> Cancel
              </Button>
              <Button
                variant="propley"
                onClick={() => (isCreating ? handleCreate() : handleUpdate(editingNoteId!))}
                disabled={isMutating || !draft.trim() || draft === '<p><br></p>'}
                aria-busy={isMutating}
                className="h-9 gap-2 rounded-md px-4"
              >
                {isMutating ? (
                  <>
                    Saving…
                    <RiLoader4Line size={14} className="animate-spin text-white" aria-hidden />
                  </>
                ) : (
                  <>
                    <RiCheckLine className="mr-1" size={14} aria-hidden /> Save
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && notes.length === 0 ? (
        <div className="space-y-4 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn("flex flex-col gap-3", flat ? "border-b border-stone-alt pb-5" : "border border-stone-alt bg-white p-5 rounded-lg")}>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-16 bg-stone-alt animate-pulse rounded-full" />
                <div className="h-1 w-1 bg-stone-alt rounded-full" />
                <div className="h-2.5 w-12 bg-stone-alt animate-pulse rounded-full" />
              </div>
              <div className="space-y-2 mt-1">
                <div className="h-2.5 w-full bg-stone-alt/60 animate-pulse rounded-full" />
                <div className="h-2.5 w-[85%] bg-stone-alt/60 animate-pulse rounded-full" />
                <div className="h-2.5 w-[40%] bg-stone-alt/60 animate-pulse rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4, ease: 'easeOut' }}
              key={note.id}
              className={cn(
                flat
                  ? "group relative border-b border-stone-alt pb-5 transition-all duration-300"
                  : "group relative rounded-lg border border-stone-alt bg-white p-6 transition-all duration-300 hover:border-gold/40 hover:bg-stone/20",
                editingNoteId === note.id && "hidden"
              )}
            >
              <div className={cn(
                "absolute top-0 h-full w-[3px] transition-colors",
                flat ? "-left-4 w-[2px] bg-transparent group-hover:bg-gold" : "left-0 bg-transparent group-hover:bg-gold"
              )} />
              
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-2 text-zinc-500">
                    <RiStickyNoteLine size={14} className="text-gold" />
                    <span className="text-xs font-medium">
                      {format(new Date(note.createdAt), 'MMM d, yyyy')}
                    </span>
                    <span className="h-[3px] w-[3px] rounded-full bg-zinc-300" />
                    <span className="text-xs font-medium">
                      {format(new Date(note.createdAt), 'h:mm a')}
                    </span>
                  </div>
                  
                  <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-ink/90">
                    {note.note}
                  </p>
                </div>
                
                <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <button
                    onClick={() => startEdit(note.id, note.note)}
                    className="flex h-8 w-8 items-center justify-center text-zinc-400 transition-colors hover:bg-stone hover:text-ink"
                    title="Edit Note"
                  >
                    <RiEditLine size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="flex h-8 w-8 items-center justify-center text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Delete Note"
                  >
                    <RiDeleteBinLine size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        !isCreating && (
          <div className={cn(
            "py-12 text-center",
            flat ? "border-none bg-transparent" : "border border-stone-alt border-dashed bg-stone/20"
          )}>
            <RiStickyNoteLine className="mx-auto text-zinc-300 mb-2" size={24} />
            <p className="text-xs text-zinc-400 font-medium">No notes available for this session.</p>
            <Button
              variant="outline"
              onClick={() => {
                setDraft('');
                setIsCreating(true);
                setEditingNoteId(null);
              }}
              className="mt-4 h-8 px-4 text-xs rounded-md border-stone-alt bg-white hover:bg-stone text-ink"
            >
              Create the first note
            </Button>
          </div>
        )
      )}

      <Dialog
        open={!!noteIdToDelete}
        onOpenChange={(open) => {
          if (!open && !isMutating) setNoteIdToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoteIdToDelete(null)}
              disabled={isMutating}
              className="rounded-md"
            >
              Cancel
            </Button>
            <Button
              variant="propley"
              className="gap-2 rounded-md bg-red-600 text-white hover:bg-red-700"
              onClick={confirmDelete}
              disabled={isMutating}
              aria-busy={isMutating}
            >
              {isMutating ? (
                <>
                  Deleting…
                  <RiLoader4Line size={14} className="animate-spin text-white" aria-hidden />
                </>
              ) : (
                'Delete Note'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (flat) {
    return content;
  }

  return (
    <Card className="rounded-xl pt-0! border-stone-alt bg-white shadow-none!">
      <CardContent className={cn('space-y-6', cardPadding)}>
        {content}
      </CardContent>
    </Card>
  );
}
