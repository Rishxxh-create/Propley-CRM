'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMeetingDraft, MeetingDraft } from '@/lib/meeting/draft-context';
import { lookupCustomer } from '@/lib/api/scheduling';
import { MEETING_FIELDS, MeetingFieldName } from './tools';

// Result of executing a tool. The `response` is what the model sees back.
// If `askUser` is set, the caller should pause the loop and surface the question.
export interface ToolResult {
  response: Record<string, unknown>;
  askUser?: string;
}

export type ToolExecutor = (args: Record<string, unknown>) => Promise<ToolResult>;

const ASK_USER_NAME = 'askUser';

export function useTools() {
  const draft = useMeetingDraft();
  const router = useRouter();
  const pathname = usePathname();

  const draftSnapshotResponse = useCallback((): Record<string, unknown> => {
    const d = draft.draft as MeetingDraft;
    return {
      draft: {
        ...d,
        date: d.date ? d.date.toISOString().slice(0, 10) : null,
      },
      isOpen: draft.isOpen,
      matchedCustomer: draft.matchedCustomer,
      status: draft.status,
    };
  }, [draft]);

  const executors = useMemo<Record<string, ToolExecutor>>(() => {
    return {
      openNewMeetingDrawer: async () => {
        draft.openDrawer();
        return { response: { ok: true, isOpen: true } };
      },
      closeNewMeetingDrawer: async () => {
        draft.closeDrawer();
        return { response: { ok: true, isOpen: false } };
      },
      setMeetingField: async (args) => {
        const field = args.field as string;
        const value = args.value as string;
        if (!MEETING_FIELDS.includes(field as MeetingFieldName)) {
          return { response: { ok: false, error: `Unknown field '${field}'. Valid: ${MEETING_FIELDS.join(', ')}` } };
        }
        draft.setField(field as MeetingFieldName, value ?? '');
        return { response: { ok: true, field, value } };
      },
      setMeetingDate: async (args) => {
        const iso = args.iso as string;
        const parsed = new Date(iso);
        if (isNaN(parsed.getTime())) {
          return { response: { ok: false, error: 'Invalid ISO date. Use YYYY-MM-DD.' } };
        }
        draft.setField('date', parsed);
        return { response: { ok: true, iso: parsed.toISOString().slice(0, 10) } };
      },
      setMeetingTime: async (args) => {
        const hhmm = args.hhmm as string;
        if (!/^\d{2}:\d{2}$/.test(hhmm || '')) {
          return { response: { ok: false, error: 'Invalid time. Use HH:MM (24-hour).' } };
        }
        draft.setField('time', hhmm);
        return { response: { ok: true, hhmm } };
      },
      getMeetingDraft: async () => {
        return { response: draftSnapshotResponse() };
      },
      getMeetingDraftStatus: async () => {
        return { response: { status: draft.status } };
      },
      lookupCustomer: async (args) => {
        try {
          const match = await lookupCustomer({
            email: typeof args.email === 'string' ? args.email : undefined,
            phone: typeof args.phone === 'string' ? args.phone : undefined,
          });
          return { response: { match } };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'lookup failed';
          return { response: { ok: false, error: message } };
        }
      },
      submitMeeting: async () => {
        try {
          const meeting = await draft.submit();
          return { response: { ok: true, meeting } };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'submit failed';
          return { response: { ok: false, error: message } };
        }
      },
      askUser: async (args) => {
        const question = (args.question as string) || 'Could you clarify?';
        return { response: { acknowledged: true, question }, askUser: question };
      },
      navigate: async (args) => {
        const path = args.path as string;
        if (typeof path !== 'string' || !path.startsWith('/')) {
          return { response: { ok: false, error: 'path must start with /' } };
        }
        router.push(path);
        return { response: { ok: true, path } };
      },
      getUiState: async () => {
        return {
          response: {
            route: pathname,
            isMeetingDrawerOpen: draft.isOpen,
            draft: draftSnapshotResponse().draft,
          },
        };
      },
    };
  }, [draft, draftSnapshotResponse, pathname, router]);

  const execute = useCallback(
    async (name: string, args: Record<string, unknown>): Promise<ToolResult> => {
      const fn = executors[name];
      if (!fn) {
        return { response: { ok: false, error: `Unknown tool '${name}'` } };
      }
      return fn(args);
    },
    [executors]
  );

  return { execute, askUserName: ASK_USER_NAME };
}
