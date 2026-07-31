'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectSelectedProject } from '@/store/selectors/projectsSelectors';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import type { StoredMeeting } from '@/lib/mock-data';
import { readPresentations, subscribePresentations } from '@/lib/presentations-store';
import { seedPresentationsIfEmpty } from '@/lib/presentations-migrate';
import {
  resolvePresentationContext,
  parseDateString,
  type EmailTemplateFields,
} from '@/lib/presentation-templates';
import {
  getTemplateForProject,
  readInviteTemplates,
  subscribeInviteTemplates,
} from '@/lib/invite-templates-store';
import { PAGE } from '@/lib/copy';
import {
  RiMailLine,
  RiWhatsappLine,
  RiArrowLeftLine,
} from 'react-icons/ri';
import { EmailTemplateEditor } from '@/components/presentations/wizard/EmailTemplateEditor';
import { EmailInvitationPreview } from '@/components/presentations/wizard/EmailInvitationPreview';
import { WhatsAppTemplateEditor } from '@/components/presentations/wizard/WhatsAppTemplateEditor';
import { WhatsAppChatPreview } from '@/components/presentations/wizard/WhatsAppChatPreview';
import { toast } from '@/lib/toast';
import { AddToCalendarActions } from '@/components/presentations/AddToCalendarActions';

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] as const },
};

