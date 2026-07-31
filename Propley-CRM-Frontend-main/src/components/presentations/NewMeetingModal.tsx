'use client';

import { useMemo, useState } from 'react';
import {
  RiCloseLine,
  RiArrowRightLine,
  RiShareLine,
  RiMailLine,
  RiWhatsappLine,
  RiCalendarLine,
} from 'react-icons/ri';
import { CustomerSelect } from '@/components/presentations/CustomerSelect';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { DatePicker } from '@/components/presentations/DatePicker';
import { TimeSelect } from '@/components/presentations/TimeSelect';
import { UniversalSelect } from '@/components/UniversalSelect';
import { LEAD_SOURCE_OPTIONS } from '@/lib/lead-source-options';
import { formatStoredPresentationDate } from '@/lib/date-format';
import { cn } from "@/lib/utils";
import { TEAM_MEMBERS, getDevelopmentByName } from '@/lib/mock-data';
import { addPresentation } from '@/lib/presentations-store';
import { getCurrentAdvisorId } from '@/lib/current-advisor';
import { toast } from '@/lib/toast';
import {
  DEFAULT_EMAIL_TEMPLATE,
  resolvePresentationContext,
  type EmailTemplateFields,
} from '@/lib/presentation-templates';
import { EmailTemplateEditor } from '@/components/presentations/wizard/EmailTemplateEditor';
import { EmailInvitationPreview } from '@/components/presentations/wizard/EmailInvitationPreview';

