import { formatIndianDateTime } from '@/lib/date-format';

export const POST_MEETING_NOTES_KEY = 'propley_post_meeting_notes';

export interface StoredAdvisorNote {
  id: string;
  body: string;
  author: string;
  createdAt: string;
}

type NotesByMeeting = Record<string, StoredAdvisorNote[]>;

/** Stable empty array for useSyncExternalStore snapshots */
export const EMPTY_ADVISOR_NOTES: StoredAdvisorNote[] = [];

let cachedNotesAll: NotesByMeeting | null = null;

function readAll(): NotesByMeeting {
  if (typeof window === 'undefined') return {};
  if (cachedNotesAll !== null) return cachedNotesAll;
  try {
    const raw = localStorage.getItem(POST_MEETING_NOTES_KEY);
    if (!raw) {
      cachedNotesAll = {};
      return cachedNotesAll;
    }
    cachedNotesAll = JSON.parse(raw) as NotesByMeeting;
    return cachedNotesAll;
  } catch {
    cachedNotesAll = {};
    return cachedNotesAll;
  }
}

function writeAll(data: NotesByMeeting) {
  cachedNotesAll = data;
  localStorage.setItem(POST_MEETING_NOTES_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event('propley_post_meeting_notes_updated'));
}

export function readAdvisorNotes(meetingId: string): StoredAdvisorNote[] {
  return readAll()[meetingId] ?? EMPTY_ADVISOR_NOTES;
}

export function addAdvisorNote(
  meetingId: string,
  body: string,
  author: string
): StoredAdvisorNote {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error('Note body is required');
  }
  const note: StoredAdvisorNote = {
    id: `note-${Date.now()}`,
    body: trimmed,
    author,
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  const existing = all[meetingId] ?? [];
  all[meetingId] = [note, ...existing];
  writeAll(all);
  return note;
}

export function deleteAdvisorNote(meetingId: string, noteId: string) {
  const all = readAll();
  const existing = all[meetingId] ?? [];
  all[meetingId] = existing.filter((n) => n.id !== noteId);
  writeAll(all);
}

export function subscribeAdvisorNotes(onStoreChange: () => void) {
  const onCustom = () => {
    cachedNotesAll = null;
    onStoreChange();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === POST_MEETING_NOTES_KEY) onCustom();
  };
  window.addEventListener('propley_post_meeting_notes_updated', onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('propley_post_meeting_notes_updated', onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

export function formatAdvisorNoteDate(iso: string): string {
  try {
    return formatIndianDateTime(new Date(iso));
  } catch {
    return iso;
  }
}
