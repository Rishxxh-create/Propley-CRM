import type { StoredMeeting } from '@/lib/mock-data';
import type { MeetingsLoadStatus } from '@/store/slices/meetingsSlice';

const PROPERTY_PLACEHOLDERS = ['—', 'Scheduled Meeting'] as const;
const ADVISOR_PLACEHOLDERS = ['—', 'Unknown'] as const;

function hasRealValue(value: string | undefined, blocklist: readonly string[]): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  return !blocklist.some((p) => p.toLowerCase() === lower);
}

function isRealClientName(client: string | undefined): boolean {
  const trimmed = client?.trim();
  if (!trimmed || trimmed === '—') return false;
  return !trimmed.toLowerCase().includes('participant');
}

export type PresentationContextReady = {
  status: 'ready';
  property: string | null;
  clientName: string | null;
  sessionDate: string | null;
  salesMember: string | null;
};

export type PresentationContextState =
  | { status: 'loading' }
  | PresentationContextReady;

export function getPresentationContext(
  meeting: StoredMeeting | null,
  meetingStatus: MeetingsLoadStatus,
): PresentationContextState {
  if (meetingStatus === 'loading' || meetingStatus === 'idle') {
    return { status: 'loading' };
  }

  if (meetingStatus !== 'loaded' || !meeting) {
    return {
      status: 'ready',
      property: null,
      clientName: null,
      sessionDate: null,
      salesMember: null,
    };
  }

  const sessionDate =
    meeting.date?.trim() && meeting.time?.trim()
      ? `${meeting.date.trim()} · ${meeting.time.trim()}`
      : null;

  return {
    status: 'ready',
    property: hasRealValue(meeting.property, PROPERTY_PLACEHOLDERS) ? meeting.property!.trim() : null,
    clientName: isRealClientName(meeting.client) ? meeting.client.trim() : null,
    sessionDate,
    salesMember: hasRealValue(meeting.salesMember, ADVISOR_PLACEHOLDERS)
      ? meeting.salesMember!.trim()
      : null,
  };
}

export function hasPresentationContextContent(ctx: PresentationContextState): boolean {
  if (ctx.status === 'loading') return true;
  return !!(ctx.property || ctx.clientName || ctx.sessionDate || ctx.salesMember);
}
