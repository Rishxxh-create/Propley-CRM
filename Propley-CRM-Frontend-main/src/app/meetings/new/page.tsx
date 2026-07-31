'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { CustomerSelect } from '@/components/presentations/CustomerSelect';
import { DatePicker } from '@/components/presentations/DatePicker';
import { TimeSelect } from '@/components/presentations/TimeSelect';
import { UniversalSelect } from '@/components/UniversalSelect';
import { Input } from '@/components/ui/input';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectProjects, selectSelectedProject, selectProjectsStatus } from '@/store/selectors/projectsSelectors';
import { LEAD_SOURCE_OPTIONS } from '@/lib/lead-source-options';
import { cn } from '@/lib/utils';
import { getCustomerByIdFromStore } from '@/lib/customers-store';
import { subscribeVoiceFormSync, type ScheduleFormSyncPayload } from '@/lib/voice-form-sync';
import { mergeScheduleFormData, schedulePayloadFromArgs } from '@/lib/schedule-voice-sync';
import { useVoiceAgentStore } from '@/store/voice-agent-store';
import { createSchedule } from '@/lib/api/schedule';
import { setSelectedProject } from '@/store/slices/projectsSlice';
import { fetchProjectsThunk } from '@/store/slices/projectsThunks';
import { toast } from '@/lib/toast';
import { resolvePresentationContext } from '@/lib/presentation-templates';
import {
  RiBuilding4Line,
  RiCalendarLine,
  RiMailLine,
  RiMapPinLine,
  RiPhoneLine,
  RiSparklingLine,
  RiTimeLine,
  RiUser3Line,
  RiUserAddLine,
} from 'react-icons/ri';
import { FormFieldLabel } from '@/components/presentations/wizard/FormFieldLabel';
import { ReservationSummary } from '@/components/presentations/wizard/ReservationSummary';
import { WizardFooter } from '@/components/presentations/wizard/WizardFooter';
import { PAGE } from '@/lib/copy';

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] as const },
};

function NewMeetingPageContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const prefilledClientId = searchParams.get('client') ?? '';

  const [customerType, setCustomerType] = useState<'existing' | 'new'>('existing');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const projects = useAppSelector(selectProjects);
  const selectedProject = useAppSelector(selectSelectedProject);
  const projectsStatus = useAppSelector(selectProjectsStatus);

  useEffect(() => {
    if (projectsStatus === 'idle') {
      void dispatch(fetchProjectsThunk());
    }
  }, [dispatch, projectsStatus]);

  const [formData, setFormData] = useState<{
    project: string;
    client: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerCity: string;
    customerLeadSource: string;
    date: Date | undefined;
    time: string;
  }>(() => {
    const now = new Date();
    let h = now.getHours();
    let m = Math.ceil(now.getMinutes() / 15) * 15;
    if (m === 60) {
      m = 0;
      h += 1;
    }
    const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    return {
      project: selectedProject?.name || '',
      client: prefilledClientId,
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerCity: '',
      customerLeadSource: '',
      date: now,
      time: timeStr,
    };
  });

  useEffect(() => {
    const applyScheduleVoicePayload = (payload: ScheduleFormSyncPayload) => {
      setFormData((prev) => {
        const { next, customerType: type } = mergeScheduleFormData(prev, payload);
        setCustomerType(type);
        return next;
      });
    };

    const slot = useVoiceAgentStore.getState().slotFilling;
    if (slot?.commandId === 'schedule-presentation') {
      applyScheduleVoicePayload(schedulePayloadFromArgs(slot.filledArgs));
    }

    return subscribeVoiceFormSync((detail) => {
      if (detail.type !== 'schedule-presentation') return;
      applyScheduleVoicePayload(detail.payload as ScheduleFormSyncPayload);
    });
  }, []);

  const context = useMemo(
    () =>
      resolvePresentationContext({
        customerType,
        clientId: formData.client,
        customerName: formData.customerName,
        project: formData.project,
        date: formData.date,
        time: formData.time,
      }),
    [customerType, formData]
  );

  const clientLabel = useMemo(() => {
    if (customerType === 'existing') {
      return getCustomerByIdFromStore(formData.client)?.name ?? '';
    }
    return formData.customerName;
  }, [customerType, formData.client, formData.customerName]);

  const isSetupValid =
    Boolean(formData.project.trim()) &&
    (customerType === 'existing' ? Boolean(formData.client) : Boolean(formData.customerName.trim())) &&
    Boolean(formData.date) &&
    Boolean(formData.time);

  const submitSchedule = async () => {
    if (isSubmitting) return;

    if (!isSetupValid) {
      if (!formData.project.trim()) {
        toast.error('Select a development project to continue.');
      } else if (customerType === 'existing' ? !formData.client : !formData.customerName.trim()) {
        toast.error(
          customerType === 'existing'
            ? 'Select a client to continue.'
            : 'Enter the customer name to continue.'
        );
      } else {
        toast.error('Pick a session date and time to continue.');
      }
      return;
    }

    const timeParts = formData.time ? formData.time.split(':') : ['10', '00'];
    const apiDate = formData.date ? new Date(formData.date) : new Date();
    apiDate.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10), 0, 0);

    if (apiDate.getTime() <= Date.now()) {
      toast.error('Pick a date and time in the future.');
      return;
    }

    setIsSubmitting(true);
    try {
      let email = formData.customerEmail;
      let phone = formData.customerPhone;
      if (customerType === 'existing') {
        const c = getCustomerByIdFromStore(formData.client);
        if (c) {
          email = c.email;
          phone = c.phone;
        }
      }

      const selectedProjectForSubmit = projects.find((p) => p.name === formData.project);

      await createSchedule({
        client_name: context.client_name,
        client_email: email || 'unknown@example.com',
        client_phone: phone || '+10000000000',
        project_id: selectedProjectForSubmit ? Number(selectedProjectForSubmit.id) : null,
        start_time: apiDate.toISOString(),
      });

      toast.presentationScheduled();
      router.push('/meetings');
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (error as { message?: string })?.message;
      toast.error(message || 'Failed to create presentation');
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submitSchedule();
  };

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-8 pb-16 px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <PageHeader
          title={PAGE.schedule.title}
          description={PAGE.schedule.description}
          breadcrumbs={[
            { label: PAGE.schedule.breadcrumbs.list, href: '/meetings' },
            { label: PAGE.schedule.breadcrumbs.current },
          ]}
        />

        <form
          onSubmit={handleFormSubmit}
          className="overflow-hidden border border-stone-alt bg-ivory shadow-sm"
        >
          <motion.div {...panelMotion}>
            <div className="grid grid-cols-1 lg:grid-cols-12 lg:divide-x lg:divide-stone-alt">
              <div className="flex flex-col lg:col-span-7">
                <div className="space-y-10 px-4 sm:px-8 py-8">
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink">
                      <RiSparklingLine className="text-gold" size={18} />
                      Presentation target
                    </h3>
                    <p className="text-sm font-medium leading-relaxed text-zinc-500">
                      Select the development, client segment, and session schedule.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <FormFieldLabel icon={RiBuilding4Line}>Development project</FormFieldLabel>
                    <UniversalSelect
                      value={formData.project}
                      onChange={(val) => {
                        setFormData({ ...formData, project: val });
                        const proj = projects.find((p) => p.name === val);
                        if (proj) {
                          dispatch(setSelectedProject(proj.id));
                        }
                      }}
                      options={projects.map((p) => ({ id: p.name, name: p.name }))}
                      placeholder="e.g. The Ivory Pavilion"
                      enableSearch={false}
                    />
                  </div>

                  <div className="space-y-4">
                    <FormFieldLabel icon={RiUser3Line}>Client segment</FormFieldLabel>
                    <div className="flex gap-0 border border-stone-alt bg-stone/50 p-1">
                      {(['existing', 'new'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setCustomerType(type)}
                          className={cn(
                            'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors',
                            customerType === type
                              ? 'bg-ivory text-ink shadow-sm'
                              : 'text-zinc-500 hover:text-ink'
                          )}
                        >
                          {type === 'existing' ? (
                            <>
                              <RiUser3Line size={14} />
                              Existing customer
                            </>
                          ) : (
                            <>
                              <RiUserAddLine size={14} />
                              New prospect
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {customerType === 'existing' ? (
                    <div className="space-y-3" data-vaul-no-drag>
                      <FormFieldLabel icon={RiUser3Line}>Primary client</FormFieldLabel>
                      <CustomerSelect
                        value={formData.client}
                        onChange={(client) => setFormData({ ...formData, client })}
                      />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-3">
                          <FormFieldLabel icon={RiUser3Line}>Customer name</FormFieldLabel>
                          <Input
                            placeholder="Full name"
                            value={formData.customerName}
                            onChange={(event) =>
                              setFormData({ ...formData, customerName: event.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-3">
                          <FormFieldLabel icon={RiPhoneLine}>Phone number</FormFieldLabel>
                          <Input
                            placeholder="+1 (555) 000-0000"
                            value={formData.customerPhone}
                            onChange={(event) =>
                              setFormData({ ...formData, customerPhone: event.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-3">
                          <FormFieldLabel icon={RiMailLine}>Email address</FormFieldLabel>
                          <Input
                            type="email"
                            placeholder="client@domain.com"
                            value={formData.customerEmail}
                            onChange={(event) =>
                              setFormData({ ...formData, customerEmail: event.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-3">
                          <FormFieldLabel icon={RiMapPinLine}>City</FormFieldLabel>
                          <Input
                            placeholder="e.g. New York"
                            value={formData.customerCity}
                            onChange={(event) =>
                              setFormData({ ...formData, customerCity: event.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <FormFieldLabel icon={RiSparklingLine}>Lead source</FormFieldLabel>
                        <UniversalSelect
                          value={formData.customerLeadSource}
                          onChange={(value) =>
                            setFormData({ ...formData, customerLeadSource: value })
                          }
                          options={LEAD_SOURCE_OPTIONS}
                          placeholder="How did this lead find us?"
                          enableSearch={false}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-8 border-t border-stone-alt pt-8">
                    <div className="space-y-3">
                      <FormFieldLabel icon={RiCalendarLine}>Session date</FormFieldLabel>
                      <DatePicker
                        value={formData.date}
                        onChange={(date) => setFormData({ ...formData, date })}
                        placeholder="Select date"
                        minDate={new Date()}
                      />
                    </div>
                    <div className="space-y-3">
                      <FormFieldLabel icon={RiTimeLine}>Preferred time</FormFieldLabel>
                      <TimeSelect
                        value={formData.time}
                        onChange={(time) => setFormData({ ...formData, time })}
                      />
                    </div>
                  </div>

                  {!isSetupValid && (
                    <p className="text-xs font-medium text-zinc-500">
                      Complete the development, client, date and time to schedule the presentation.
                    </p>
                  )}
                </div>

                <WizardFooter
                  className="border-t border-stone-alt bg-transparent px-4 sm:px-8 py-8"
                  stepLabel="Scheduling sends the email invite and blocks the calendar automatically."
                  nextLabel={isSubmitting ? 'Scheduling…' : 'Schedule presentation'}
                  onNext={submitSchedule}
                />
              </div>

              <div className="bg-stone/30 px-4 sm:px-8 py-8 lg:col-span-5">
                <ReservationSummary
                  project={formData.project}
                  clientLabel={clientLabel}
                  date={formData.date}
                  time={formData.time}
                />
              </div>
            </div>
          </motion.div>
        </form>
      </motion.div>
    </DashboardLayout>
  );
}

export default function NewMeetingPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="space-y-8 pb-16 px-4 sm:px-8 py-8">
            <div className="space-y-2 mb-8">
              <div className="h-8 w-64 rounded-md bg-zinc-200 animate-pulse" />
              <div className="h-4 w-96 rounded-md bg-zinc-100 animate-pulse" />
            </div>
            <div className="w-full rounded-xl border border-stone-alt bg-white shadow-none! animate-pulse flex flex-col md:flex-row divide-y md:divide-x md:divide-y-0 divide-stone-alt overflow-hidden">
              <div className="flex-1 p-8 space-y-10 bg-ivory">
                <div className="space-y-3">
                  <div className="h-4 w-48 rounded-md bg-zinc-200" />
                  <div className="h-12 w-full rounded-lg bg-zinc-100" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-32 rounded-md bg-zinc-200" />
                  <div className="h-12 w-full rounded-lg bg-zinc-100" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-40 rounded-md bg-zinc-200" />
                  <div className="h-12 w-full rounded-lg bg-zinc-100" />
                </div>
              </div>
              <div className="w-full md:w-80 bg-stone/30 p-8 h-[500px]">
                <div className="h-4 w-24 rounded-md bg-zinc-200 mb-6" />
                <div className="h-6 w-48 rounded-md bg-zinc-200 mb-2" />
                <div className="h-4 w-32 rounded-md bg-zinc-100" />
              </div>
            </div>
          </div>
        </DashboardLayout>
      }
    >
      <NewMeetingPageContent />
    </Suspense>
  );
}
