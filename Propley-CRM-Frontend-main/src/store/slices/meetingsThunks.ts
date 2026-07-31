import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import {
  selectMeetingsListStatus,
  selectMeetingActivityStatus,
  selectMeetingActivityUuid,
  selectCurrentMeetingStatus,
  selectCurrentMeeting,
  selectMeetingNotesStatus,
} from '@/store/selectors/meetingsSelectors';
import {
  fetchMeetingsAll,
  mapApiSchedulesToStored,
  fetchMeetingByUuid,
  fetchMeetingNotes,
  createMeetingNote,
  updateMeetingNote,
  deleteMeetingNote,
} from '@/lib/api/meetings';
import { fetchSchedules } from '@/lib/api/schedule';
import { fetchMeetingActivity } from '@/lib/api/events';
import { isRequestCanceled, serializeApiError } from '@/lib/api/http-client';


export const fetchSchedulesThunk = createAsyncThunk(
  'meetings/fetchSchedules',
  async (_, { rejectWithValue, signal }) => {
    try {
      const data = await fetchSchedules({ signal });
      return mapApiSchedulesToStored(data);
    } catch (err) {
      if (isRequestCanceled(err)) {
        return rejectWithValue('canceled');
      }
      return rejectWithValue(serializeApiError(err));
    }
  },
);

export type FetchMeetingsAllArg = { force?: boolean } | void;

export const fetchMeetingsAllThunk = createAsyncThunk(
  'meetings/fetchAll',
  async (_arg: FetchMeetingsAllArg, { rejectWithValue, signal }) => {
    try {
      return await fetchMeetingsAll({ signal });
    } catch (err) {
      if (isRequestCanceled(err)) {
        return rejectWithValue('canceled');
      }
      return rejectWithValue(serializeApiError(err));
    }
  },
  {
    condition: (arg, { getState }) => {
      if (arg && typeof arg === 'object' && arg.force) return true;
      const status = selectMeetingsListStatus(getState() as RootState);
      return status === 'idle' || status === 'error';
    },
  },
);

export const fetchMeetingActivityThunk = createAsyncThunk(
  'meetings/fetchActivity',
  async (meetingUuid: string, { rejectWithValue, signal }) => {
    try {
      return { meetingUuid, events: await fetchMeetingActivity(meetingUuid, { signal }) };
    } catch (err) {
      if (isRequestCanceled(err)) {
        return rejectWithValue('canceled');
      }
      return rejectWithValue(serializeApiError(err));
    }
  },
  {
    condition: (meetingUuid, { getState }) => {
      const state = getState() as RootState;
      const status = selectMeetingActivityStatus(state);
      const loadedUuid = selectMeetingActivityUuid(state);
      if (status === 'loading') return false;
      if (status === 'loaded' && loadedUuid === meetingUuid) return false;
      return true;
    },
  },
);

export const fetchMeetingThunk = createAsyncThunk(
  'meetings/fetchByUuid',
  async (meetingUuid: string, { rejectWithValue, signal }) => {
    try {
      return await fetchMeetingByUuid(meetingUuid, { signal });
    } catch (err) {
      if (isRequestCanceled(err)) {
        return rejectWithValue('canceled');
      }
      return rejectWithValue(serializeApiError(err));
    }
  },
  {
    condition: (meetingUuid, { getState }) => {
      const state = getState() as RootState;
      const status = selectCurrentMeetingStatus(state);
      const currentMeeting = selectCurrentMeeting(state);
      if (status === 'loading') return false;
      if (status === 'loaded' && currentMeeting?.uuid === meetingUuid) return false;
      return true;
    },
  },
);

export const fetchMeetingNotesThunk = createAsyncThunk(
  'meetings/fetchNotes',
  async (meetingUuid: string, { rejectWithValue, signal }) => {
    try {
      return await fetchMeetingNotes(meetingUuid, { signal });
    } catch (err) {
      if (isRequestCanceled(err)) {
        return rejectWithValue('canceled');
      }
      return rejectWithValue(serializeApiError(err));
    }
  },
  {
    condition: (meetingUuid, { getState }) => {
      const state = getState() as RootState;
      const status = selectMeetingNotesStatus(state);
      const currentMeeting = selectCurrentMeeting(state);
      if (status === 'loading') return false;
      if (status === 'loaded' && currentMeeting?.uuid === meetingUuid) return false;
      return true;
    },
  },
);

export const createMeetingNoteThunk = createAsyncThunk(
  'meetings/createNote',
  async ({ meetingUuid, payload }: { meetingUuid: string; payload: { note: string } }, { rejectWithValue, signal }) => {
    try {
      return await createMeetingNote(meetingUuid, payload, { signal });
    } catch (err) {
      if (isRequestCanceled(err)) {
        return rejectWithValue('canceled');
      }
      return rejectWithValue(serializeApiError(err));
    }
  },
);

export const updateMeetingNoteThunk = createAsyncThunk(
  'meetings/updateNote',
  async ({ meetingUuid, noteId, payload }: { meetingUuid: string; noteId: string; payload: { note: string } }, { rejectWithValue, signal }) => {
    try {
      return await updateMeetingNote(meetingUuid, noteId, payload, { signal });
    } catch (err) {
      if (isRequestCanceled(err)) {
        return rejectWithValue('canceled');
      }
      return rejectWithValue(serializeApiError(err));
    }
  }
);

export const deleteMeetingNoteThunk = createAsyncThunk(
  'meetings/deleteNote',
  async ({ meetingUuid, noteId }: { meetingUuid: string; noteId: string }, { rejectWithValue, signal }) => {
    try {
      await deleteMeetingNote(meetingUuid, noteId, { signal });
      return noteId;
    } catch (err) {
      if (isRequestCanceled(err)) {
        return rejectWithValue('canceled');
      }
      return rejectWithValue(serializeApiError(err));
    }
  }
);
