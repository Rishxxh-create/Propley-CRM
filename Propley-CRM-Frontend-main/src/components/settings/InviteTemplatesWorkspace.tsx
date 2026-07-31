'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RiCalendarEventLine, RiMailLine, RiRefreshLine, RiWhatsappLine } from 'react-icons/ri';
import { EmailTemplateEditor } from '@/components/presentations/wizard/EmailTemplateEditor';
import { EmailInvitationPreview } from '@/components/presentations/wizard/EmailInvitationPreview';
import { WhatsAppTemplateEditor } from '@/components/presentations/wizard/WhatsAppTemplateEditor';
import { WhatsAppChatPreview } from '@/components/presentations/wizard/WhatsAppChatPreview';
import { ProfileInfoCallout } from '@/components/customers/ProfileInfoCallout';
import { UniversalSelect } from '@/components/UniversalSelect';
import { Button } from '@/components/ui/button';
import { PAGE } from '@/lib/copy';
import type { ProjectInviteTemplate } from '@/lib/invite-templates-store';
import { resolvePresentationContext } from '@/lib/presentation-templates';
import { cn } from '@/lib/utils';
import { useVoiceAgentStore } from '@/store/voice-agent-store';

type TemplateTab = 'invite-email' | 'reschedule-email' | 'whatsapp';

const TEMPLATE_TAB_MAP: Record<string, TemplateTab> = {
  email: 'invite-email',
  'invite-email': 'invite-email',
  reschedule: 'reschedule-email',
  'reschedule-email': 'reschedule-email',
  whatsapp: 'whatsapp',
};

function resolveTemplateTab(voiceTab: string | null, userTab: TemplateTab): TemplateTab {
  if (voiceTab && TEMPLATE_TAB_MAP[voiceTab]) {
    return TEMPLATE_TAB_MAP[voiceTab];
  }
  return userTab;
}

const panelMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] as const },
};

interface InviteTemplatesWorkspaceProps {
  current: ProjectInviteTemplate;
  projectId: string;
  options: { id: string; name: string; subtitle: string }[];
  onProjectChange: (id: string) => void;
  onDraftChange: (next: ProjectInviteTemplate) => void;
  onSave: () => void;
}

export function InviteTemplatesWorkspace({
  current,
  projectId,
  options,
  onProjectChange,
  onDraftChange,
  onSave,
}: InviteTemplatesWorkspaceProps) {
  const [userTab, setUserTab] = useState<TemplateTab>('invite-email');
  const voiceTab = useVoiceAgentStore((s) => s.activeTemplateTab);
  const activeTab = resolveTemplateTab(voiceTab, userTab);


  const previewContext = useMemo(
    () =>
      resolvePresentationContext({
        customerType: 'existing',
        clientId: 'preview',
        customerName: 'Arjun Mehta',
        project: current.projectName,
        date: new Date(2026, 4, 20),
        time: '14:30',
      }),
    [current.projectName]
  );

  const previewSchedule = useMemo(
    () => ({
      date: new Date(2026, 4, 20),
      time24: '14:30',
      project: current.projectName,
      clientName: previewContext.client_name,
      sessionLink: previewContext.meeting_link,
    }),
    [current.projectName, previewContext.client_name, previewContext.meeting_link]
  );

  const tabs: { id: TemplateTab; label: string; icon: typeof RiMailLine }[] = [
    { id: 'invite-email', label: PAGE.templates.tabs.inviteEmail, icon: RiMailLine },
    { id: 'reschedule-email', label: PAGE.templates.tabs.rescheduleEmail, icon: RiRefreshLine },
    { id: 'whatsapp', label: PAGE.templates.tabs.whatsapp, icon: RiWhatsappLine },
  ];

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="w-16 h-[2px] bg-gold" aria-hidden />

      <ProfileInfoCallout title={PAGE.templates.info.title}>
        <p className="font-semibold text-ink">{PAGE.templates.info.title}</p>
        <p>{PAGE.templates.info.body}</p>
      </ProfileInfoCallout>

      <motion.div
        className="max-w-md space-y-3 border border-stone-alt bg-stone/40 px-5 py-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
      >
        <p className="text-[10px] font-semibold tracking-[0.12em] text-zinc-500">
          {PAGE.templates.project}
        </p>
        <UniversalSelect
          value={projectId}
          onChange={onProjectChange}
          options={options}
          placeholder="Select project"
          enableSearch
        />
      </motion.div>

      <motion.div
        className="flex flex-wrap gap-1 border border-stone-alt bg-stone/20 p-1 sm:max-w-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08 }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setUserTab(tab.id)}
              className={cn(
                'flex flex-1 min-w-[140px] items-center justify-center gap-2 py-3.5 text-xs font-semibold tracking-[0.08em] transition-all rounded-lg',
                isActive
                  ? 'bg-ivory text-ink shadow-sm border border-stone-alt'
                  : 'text-zinc-500 hover:text-ink border border-transparent'
              )}
            >
              <Icon
                size={16}
                className={tab.id === 'whatsapp' ? 'text-[#075E54]' : isActive ? 'text-gold' : ''}
              />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      <div className="overflow-hidden border border-stone-alt bg-ivory shadow-sm">
        <AnimatePresence mode="wait">
          {(activeTab === 'invite-email' || activeTab === 'reschedule-email') && (
            <motion.div
              key={activeTab}
              {...panelMotion}
              className="grid grid-cols-1 lg:grid-cols-12 lg:divide-x lg:divide-stone-alt"
            >
              <motion.div className="space-y-8 p-8 md:p-10 lg:col-span-7">
                <EmailTemplateEditor
                  variant={activeTab === 'reschedule-email' ? 'reschedule' : 'invite'}
                  value={
                    activeTab === 'reschedule-email'
                      ? current.rescheduleEmail
                      : current.email
                  }
                  onChange={(fields) =>
                    onDraftChange(
                      activeTab === 'reschedule-email'
                        ? { ...current, rescheduleEmail: fields }
                        : { ...current, email: fields }
                    )
                  }
                />
                <div className="border-t border-stone-alt pt-8 space-y-3">
                  <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.12em] text-zinc-400">
                    <RiCalendarEventLine size={14} className="text-gold" />
                    Calendar preview
                  </p>
                  <p className="text-xs font-medium text-zinc-500">
                    Sample session — {previewContext.meeting_date} at{' '}
                    {previewContext.meeting_time}
                  </p>
                </div>
              </motion.div>
              <div className="bg-stone/30 p-8 md:p-10 lg:col-span-5">
                <EmailInvitationPreview
                  variant={activeTab === 'reschedule-email' ? 'reschedule' : 'invite'}
                  fields={
                    activeTab === 'reschedule-email'
                      ? current.rescheduleEmail
                      : current.email
                  }
                  context={previewContext}
                  schedule={previewSchedule}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'whatsapp' && (
            <motion.div
              key="whatsapp"
              {...panelMotion}
              className="grid grid-cols-1 lg:grid-cols-12 lg:divide-x lg:divide-stone-alt"
            >
              <div className="p-8 md:p-10 lg:col-span-7">
                <WhatsAppTemplateEditor
                  value={current.whatsapp}
                  onChange={(whatsapp) => onDraftChange({ ...current, whatsapp })}
                />
              </div>
              <motion.div className="bg-stone/30 p-8 md:p-10 lg:col-span-5">
                <WhatsAppChatPreview
                  message={current.whatsapp}
                  context={previewContext}
                  projectName={current.projectName}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Button variant="propley" type="button" onClick={onSave}>
        {PAGE.templates.save}
      </Button>
    </motion.div>
  );
}
