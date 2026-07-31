import { formatIndianDateTime } from '@/lib/date-format';
import {
  fetchClientNotes as apiFetchClientNotes,
  createClientNote as apiCreateClientNote,
  updateClientNote as apiUpdateClientNote,
  deleteClientNote as apiDeleteClientNote,
} from '@/lib/api/client-notes';

export const CLIENT_NOTES_UPDATED_EVENT = 'propley_client_notes_updated';

export interface StoredClientNote {
  id: number;
  body: string;
  author: string;
  createdAt: string;
}

type NotesByClient = Record<string, StoredClientNote[]>;

export const EMPTY_CLIENT_NOTES: StoredClientNote[] = [];

const cachedNotesAll: NotesByClient = {};
const fetchStatus: Record<string, 'idle' | 'loading' | 'loaded' | 'error'> = {};

function dispatchUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CLIENT_NOTES_UPDATED_EVENT));
  }
}

export function readClientNotes(clientId: string): StoredClientNote[] {
  if (typeof window === 'undefined') return EMPTY_CLIENT_NOTES;
  
  if (fetchStatus[clientId] !== 'loading' && fetchStatus[clientId] !== 'loaded') {
    fetchStatus[clientId] = 'loading';
    dispatchUpdate();
    
    apiFetchClientNotes(clientId).then(notes => {
      cachedNotesAll[clientId] = notes.map(n => ({
        id: n.id,
        body: n.body,
        author: n.author,
        createdAt: n.created_at,
      })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      fetchStatus[clientId] = 'loaded';
      dispatchUpdate();
    }).catch(err => {
      console.error('Failed to load notes', err);
      fetchStatus[clientId] = 'error';
      dispatchUpdate();
    });
  }
  return cachedNotesAll[clientId] ?? EMPTY_CLIENT_NOTES;
}

export function readClientNotesStatus(clientId: string): 'idle' | 'loading' | 'loaded' | 'error' {
  return fetchStatus[clientId] ?? 'idle';
}

export async function addClientNote(
  clientId: string,
  body: string,
  author: string
): Promise<StoredClientNote> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Note body is required');
  
  const n = await apiCreateClientNote(clientId, trimmed, author);
  const note: StoredClientNote = {
    id: n.id,
    body: n.body,
    author: n.author,
    createdAt: n.created_at,
  };
  
  cachedNotesAll[clientId] = [note, ...(cachedNotesAll[clientId] ?? [])];
  dispatchUpdate();
  return note;
}

export async function updateClientNote(
  clientId: string,
  noteId: number,
  body: string
): Promise<StoredClientNote> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Note body is required');
  
  const n = await apiUpdateClientNote(clientId, noteId, trimmed);
  const note: StoredClientNote = {
    id: n.id,
    body: n.body,
    author: n.author,
    createdAt: n.created_at,
  };
  
  if (cachedNotesAll[clientId]) {
    cachedNotesAll[clientId] = cachedNotesAll[clientId].map(x => x.id === noteId ? note : x);
    dispatchUpdate();
  }
  return note;
}

export async function deleteClientNote(
  clientId: string,
  noteId: number
): Promise<void> {
  await apiDeleteClientNote(clientId, noteId);
  if (cachedNotesAll[clientId]) {
    cachedNotesAll[clientId] = cachedNotesAll[clientId].filter(x => x.id !== noteId);
    dispatchUpdate();
  }
}

export function subscribeClientNotes(onStoreChange: () => void) {
  window.addEventListener(CLIENT_NOTES_UPDATED_EVENT, onStoreChange);
  return () => window.removeEventListener(CLIENT_NOTES_UPDATED_EVENT, onStoreChange);
}

export function formatClientNoteDate(iso: string): string {
  try {
    return formatIndianDateTime(new Date(iso));
  } catch {
    return iso;
  }
}
