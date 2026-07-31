import { createAsyncThunk } from '@reduxjs/toolkit';
import { fetchAdvisorsReport, fetchMeetingsReport } from '@/lib/api/reports';

export const fetchAdvisorsReportThunk = createAsyncThunk(
  'reports/fetchAdvisorsReport',
  async (_, { signal }) => {
    return await fetchAdvisorsReport(signal);
  }
);

export const fetchMeetingsReportThunk = createAsyncThunk(
  'reports/fetchMeetingsReport',
  async (_, { signal }) => {
    return await fetchMeetingsReport(signal);
  }
);
