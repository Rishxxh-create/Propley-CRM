import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAdvisorsReportThunk, fetchMeetingsReportThunk } from '@/store/slices/reportsThunks';
import {
  selectAdvisorsReport,
  selectAdvisorsReportStatus,
  selectMeetingsReport,
  selectMeetingsReportStatus,
} from '@/store/selectors/reportsSelectors';

export function useAdvisorsReport() {
  const dispatch = useAppDispatch();
  const report = useAppSelector(selectAdvisorsReport);
  const status = useAppSelector(selectAdvisorsReportStatus);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchAdvisorsReportThunk());
    }
  }, [status, dispatch]);

  return {
    report,
    loading: status === 'loading' || status === 'idle',
    error: status === 'failed',
  };
}

export function useMeetingsReport() {
  const dispatch = useAppDispatch();
  const report = useAppSelector(selectMeetingsReport);
  const status = useAppSelector(selectMeetingsReportStatus);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchMeetingsReportThunk());
    }
  }, [status, dispatch]);

  return {
    report,
    loading: status === 'loading' || status === 'idle',
    error: status === 'failed',
  };
}