interface NewMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewMeetingModal({ isOpen, onClose }: NewMeetingModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'notifications'>('details');
  const [customerType, setCustomerType] = useState<'existing' | 'new'>('existing');

  const [formData, setFormData] = useState({
    project: '',
    client: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerCity: '',
    customerLeadSource: '',
    date: undefined as Date | undefined,
    time: ''
  });

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [emailFields, setEmailFields] = useState<EmailTemplateFields>(DEFAULT_EMAIL_TEMPLATE);

  const previewContext = resolvePresentationContext({
    customerType,
    clientId: formData.client,
    customerName: formData.customerName,
    project: formData.project,
    date: formData.date,
    time: formData.time,
  });

  const calendarSchedule = useMemo(
    () => ({
      date: formData.date,
      time24: formData.time,
      project: formData.project || previewContext.project_name,
      clientName: previewContext.client_name,
      sessionLink: previewContext.meeting_link,
    }),
    [formData.date, formData.time, formData.project, previewContext]
  );

  const handleCreateMeeting = () => {
    if (!formData.project || (customerType === 'existing' && !formData.client) || (customerType === 'new' && !formData.customerName)) {
      toast.error('Please fill out all required fields.');
      return;
    }

    const uuid = Math.random().toString(36).substring(2, 11);
    const advisor = TEAM_MEMBERS.find((m) => m.id === getCurrentAdvisorId());
    const dev = getDevelopmentByName(formData.project);
    const meetingDate = formData.date ? formatStoredPresentationDate(formData.date) : '20 May 2026';
    const meetingTime = formData.time || '10:00 AM';

    const newMeeting = {
      uuid,
      salesMember: advisor?.name ?? 'Priya Sharma',
      salesMemberId: advisor?.id ?? 'tm-001',
      property: formData.project,
      category: dev?.category ?? 'Luxury Residential',
      client: previewContext.client_name,
      clientId: customerType === 'existing' ? formData.client : undefined,
      date: meetingDate,
      time: meetingTime,
      status: 'Scheduled' as const,
    };

    addPresentation(newMeeting);
    toast.presentationScheduled();
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction="right" repositionInputs={false}>
      <DrawerContent className="h-full rounded-lg border-s border-stone-alt bg-white flex flex-col w-full sm:w-[500px] outline-none overflow-hidden">
        {/* CLOSE BUTTON */}
        <DrawerClose asChild>
          <button
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center transition-colors text-zinc-400 hover:text-ink z-50 group cursor-pointer"
          >
            <RiCloseLine size={24} className="group-hover:scale-110 transition-transform" />
          </button>
        </DrawerClose>

        <DrawerHeader className="p-8 pb-4 shrink-0">
          <DrawerTitle className="text-3xl font-semibold text-ink tracking-tight leading-[0.9] mb-4">New Meeting</DrawerTitle>

          {/* PREMIUM TABS */}
          <div className="flex gap-6 border-b border-stone-alt mt-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={cn(
                "flex items-center gap-2 pb-3 text-xs font-semibold tracking-wider uppercase transition-all border-b-2 cursor-pointer",
                activeTab === 'details' ? "border-gold text-ink" : "border-transparent text-zinc-400 hover:text-ink"
              )}
            >
              <RiCalendarLine size={14} />
              1. Setup Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={cn(
                "flex items-center gap-2 pb-3 text-xs font-semibold tracking-wider uppercase transition-all border-b-2 cursor-pointer",
                activeTab === 'notifications' ? "border-gold text-ink" : "border-transparent text-zinc-400 hover:text-ink"
              )}
            >
              <RiMailLine size={14} />
              2. Email Invitation
            </button>
          </div>
        </DrawerHeader>

        {/* SCROLLABLE FORM AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 py-2">
          {activeTab === 'details' ? (
            <div className="space-y-10 animate-in fade-in duration-300">
              {/* PROJECT FIELD */}
              <div className="space-y-4 group">
                <Label>Development Project</Label>
                <Input
                  placeholder="e.g. The Ivory Pavilion"
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                />
              </div>

              {/* CUSTOMER SELECTION */}
              <div className="space-y-6">
                <div className="flex gap-4 p-1 bg-stone border border-stone-alt">
                  <button
                    onClick={() => setCustomerType('existing')}
                    className={cn(
                      "flex-1 py-3 text-xs font-semibold transition-all cursor-pointer",
                      customerType === 'existing' ? "bg-white text-ink shadow-sm" : "text-zinc-500 hover:text-ink"
                    )}
                  >
                    Choose Customer
                  </button>
                  <button
                    onClick={() => setCustomerType('new')}
                    className={cn(
                      "flex-1 py-3 text-xs font-semibold transition-all cursor-pointer",
                      customerType === 'new' ? "bg-white text-ink shadow-sm" : "text-zinc-500 hover:text-ink"
                    )}
                  >
                    New Customer
                  </button>
                </div>

                {customerType === 'existing' ? (
                  <div className="space-y-4 group animate-in fade-in" data-vaul-no-drag>
                    <Label>Primary Client</Label>
                    <CustomerSelect
                      value={formData.client}
                      onChange={(client) => setFormData({ ...formData, client })}
                    />
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Label>Customer Name</Label>
                        <Input
                          placeholder="Full Name"
                          value={formData.customerName}
                          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-4">
                        <Label>Phone Number</Label>
                        <PhoneInput
                          placeholder="(555) 000-0000"
                          value={formData.customerPhone}
                          onChange={(value) => setFormData({ ...formData, customerPhone: value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Label>Email Address</Label>
                        <Input
                          type="email"
                          placeholder="client@example.com"
                          value={formData.customerEmail}
                          onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                        />
                      </div>
                      <div className="space-y-4">
                        <Label>City</Label>
                        <Input
                          placeholder="e.g. New York"
                          value={formData.customerCity}
                          onChange={(e) => setFormData({ ...formData, customerCity: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="flex items-center gap-2">
                        <RiShareLine size={14} className="text-gold" />
                        Lead Source
                      </Label>
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
              </div>

              {/* DATE & TIME GRID */}
              <div className="grid grid-cols-1 gap-10">
                <div className="space-y-4 group">
                  <Label>Session Date</Label>
                  <DatePicker
                    value={formData.date}
                    onChange={(date) => setFormData({ ...formData, date })}
                    placeholder="Pick a date"
                  />
                </div>

                <div className="space-y-4 group">
                  <Label>Preferred Time</Label>
                  <TimeSelect
                    value={formData.time}
                    onChange={(time) => setFormData({ ...formData, time })}
                  />
                </div>
              </div>

              {/* INTEL BLOCK */}
              <div className="p-8 bg-stone border-l border-gold/30">
                <h4 className="text-sm font-semibold text-ink mb-2">
                  Session Intelligence
                </h4>
                <p className="text-xs text-zinc-500 leading-relaxed font-semibold">
                  The Propley Engine will automatically generate optimized 3D assets and a personalized invitation for this client.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in duration-300">
              {/* NOTIFICATION TOGGLES */}
              <div className="grid grid-cols-2 gap-6 p-6 border border-stone-alt bg-stone/30">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-ink">
                    <RiMailLine size={14} className="text-gold shrink-0" />
                    Email Notification
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={emailEnabled}
                      onChange={(e) => setEmailEnabled(e.target.checked)}
                      className="rounded-lg border-stone-alt text-gold focus:ring-gold h-5 w-5 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-zinc-600">Enabled</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-ink">
                    <RiWhatsappLine size={14} className="text-[#075E54] shrink-0" />
                    WhatsApp Invite
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={whatsappEnabled}
                      onChange={(e) => setWhatsappEnabled(e.target.checked)}
                      className="rounded-lg border-stone-alt text-gold focus:ring-gold h-5 w-5 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-zinc-600">Enabled</span>
                  </div>
                </div>
              </div>

              <EmailTemplateEditor value={emailFields} onChange={setEmailFields} />

              <EmailInvitationPreview
                fields={emailFields}
                context={previewContext}
                schedule={calendarSchedule}
                includeCalendar={emailEnabled}
              />
            </div>
          )}
        </div>

        {/* FIXED FOOTER */}
        <footer className="p-8 py-4 bg-white border-t border-stone-alt shrink-0 flex gap-4">
          {activeTab === 'details' ? (
            <Button
              variant="propley"
              className="w-full h-16 group"
              onClick={() => setActiveTab('notifications')}
            >
              Configure Notifications
              <RiArrowRightLine size={18} className="text-white group-hover:translate-x-1 transition-all" />
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="flex-1 h-16 rounded-lg text-xs font-semibold"
                onClick={() => setActiveTab('details')}
              >
                Back
              </Button>
              <Button
                variant="propley"
                className="flex-1 h-16 group"
                onClick={handleCreateMeeting}
              >
                Schedule & Send
                <RiArrowRightLine size={18} className="text-white group-hover:translate-x-1 transition-all" />
              </Button>
            </>
          )}
        </footer>
      </DrawerContent>
    </Drawer>
  );
}
