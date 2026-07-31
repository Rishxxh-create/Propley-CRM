'use client';

import { useMemo } from 'react';
import {
  RiArrowGoBackLine,
  RiCalendarLine,
  RiEyeLine,
  RiMore2Line,
  RiPlayCircleLine,
  RiReplyLine,
  RiShieldCheckLine,
  RiStarLine,
  RiTimeLine,
} from 'react-icons/ri';
import { AddToCalendarActions, type MeetingScheduleSource } from '@/components/presentations/AddToCalendarActions';
import { buildGoogleCalendarUrl, meetingCalendarFromSchedule } from '@/lib/calendar';
import {
  buildEmailHtml,
  emailSubjectForVariant,
  type EmailTemplateFields,
  type EmailTemplateVariant,
  type PresentationContext,
} from '@/lib/presentation-templates';

interface EmailInvitationPreviewProps {
  fields: EmailTemplateFields;
  context: PresentationContext;
  schedule: MeetingScheduleSource;
  includeCalendar?: boolean;
  variant?: EmailTemplateVariant;
}

export function EmailInvitationPreview({
  fields,
  context,
  schedule,
  includeCalendar = true,
  variant = 'invite',
}: EmailInvitationPreviewProps) {
  const googleCalendarUrl = useMemo(() => {
    if (!includeCalendar) return undefined;
    const input = meetingCalendarFromSchedule(schedule);
    return input ? buildGoogleCalendarUrl(input) : undefined;
  }, [includeCalendar, schedule]);

  const { html, ctaLabel } = buildEmailHtml(fields, context, { googleCalendarUrl });

  const subject = emailSubjectForVariant(variant, context.project_name);
  const previewCaption =
    variant === 'reschedule'
      ? 'How the reschedule notice appears in the client’s mailbox'
      : 'How the invitation appears in the client’s mailbox';

  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b border-stone-alt pb-4">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
          <RiEyeLine size={14} />
          Live preview
        </p>
        <h3 className="text-sm font-semibold tracking-tight text-ink">Gmail inbox view</h3>
        <p className="text-xs font-medium text-zinc-500">{previewCaption}</p>
      </div>

      {includeCalendar && (
        <AddToCalendarActions schedule={schedule} variant="panel" />
      )}

      <div className="overflow-hidden rounded-lg border border-[#dadce0] bg-[#f6f8fc] shadow-md">
        <div className="flex items-center gap-1 border-b border-[#dadce0] bg-[#f6f8fc] px-2 py-1.5">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center text-[#5f6368] hover:bg-[#e8eaed]"
            aria-hidden
          >
            <RiArrowGoBackLine size={18} />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center text-[#5f6368] hover:bg-[#e8eaed]"
            aria-hidden
          >
            <RiReplyLine size={18} />
          </button>
          <div className="ml-auto flex items-center gap-0.5">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center text-[#5f6368] hover:bg-[#e8eaed]"
              aria-hidden
            >
              <RiStarLine size={18} />
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center text-[#5f6368] hover:bg-[#e8eaed]"
              aria-hidden
            >
              <RiMore2Line size={18} />
            </button>
          </div>
        </div>

        <div className="border-b border-[#dadce0] bg-white px-4 py-3">
          <h4 className="text-xl font-normal leading-snug text-[#202124]">{subject}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-sm bg-[#e8f0fe] px-2 py-0.5 text-[11px] font-medium text-[#1967d2]">
              Inbox
            </span>
            <span className="text-[11px] font-medium text-[#5f6368]">Propley</span>
          </div>
        </div>

        <div className="flex gap-3 border-b border-[#f1f3f4] bg-white px-4 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-ink text-sm font-semibold text-white">
            P
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-[#202124]">
                Propley Sales
                <span className="font-normal text-[#5f6368]">
                  {' '}
                  &lt;invitations@propley.com&gt;
                </span>
              </p>
              <span className="shrink-0 text-xs text-[#5f6368]">Today, 9:42 AM</span>
            </div>
            <p className="mt-0.5 text-xs text-[#5f6368]">
              to <span className="text-[#202124]">{context.client_name}</span>
            </p>
          </div>
        </div>

        <div className="bg-white px-6 py-6">
          <div
            className="text-sm font-normal leading-relaxed text-[#3c4043] [&_a]:font-semibold [&_a]:text-[#8B6B3F] [&_p]:mb-4 [&_p:last-child]:mb-0"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <div className="mt-6 grid grid-cols-2 gap-3 rounded-sm border border-[#dadce0] bg-[#f8f9fa] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-[#202124]">
              <RiCalendarLine className="shrink-0 text-gold" size={14} />
              <span>{context.meeting_date}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#202124]">
              <RiTimeLine className="shrink-0 text-gold" size={14} />
              <span>{context.meeting_time}</span>
            </div>
          </div>

          {includeCalendar && googleCalendarUrl && (
            <AddToCalendarActions schedule={schedule} variant="email" className="mt-6" />
          )}

          <div className="mt-6 space-y-3 border-t border-[#f1f3f4] pt-6">
            <a
              href={context.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-white no-underline transition-colors hover:bg-gold"
            >
              <RiPlayCircleLine size={16} />
              {ctaLabel}
            </a>
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#5f6368]">
              <RiShieldCheckLine size={12} className="text-gold" />
              Secure hosted presentation · propley.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
