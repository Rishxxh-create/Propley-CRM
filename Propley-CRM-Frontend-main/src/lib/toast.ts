import { toast as sonnerToast } from 'sonner';
import { TOAST } from '@/lib/copy';

export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  copied: () => sonnerToast.success(TOAST.copied),
  presentationSaved: () => sonnerToast.success(TOAST.presentationSaved),
  presentationScheduled: () => sonnerToast.success(TOAST.presentationScheduled),
  presentationCanceled: () => sonnerToast.success(TOAST.presentationCanceled),
  presentationRescheduled: () => sonnerToast.success(TOAST.presentationRescheduled),
  customerAdded: () => sonnerToast.success(TOAST.customerAdded),
  customerUpdated: () => sonnerToast.success(TOAST.customerUpdated),
  dealStageUpdated: (stage: string) => sonnerToast.success(TOAST.dealStageUpdated(stage)),
  advisorAssigned: (name: string) => sonnerToast.success(TOAST.advisorAssigned(name)),
  clientNoteSaved: () => sonnerToast.success(TOAST.clientNoteSaved),
  emailResent: (name: string) => sonnerToast.success(TOAST.emailResent(name)),
  transcriptUpdated: () => sonnerToast.success(TOAST.transcriptUpdated),
  inviteResent: (name: string, channel: string) =>
    sonnerToast.success(TOAST.inviteResent(name, channel)),
  bulkCanceled: (n: number) => sonnerToast.success(TOAST.bulkCanceled(n)),
  bulkRescheduled: (n: number) => sonnerToast.success(TOAST.bulkRescheduled(n)),
  exported: () => sonnerToast.success(TOAST.exported),
};
