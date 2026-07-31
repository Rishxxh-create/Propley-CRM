import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import { fetchEventStats, fetchFunnelStats, fetchLeadSourceStats, fetchCityStats, fetchLiveStream } from '@/lib/api/events';
import { isRequestCanceled, serializeApiError } from '@/lib/api/http-client';
import {
  selectEventStatsStatus,
  selectFunnelStatus,
  selectLeadSourceStatus,
  selectCityStatus,
  selectLiveStreamStatus,
} from '@/store/selectors/eventsSelectors';

export const fetchEventStatsThunk = createAsyncThunk(
  'events/fetchStats',
  async (_, { rejectWithValue, signal }) => {
    try {
      return await fetchEventStats({ signal });
    } catch (err) {
      if (isRequestCanceled(err)) {
        return rejectWithValue('canceled');
      }
      return rejectWithValue(serializeApiError(err));
    }
  },
  {
    condition: (_, { getState }) => {
      const status = selectEventStatsStatus(getState() as RootState);
      return status === 'idle' || status === 'error';
    },
  },
);

export const fetchFunnelStatsThunk = createAsyncThunk(
  'events/fetchFunnelStats',
  async (_, { rejectWithValue, signal }) => {
    try {
      return await fetchFunnelStats({ signal });
    } catch (err) {
      if (isRequestCanceled(err)) {
        return rejectWithValue('canceled');
      }
      return rejectWithValue(serializeApiError(err));
    }
  },
  {
    condition: (_, { getState }) => {
      const status = selectFunnelStatus(getState() as RootState);
      return status === 'idle' || status === 'error';
    },
  },
);

export const fetchLeadSourceStatsThunk = createAsyncThunk(
  'events/fetchLeadSourceStats',
  async (_, { rejectWithValue, signal }) => {
    try {
      return await fetchLeadSourceStats({ signal });
    } catch (err) {
      if (isRequestCanceled(err)) {
        return rejectWithValue('canceled');
      }
      return rejectWithValue(serializeApiError(err));
    }
  },
  {
    condition: (_, { getState }) => {
      const status = selectLeadSourceStatus(getState() as RootState);
      return status === 'idle' || status === 'error';
    },
  },
);

export const fetchCityStatsThunk = createAsyncThunk(
  'events/fetchCityStats',
  async (_, { rejectWithValue, signal }) => {
    try {
      return await fetchCityStats({ signal });
    } catch (err) {
      if (isRequestCanceled(err)) {
        return rejectWithValue('canceled');
      }
      return rejectWithValue(serializeApiError(err));
    }
  },
  {
    condition: (_, { getState }) => {
      const status = selectCityStatus(getState() as RootState);
      return status === 'idle' || status === 'error';
    },
  },
);

export const fetchLiveStreamThunk = createAsyncThunk(
  'events/fetchLiveStream',
  async (_, { rejectWithValue, signal }) => {
    try {
      return await fetchLiveStream({ signal });
    } catch (err) {
      if (isRequestCanceled(err)) {
        return rejectWithValue('canceled');
      }
      return rejectWithValue(serializeApiError(err));
    }
  },
  {
    condition: (_, { getState }) => {
      const status = selectLiveStreamStatus(getState() as RootState);
      return status === 'idle' || status === 'error';
    },
  },
);
