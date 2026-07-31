'use client';

import { RiCloseLine, RiMailSendLine } from 'react-icons/ri';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DEFAULT_EMAIL_TEMPLATE,
  buildEmailHtml,
  type PresentationContext,
} from '@/lib/presentation-templates';

interface ResendEmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  context: PresentationContext;
  onConfirm: () => void;
}

export default function ResendEmailDialog({
  isOpen,
  onClose,
  clientName,
  context,
  onConfirm,
}: ResendEmailDialogProps) {
  const { html } = buildEmailHtml(DEFAULT_EMAIL_TEMPLATE, context);

  const handleSend = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg rounded-lg border-stone-alt bg-ivory p-0 shadow-2xl"
      >
        <DialogHeader className="flex flex-row items-start justify-between border-b border-stone-alt p-6">
          <div className="space-y-1">
            <DialogTitle className="text-xl font-semibold tracking-tight text-ink">
              Resend email invitation
            </DialogTitle>
            <p className="text-xs font-medium text-zinc-500">
              Dispatch the branded invitation again to {clientName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center text-zinc-400 transition-colors hover:bg-stone hover:text-ink"
            aria-label="Close"
          >
            <RiCloseLine size={22} />
          </button>
        </DialogHeader>

        <div className="space-y-4 p-6">
          <p className="text-xs font-medium text-zinc-500">
            Preview — calendar link and session variables are merged automatically.
          </p>
          <div className="border border-stone-alt border-t-2 border-t-gold bg-white p-5 shadow-sm">
            <div
              className="text-xs leading-relaxed text-zinc-600 [&_p]:mb-3 [&_p:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>

        <footer className="flex gap-3 border-t border-stone-alt bg-stone/30 p-6">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 rounded-lg border-stone-alt text-xs font-semibold"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="propley"
            className="h-12 flex-1 gap-2"
            onClick={handleSend}
          >
            <RiMailSendLine size={16} />
            Resend email
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
