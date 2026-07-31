import type { RootState } from '@/store';

export const selectMeetingsList = (state: RootState) => state.meetings.list;
export const selectMeetingsListStatus = (state: RootState) => state.meetings.listStatus;
export const selectMeetingActivity = (state: RootState) => state.meetings.activity;
export const selectMeetingActivityStatus = (state: RootState) => state.meetings.activityStatus;
export const selectMeetingActivityUuid = (state: RootState) => state.meetings.activityUuid;
export const selectCurrentMeeting = (state: RootState) => state.meetings.currentMeeting;
export const selectCurrentMeetingStatus = (state: RootState) => state.meetings.currentMeetingStatus;
export const selectMeetingNotesStatus = (state: RootState) => state.meetings.notesStatus;
