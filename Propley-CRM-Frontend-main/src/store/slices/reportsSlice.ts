import { createSlice } from '@reduxjs/toolkit';
import type { AdvisorReportResponse, MeetingsReportResponse } from '@/lib/api/types/reports';
import { fetchAdvisorsReportThunk, fetchMeetingsReportThunk } from '@/store/slices/reportsThunks';

interface ReportsState {
  advisorsReport: AdvisorReportResponse | null;
  advisorsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  advisorsError: string | null;
  
  meetingsReport: MeetingsReportResponse | null;
  meetingsStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  meetingsError: string | null;
}

const initialState: ReportsState = {
  advisorsReport: null,
  advisorsStatus: 'idle',
  advisorsError: null,
  
  meetingsReport: null,
  meetingsStatus: 'idle',
  meetingsError: null,
};

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdvisorsReportThunk.pending, (state) => {
        state.advisorsStatus = 'loading';
      })
      .addCase(fetchAdvisorsReportThunk.fulfilled, (state, action) => {
        state.advisorsStatus = 'succeeded';
        state.advisorsReport = action.payload;
      })
      .addCase(fetchAdvisorsReportThunk.rejected, (state, action) => {
        state.advisorsStatus = 'failed';
        state.advisorsError = action.error.message || 'Failed to fetch advisors report';
      })
      .addCase(fetchMeetingsReportThunk.pending, (state) => {
        state.meetingsStatus = 'loading';
      })
      .addCase(fetchMeetingsReportThunk.fulfilled, (state, action) => {
        state.meetingsStatus = 'succeeded';
        state.meetingsReport = action.payload;
      })
      .addCase(fetchMeetingsReportThunk.rejected, (state, action) => {
        state.meetingsStatus = 'failed';
        state.meetingsError = action.error.message || 'Failed to fetch meetings report';
      });
  },
});

export default reportsSlice.reducer;
