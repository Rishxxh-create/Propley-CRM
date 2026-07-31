import { createSlice } from '@reduxjs/toolkit';
import type { EventStatsResponse, FunnelStatsResponse, LeadSourceStatsResponse, CityStatsResponse } from '@/lib/api/types/events';
import type { LiveStreamResponse } from '@/lib/api/types/events';
import { fetchEventStatsThunk, fetchFunnelStatsThunk, fetchLeadSourceStatsThunk, fetchCityStatsThunk, fetchLiveStreamThunk } from '@/store/slices/eventsThunks';

export type EventStatsStatus = 'idle' | 'loading' | 'loaded' | 'error';

export type EventsState = {
  stats: EventStatsResponse | null;
  status: EventStatsStatus;
  funnelStats: FunnelStatsResponse | null;
  funnelStatus: EventStatsStatus;
  leadSourceStats: LeadSourceStatsResponse | null;
  leadSourceStatus: EventStatsStatus;
  cityStats: CityStatsResponse | null;
  cityStatus: EventStatsStatus;
  liveStream: LiveStreamResponse | null;
  liveStreamStatus: EventStatsStatus;
};

const initialState: EventsState = {
  stats: null,
  status: 'idle',
  funnelStats: null,
  funnelStatus: 'idle',
  leadSourceStats: null,
  leadSourceStatus: 'idle',
  cityStats: null,
  cityStatus: 'idle',
  liveStream: null,
  liveStreamStatus: 'idle',
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    clearEventStats(state) {
      state.stats = null;
      state.status = 'idle';
      state.funnelStats = null;
      state.funnelStatus = 'idle';
      state.leadSourceStats = null;
      state.leadSourceStatus = 'idle';
      state.cityStats = null;
      state.cityStatus = 'idle';
      state.liveStream = null;
      state.liveStreamStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEventStatsThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchEventStatsThunk.fulfilled, (state, action) => {
        state.stats = action.payload;
        state.status = 'loaded';
      })
      .addCase(fetchEventStatsThunk.rejected, (state, action) => {
        if (action.payload === 'canceled') return;
        state.status = 'error';
      })
      .addCase(fetchFunnelStatsThunk.pending, (state) => {
        state.funnelStatus = 'loading';
      })
      .addCase(fetchFunnelStatsThunk.fulfilled, (state, action) => {
        state.funnelStats = action.payload;
        state.funnelStatus = 'loaded';
      })
      .addCase(fetchFunnelStatsThunk.rejected, (state, action) => {
        if (action.payload === 'canceled') return;
        state.funnelStatus = 'error';
      })
      .addCase(fetchLeadSourceStatsThunk.pending, (state) => {
        state.leadSourceStatus = 'loading';
      })
      .addCase(fetchLeadSourceStatsThunk.fulfilled, (state, action) => {
        state.leadSourceStats = action.payload;
        state.leadSourceStatus = 'loaded';
      })
      .addCase(fetchLeadSourceStatsThunk.rejected, (state, action) => {
        if (action.payload === 'canceled') return;
        state.leadSourceStatus = 'error';
      })
      .addCase(fetchCityStatsThunk.pending, (state) => {
        state.cityStatus = 'loading';
      })
      .addCase(fetchCityStatsThunk.fulfilled, (state, action) => {
        state.cityStats = action.payload;
        state.cityStatus = 'loaded';
      })
      .addCase(fetchCityStatsThunk.rejected, (state, action) => {
        if (action.payload === 'canceled') return;
        state.cityStatus = 'error';
      })
      .addCase(fetchLiveStreamThunk.pending, (state) => {
        state.liveStreamStatus = 'loading';
      })
      .addCase(fetchLiveStreamThunk.fulfilled, (state, action) => {
        state.liveStream = action.payload;
        state.liveStreamStatus = 'loaded';
      })
      .addCase(fetchLiveStreamThunk.rejected, (state, action) => {
        if (action.payload === 'canceled') return;
        state.liveStreamStatus = 'error';
      });
  },
});

export const { clearEventStats } = eventsSlice.actions;
export default eventsSlice.reducer;
