'use client';

import { useState, useSyncExternalStore } from 'react';
import { RiDeleteBinLine, RiStickyNoteLine } from 'react-icons/ri';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  addAdvisorNote,
  deleteAdvisorNote,
  formatAdvisorNoteDate,
  EMPTY_ADVISOR_NOTES,
  readAdvisorNotes,
  subscribeAdvisorNotes,
} from '@/lib/post-meeting-notes';
import { cn } from '@/lib/utils';

interface AdvisorNotesCardProps {
  meetingId: string;
  author: string;
  cardPadding: string;
}

export function AdvisorNotesCard({
  meetingId,
  author,
  cardPadding,
}: AdvisorNotesCardProps) {
  const [draft, setDraft] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  const notes = useSyncExternalStore(
    subscribeAdvisorNotes,
    () => readAdvisorNotes(meetingId),
    () => EMPTY_ADVISOR_NOTES
  );

  const handleSave = () => {
    if (!draft.trim()) return;
    addAdvisorNote(meetingId, draft, author);
    setDraft('');
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleDelete = (noteId: string) => {
    deleteAdvisorNote(meetingId, noteId);
  };

  return (
    <Card className="rounded-lg border-stone-alt bg-white shadow-none!">
      <CardContent className={cn('space-y-5', cardPadding)}>
        <div className="flex flex-col gap-2 border-b border-stone-alt pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <RiStickyNoteLine className="text-gold" size={18} />
            <h2 className="text-sm font-semibold text-ink">Advisor follow-up notes</h2>
          </div>
          {savedFlash && (
            <span className="text-[10px] font-semibold tracking-[0.1em] text-gold uppercase label-premium">
              Note saved
            </span>
          )}
        </div>

        <p className="text-xs font-medium leading-relaxed text-zinc-500">
          Capture post-session observations, client objections, and next steps. Notes are stored
          for this presentation only.
        </p>

        <div className="space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. Client requested revised payment schedule; send terrace renders by Friday…"
            rows={4}
            className="min-h-[120px] resize-y border border-stone-alt bg-stone/20 px-4 py-3 text-xs text-ink placeholder:font-normal placeholder:text-zinc-400 focus-visible:border-gold"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] font-medium text-zinc-400">
              Signed as <span className="font-semibold text-ink">{author}</span>
            </p>
            <Button
              type="button"
              variant="propley"
              disabled={!draft.trim()}
              onClick={handleSave}
              className="h-11 w-full rounded-lg sm:w-auto"
            >
              Save note
            </Button>
          </div>
        </div>

        {notes.length > 0 ? (
          <ul className="space-y-3 border-t border-stone-alt pt-5">
            {notes.map((note) => (
              <li
                key={note.id}
                className="border border-stone-alt bg-stone/20 p-4 rounded-lg"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-ink">{note.author}</p>
                    <p className="text-[10px] font-medium text-zinc-400">
                      {formatAdvisorNoteDate(note.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    className="shrink-0 p-1.5 text-zinc-400 transition-colors hover:border-gold hover:text-ink"
                    aria-label="Delete note"
                  >
                    <RiDeleteBinLine size={16} />
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-600">
                  {note.body}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-stone-alt pt-4 text-xs font-medium text-zinc-400">
            No advisor notes yet for this session.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