function ResendInvitationForm({
  meeting,
  initialTab,
  isReschedule,
}: {
  meeting: StoredMeeting;
  initialTab: 'email' | 'whatsapp';
  isReschedule: boolean;
}) {
  const router = useRouter();
  const selectedProject = useAppSelector(selectSelectedProject);
  const defaultProjectName = selectedProject?.name || 'The Ivory Pavilion';
  useSyncExternalStore(subscribeInviteTemplates, readInviteTemplates, readInviteTemplates);
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp'>(initialTab);

  const projectTemplates = useMemo(
    () => getTemplateForProject(meeting.property || ''),
    [meeting.property]
  );

  const [emailFields, setEmailFields] = useState<EmailTemplateFields>(() =>
    isReschedule ? projectTemplates.rescheduleEmail : projectTemplates.email
  );
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    () => projectTemplates.whatsapp
  );

  const emailVariant = isReschedule ? 'reschedule' : 'invite';

  const context = useMemo(() => {
    const dateStr = meeting?.date;
    let parsedDate: Date | undefined = undefined;
    if (dateStr) {
      const d = parseDateString(dateStr);
      if (d) {
        parsedDate = d;
      }
    }
    const isParticipantCount = meeting?.client.toLowerCase().includes('participant');
    const clientName = isParticipantCount ? (meeting?.property || '') : (meeting?.client || '');
    const projectName = isParticipantCount ? defaultProjectName : (meeting?.property || '');

    return resolvePresentationContext({
      customerType: 'new',
      clientId: '',
      customerName: clientName,
      project: projectName,
      date: parsedDate,
      time: meeting?.time || '',
    });
  }, [meeting]);

  const calendarSchedule = useMemo(() => {
    const dateStr = meeting?.date;
    let parsedDate: Date | undefined = undefined;
    if (dateStr) {
      const d = parseDateString(dateStr);
      if (d) {
        parsedDate = d;
      }
    }
    return {
      date: parsedDate,
      time24: meeting?.time || '10:00',
      project: context.project_name,
      clientName: context.client_name,
      sessionLink: context.meeting_link,
    };
  }, [meeting, context]);

  const handleResendSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const channel = activeTab === 'email' ? 'Email' : 'WhatsApp';
    toast.inviteResent(context.client_name, channel);
    router.push('/meetings');
  };

  return (
    <motion.div
      className="space-y-8 pb-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="space-y-4">
        <button
          onClick={() => router.push('/meetings')}
          className="flex items-center gap-2 text-[10px] font-bold text-gold uppercase tracking-[0.2em] hover:text-ink transition-colors group"
        >
          <RiArrowLeftLine className="group-hover:-translate-x-1 transition-transform" />
          Back to Presentations
        </button>
        <PageHeader
          title={isReschedule ? PAGE.resend.rescheduleTitle : PAGE.resend.title}
          description={
            isReschedule
              ? PAGE.resend.rescheduleDescription
              : `${PAGE.resend.description} — ${context.client_name}, ${context.project_name}.`
          }
        />
      </div>

      {/* TABS HEADER */}
      <div className="flex w-full max-w-xl border border-stone-alt bg-stone/10 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('email')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2.5 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] transition-all rounded-lg cursor-pointer',
            activeTab === 'email'
              ? 'bg-ivory text-ink shadow-sm border border-stone-alt'
              : 'text-zinc-500 hover:text-ink border border-transparent'
          )}
        >
          <RiMailLine size={16} />
          {isReschedule ? 'Reschedule email' : 'Email invitation'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2.5 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] transition-all rounded-lg cursor-pointer',
            activeTab === 'whatsapp'
              ? 'bg-ivory text-ink shadow-sm border border-stone-alt'
              : 'text-zinc-500 hover:text-ink border border-transparent'
          )}
        >
          <RiWhatsappLine size={16} className="text-[#075E54]" />
          WhatsApp Invitation
        </button>
      </div>

      <form
        onSubmit={handleResendSubmit}
        className="overflow-hidden border border-stone-alt bg-ivory shadow-sm"
      >
        <AnimatePresence mode="wait">
          {activeTab === 'email' && (
            <motion.div key="email" {...panelMotion}>
              <div className="grid grid-cols-1 @3xl/dashboard:grid-cols-12 @3xl/dashboard:divide-x @3xl/dashboard:divide-stone-alt">
                <div className="space-y-8 p-6 sm:p-8 @3xl/dashboard:col-span-7 md:p-10">
                  <EmailTemplateEditor
                    variant={emailVariant}
                    value={emailFields}
                    onChange={setEmailFields}
                  />

                  {/* Calendar Integration Section */}
                  <div className="border-t border-stone-alt pt-8 space-y-4">
                    <h4 className="text-[10px] font-semibold tracking-[0.12em] uppercase text-zinc-400">Calendar Integration</h4>
                    <AddToCalendarActions schedule={calendarSchedule} variant="panel" />
                  </div>
                </div>
                <div className="bg-stone/30 p-6 sm:p-8 @3xl/dashboard:col-span-5 md:p-10">
                  <EmailInvitationPreview
                    variant={emailVariant}
                    fields={emailFields}
                    context={context}
                    schedule={calendarSchedule}
                    includeCalendar={true}
                  />
                </div>
              </div>
              <div className="p-8 border-t border-stone-alt bg-stone/20 flex justify-between items-center gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/meetings')}
                  className="h-14 px-8 border border-stone-alt text-xs font-semibold hover:bg-stone transition-all rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-14 px-8 bg-ink hover:bg-gold text-white text-xs font-semibold transition-all rounded-lg cursor-pointer"
                >
                  {isReschedule
                    ? PAGE.resend.submitRescheduleEmail
                    : 'Resend email invitation'}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'whatsapp' && (
            <motion.div key="whatsapp" {...panelMotion}>
              <div className="grid grid-cols-1 @3xl/dashboard:grid-cols-12 @3xl/dashboard:divide-x @3xl/dashboard:divide-stone-alt">
                <div className="space-y-8 p-6 sm:p-8 @3xl/dashboard:col-span-7 md:p-10">
                  <WhatsAppTemplateEditor
                    value={whatsappTemplate}
                    onChange={setWhatsappTemplate}
                  />

                  {/* Calendar Integration Section */}
                  <div className="border-t border-stone-alt pt-8 space-y-4">
                    <h4 className="text-[10px] font-semibold tracking-[0.12em] uppercase text-zinc-400">Calendar Integration</h4>
                    <AddToCalendarActions schedule={calendarSchedule} variant="panel" />
                  </div>
                </div>
                <div className="bg-stone/30 p-6 sm:p-8 @3xl/dashboard:col-span-5 md:p-10">
                  <WhatsAppChatPreview
                    message={whatsappTemplate}
                    context={context}
                    projectName={context.project_name}
                  />
                </div>
              </div>
              <div className="p-8 border-t border-stone-alt bg-stone/20 flex justify-between items-center gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/meetings')}
                  className="h-14 px-8 border border-stone-alt text-xs font-semibold hover:bg-stone transition-all rounded-lg cursor-pointer"
                >
                  Back to Email
                </button>
                <button
                  type="submit"
                  className="h-14 px-8 bg-ink hover:bg-gold text-white text-xs font-semibold transition-all rounded-lg cursor-pointer"
                >
                  Resend WhatsApp Message
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
}

export default function ResendInvitationPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;

  const meetingsList = useSyncExternalStore(
    subscribePresentations,
    readPresentations,
    seedPresentationsIfEmpty
  );

  const meeting = useMemo(
    () => meetingsList.find((m) => m.uuid === id),
    [meetingsList, id]
  );

  const initialTab = searchParams.get('type') === 'whatsapp' ? 'whatsapp' : 'email';
  const isReschedule = searchParams.get('mode') === 'reschedule';

  if (!meeting) {
    return (
      <DashboardLayout>
        <div className="space-y-6 text-center py-20">
          <h2 className="text-xl font-semibold text-ink">Presentation session not found</h2>
          <button
            onClick={() => router.push('/meetings')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-gold hover:text-ink transition-colors uppercase tracking-widest"
          >
            <RiArrowLeftLine />
            Back to presentations
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ResendInvitationForm
        key={`${id}-${initialTab}-${isReschedule}`}
        meeting={meeting}
        initialTab={initialTab}
        isReschedule={isReschedule}
      />
    </DashboardLayout>
  );
}
