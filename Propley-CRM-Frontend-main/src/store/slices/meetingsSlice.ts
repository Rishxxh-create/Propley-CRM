import { createSlice } from '@reduxjs/toolkit';
import type { MeetingActivityEvent } from '@/lib/api/types/events';
import type { StoredMeeting } from '@/lib/mock-data';
import {
  fetchMeetingActivityThunk,
  fetchMeetingsAllThunk,
  fetchSchedulesThunk,
  fetchMeetingThunk,
  fetchMeetingNotesThunk,
  createMeetingNoteThunk,
  updateMeetingNoteThunk,
  deleteMeetingNoteThunk,
} from '@/store/slices/meetingsThunks';
import type { StoredNote } from '@/lib/api/types/notes';

function mergeSchedulesIntoList(list: StoredMeeting[], schedules: StoredMeeting[]): StoredMeeting[] {
  const byUuid = new Map(list.map((m) => [m.uuid, m]));
  for (const s of schedules) {
    if (s.uuid) byUuid.set(s.uuid, s);
  }
  return Array.from(byUuid.values());
}

export type MeetingsLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export type MeetingsState = {
  list: StoredMeeting[];
  listStatus: MeetingsLoadStatus;
  activityUuid: string | null;
  activity: MeetingActivityEvent[];
  activityStatus: MeetingsLoadStatus;
  currentMeeting: StoredMeeting | null;
  currentMeetingStatus: MeetingsLoadStatus;
  notes: StoredNote[];
  notesStatus: MeetingsLoadStatus;
};

const initialState: MeetingsState = {
  list: [],
  listStatus: 'idle',
  activityUuid: null,
  activity: [],
  activityStatus: 'idle',
  currentMeeting: null,
  currentMeetingStatus: 'idle',
  notes: [],
  notesStatus: 'idle',
};

const meetingsSlice = createSlice({
  name: 'meetings',
  initialState,
  reducers: {
    clearMeetings(state) {
      state.list = [];
      state.listStatus = 'idle';
      state.activityUuid = null;
      state.activity = [];
      state.activityStatus = 'idle';
      state.currentMeeting = null;
      state.currentMeetingStatus = 'idle';
      state.notes = [];
      state.notesStatus = 'idle';
    },
    clearMeetingActivity(state) {
      state.activityUuid = null;
      state.activity = [];
      state.activityStatus = 'idle';
    },
    clearCurrentMeeting(state) {
      state.currentMeeting = null;
      state.currentMeetingStatus = 'idle';
      state.notes = [];
      state.notesStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMeetingsAllThunk.pending, (state, action) => {
        const force =
          action.meta.arg &&
          typeof action.meta.arg === 'object' &&
          'force' in action.meta.arg &&
          action.meta.arg.force;
        if (!force || state.listStatus !== 'loaded') {
          state.listStatus = 'loading';
        }
      })
      .addCase(fetchMeetingsAllThunk.fulfilled, (state, action) => {
        state.list = action.payload;
        state.listStatus = 'loaded';
      })
      .addCase(fetchMeetingsAllThunk.rejected, (state, action) => {
        if (action.payload === 'canceled') return;
        state.listStatus = 'error';
      })
      .addCase(fetchSchedulesThunk.fulfilled, (state, action) => {
        state.list = mergeSchedulesIntoList(state.list, action.payload);
        if (state.listStatus === 'idle') state.listStatus = 'loaded';
      })
      .addCase(fetchMeetingActivityThunk.pending, (state, action) => {
        state.activityUuid = action.meta.arg;
        state.activityStatus = 'loading';
      })
      .addCase(fetchMeetingActivityThunk.fulfilled, (state, action) => {
        state.activityUuid = action.payload.meetingUuid;
        state.activity = action.payload.events;
        state.activityStatus = 'loaded';
      })
      .addCase(fetchMeetingActivityThunk.rejected, (state, action) => {
        if (action.payload === 'canceled') return;
        state.activityStatus = 'error';
      })
      .addCase(fetchMeetingThunk.pending, (state) => {
        state.currentMeetingStatus = 'loading';
      })
      .addCase(fetchMeetingThunk.fulfilled, (state, action) => {
        state.currentMeeting = action.payload;
        state.currentMeetingStatus = 'loaded';
      })
      .addCase(fetchMeetingThunk.rejected, (state, action) => {
        if (action.payload === 'canceled') return;
        state.currentMeetingStatus = 'error';
      })
      .addCase(fetchMeetingNotesThunk.pending, (state) => {
        state.notesStatus = 'loading';
      })
      .addCase(fetchMeetingNotesThunk.fulfilled, (state, action) => {
        state.notes = action.payload;
        state.notesStatus = 'loaded';
      })
      .addCase(fetchMeetingNotesThunk.rejected, (state, action) => {
        if (action.payload === 'canceled') return;
        state.notesStatus = 'error';
      })
      .addCase(createMeetingNoteThunk.fulfilled, (state, action) => {
        if (!state.notes) state.notes = [];
        state.notes.push(action.payload);
      })
      .addCase(updateMeetingNoteThunk.fulfilled, (state, action) => {
        if (!state.notes) state.notes = [];
        const index = state.notes.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) {
          state.notes[index] = action.payload;
        }
      })
      .addCase(deleteMeetingNoteThunk.fulfilled, (state, action) => {
        if (!state.notes) state.notes = [];
        state.notes = state.notes.filter((n) => n.id !== action.payload);
      });
  },
});

export const { clearMeetings, clearMeetingActivity, clearCurrentMeeting } = meetingsSlice.actions;
export default meetingsSlice.reducer;
