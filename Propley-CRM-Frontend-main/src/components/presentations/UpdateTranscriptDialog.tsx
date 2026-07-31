'use client';

import { useEffect, useState } from 'react';
import { RiCloseLine, RiLoader4Line, RiMicLine } from 'react-icons/ri';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { patchMeetingTranscript } from '@/lib/api/meetings';
import { ACTIONS } from '@/lib/copy';
import { toast } from '@/lib/toast';
import { ApiError } from '@/lib/api/http-client';
import { useAppDispatch } from '@/store/hooks';
import { fetchMeetingsAllThunk } from '@/store/slices/meetingsThunks';

interface UpdateTranscriptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingUuid: string;
  property: string;
  initialTranscript?: string;
}

export function UpdateTranscriptDialog({
  isOpen,
  onClose,
  meetingUuid,
  property,
  initialTranscript = '',
}: UpdateTranscriptDialogProps) {
  const dispatch = useAppDispatch();
  const [transcript, setTranscript] = useState(initialTranscript);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTranscript(initialTranscript);
      setIsSaving(false);
      setIsLoading(false);
      return;
    }

    setTranscript(initialTranscript);
  }, [isOpen, initialTranscript]);

  const handleAdd = async () => {
    const trimmed = transcript.trim();
    if (!trimmed) {
      toast.error('Enter transcript text before saving.');
      return;
    }

    setIsSaving(true);
    try {
      await patchMeetingTranscript(meetingUuid, { transcript: trimmed });
      toast.transcriptUpdated();
      void dispatch(fetchMeetingsAllThunk({ force: true }));
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not save the meeting transcript.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg rounded-xl border-stone-alt bg-white p-0 shadow-none"
      >
        <DialogHeader className="flex flex-row items-start justify-between border-b border-stone-alt p-6">
          <div className="space-y-1">
            <DialogTitle className="text-xl font-semibold tracking-tight text-ink">
              {ACTIONS.updateTranscript}
            </DialogTitle>
            <p className="truncate text-xs font-medium text-zinc-500">{property}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex size-10 items-center justify-center text-zinc-400 transition-colors hover:bg-stone hover:text-ink disabled:opacity-50"
            aria-label="Close"
          >
            <RiCloseLine size={22} />
          </button>
        </DialogHeader>

        <div className="p-6">
          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={isLoading ? "Loading transcript..." : "Full meeting transcript text…"}
            rows={10}
            disabled={isSaving || isLoading}
            className="min-h-[220px] resize-y border border-stone-alt bg-white px-3 py-3 text-sm text-ink placeholder:text-zinc-400 focus-visible:border-gold rounded-md"
          />
        </div>

        <footer className="flex gap-3 border-t border-stone-alt bg-stone/30 p-6">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 rounded-md border-stone-alt text-xs font-semibold"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="propley"
            className="h-12 flex-1 gap-2"
            onClick={handleAdd}
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? (
              <>
                Saving…
                <RiLoader4Line size={18} className="animate-spin text-white" aria-hidden />
              </>
            ) : (
              <>
                {ACTIONS.addTranscript}
                <RiMicLine size={16} aria-hidden />
              </>
            )}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
