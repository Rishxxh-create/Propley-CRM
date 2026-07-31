'use client';

import { useState, useSyncExternalStore, useCallback } from 'react';
import { RiCloseLine, RiAddLine, RiListCheck, RiEditLine, RiDeleteBinLine, RiTimeLine } from 'react-icons/ri';
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { readClientNotes, subscribeClientNotes, addClientNote, updateClientNote, deleteClientNote, formatClientNoteDate, readClientNotesStatus } from '@/lib/client-notes';
import { toast } from '@/lib/toast';
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

interface CustomerNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
  customerName: string;
}

const EMPTY_ARRAY: any[] = [];

export default function CustomerNotesDrawer({ isOpen, onClose, customerId, customerName }: CustomerNotesDrawerProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [noteText, setNoteText] = useState('');
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
    if (!customerId) return EMPTY_ARRAY;
    return readClientNotes(customerId);
  }, [customerId]);

  const getStatus = useCallback(() => {
    if (!customerId) return 'idle';
    return readClientNotesStatus(customerId);
  }, [customerId]);

  const notes = useSyncExternalStore(subscribe, getNotes, () => EMPTY_ARRAY);
  const status = useSyncExternalStore(subscribe, getStatus, () => 'idle');

  const handleAddNote = async () => {
    if (!noteText.trim() || !customerId) return;
    setIsCreating(true);
    try {
      await addClientNote(customerId, noteText, advisorName);
      setNoteText('');
      setActiveTab('list');
      toast.clientNoteSaved();
    } catch {
      toast.error('Failed to save note');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateNote = async (noteId: number) => {
    if (!editNoteText.trim() || !customerId) return;
    setIsUpdating(true);
    try {
      await updateClientNote(customerId, noteId, editNoteText);
      setEditingNoteId(null);
      setEditNoteText('');
      toast.clientNoteSaved();
    } catch {
      toast.error('Failed to update note');
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmDeleteNote = async () => {
    if (!customerId || noteToDelete === null) return;
    setIsDeleting(true);
    try {
      await deleteClientNote(customerId, noteToDelete);
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
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
        <DrawerContent className="flex h-full w-full flex-col rounded-lg border-s border-stone-alt bg-white outline-none sm:w-[500px]">
          <DrawerClose asChild>
            <button
              type="button"
              className="absolute top-4 right-4 z-50 flex h-8 w-8 items-center justify-center text-zinc-400 transition-colors hover:text-ink"
            >
              <RiCloseLine size={24} />
            </button>
          </DrawerClose>

          <DrawerHeader className="p-8 pb-4 shrink-0">
            <DrawerTitle className="text-3xl font-semibold tracking-tight text-ink">
              Notes.
            </DrawerTitle>
            <p className="mt-2 text-xs font-medium text-zinc-500">Manage notes for {customerName}</p>
          </DrawerHeader>

          <div className="px-8 mb-4 shrink-0">
            <div className="flex bg-stone/50 p-1 border border-stone-alt w-fit">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'create' ? 'bg-white text-ink shadow-none! font-semibold border border-stone-alt/50' : 'text-zinc-500 hover:text-ink border border-transparent'
                }`}
              >
                <RiAddLine size={16} className={activeTab === 'create' ? 'text-gold' : ''} />
                Create
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === 'list' ? 'bg-white text-ink shadow-none! font-semibold border border-stone-alt/50' : 'text-zinc-500 hover:text-ink border border-transparent'
                }`}
              >
                <RiListCheck size={16} className={activeTab === 'list' ? 'text-gold' : ''} />
                Note list
              </button>
            </div>
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto px-8 pb-8">
            {activeTab === 'create' && (
              <div className="space-y-4">
                <textarea
                  className="min-h-[180px] w-full resize-none border border-black/5 shadow-none! rounded-xl bg-white p-4 text-[13px] font-medium leading-relaxed placeholder:font-normal placeholder:text-zinc-400 focus:border-gold focus:ring-1 focus:ring-gold/20 focus:outline-none transition-all"
                  placeholder="Write your note here..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <Button onClick={handleAddNote} variant="propley" className="w-full h-11 rounded-lg font-bold tracking-wide" disabled={!noteText.trim() || isCreating} loading={isCreating}>
                  Save Note
                </Button>
              </div>
            )}

            {activeTab === 'list' && (
              <div className="space-y-4">
                {status === 'loading' ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border-l-2 border-gold/30 bg-stone/30 p-4 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <div className="flex justify-between items-center mt-4 border-t border-stone-alt/50 pt-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))
                ) : notes.length === 0 ? (
                  <p className="text-sm text-zinc-500">No notes found for this client.</p>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="relative flex flex-col bg-white border border-black/5 shadow-none! rounded-xl p-3.5 group transition-all hover:border-gold">
                      {editingNoteId === note.id ? (
                        <div className="space-y-3">
                          <textarea
                            className="min-h-[100px] w-full resize-y border border-stone-alt bg-stone/10 p-3 text-[13px] font-medium rounded-lg focus:border-gold focus:outline-none"
                            value={editNoteText}
                            onChange={(e) => setEditNoteText(e.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="rounded-md" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                            <Button variant="propley" size="sm" className="rounded-md" onClick={() => handleUpdateNote(note.id)} loading={isUpdating} disabled={!editNoteText.trim() || isUpdating}>Save</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-4">
                            <p className="text-[13px] text-ink whitespace-pre-wrap flex-1 pr-12 leading-relaxed font-medium">{note.body}</p>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 absolute top-3 right-3">
                              <button
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditNoteText(note.body);
                                }}
                                className="p-1.5 text-zinc-400 bg-stone/50 rounded-md hover:text-gold hover:bg-gold/10 transition-colors"
                                title="Edit"
                              >
                                <RiEditLine size={12} />
                              </button>
                              <button
                                onClick={() => setNoteToDelete(note.id)}
                                className="p-1.5 text-zinc-400 bg-stone/50 rounded-md hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Delete"
                              >
                                <RiDeleteBinLine size={12} />
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2.5 mt-auto border-t border-stone-alt/60">
                            <div className="flex items-center gap-2">
                              <div className="h-[22px] w-[22px] rounded-full bg-gradient-to-br from-warm-dark to-warm-darker text-[9px] font-bold text-white flex items-center justify-center shadow-none!">
                                {note.author.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-[10px] font-bold tracking-wide text-zinc-600">{note.author}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 uppercase tracking-wider">
                              <RiTimeLine size={10} className="text-zinc-300" />
                              {formatClientNoteDate(note.createdAt)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

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
            <Button variant="propley" className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDeleteNote} loading={isDeleting} disabled={isDeleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
