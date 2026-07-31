import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchEventStatsThunk, fetchFunnelStatsThunk, fetchLeadSourceStatsThunk, fetchCityStatsThunk, fetchLiveStreamThunk } from '@/store/slices/eventsThunks';
import { clearEventStats } from '@/store/slices/eventsSlice';
import {
  selectEventStats,
  selectEventStatsStatus,
  selectFunnelStats,
  selectFunnelStatus,
  selectLeadSourceStats,
  selectLeadSourceStatus,
  selectCityStats,
  selectCityStatus,
  selectLiveStream,
  selectLiveStreamStatus,
} from '@/store/selectors/eventsSelectors';

/** Fetch event stats once per session (deduped in thunk + axios layer). */
export function useLoadEventStats() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(clearEventStats());
    void dispatch(fetchEventStatsThunk());
    void dispatch(fetchFunnelStatsThunk());
    void dispatch(fetchLeadSourceStatsThunk());
    void dispatch(fetchCityStatsThunk());
  }, [dispatch]);
}

export function useEventStats() {
  const stats = useAppSelector(selectEventStats);
  const status = useAppSelector(selectEventStatsStatus);
  const loading = status === 'idle' || status === 'loading';
  return { stats, status, loading };
}

export function useFunnelStats() {
  const stats = useAppSelector(selectFunnelStats);
  const status = useAppSelector(selectFunnelStatus);
  const loading = status === 'idle' || status === 'loading';
  return { stats, status, loading };
}

export function useLeadSourceStats() {
  const stats = useAppSelector(selectLeadSourceStats);
  const status = useAppSelector(selectLeadSourceStatus);
  const loading = status === 'idle' || status === 'loading';
  return { stats, status, loading };
}

export function useCityStats() {
  const stats = useAppSelector(selectCityStats);
  const status = useAppSelector(selectCityStatus);
  const loading = status === 'idle' || status === 'loading';
  return { stats, status, loading };
}

/** Fetch live activity stream once per session (deduped in thunk + axios layer). */
export function useLoadLiveStream() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(fetchLiveStreamThunk());
  }, [dispatch]);
}

export function useLiveStream() {
  const events = useAppSelector(selectLiveStream);
  const status = useAppSelector(selectLiveStreamStatus);
  const loading = status === 'idle' || status === 'loading';
  return { events: events ?? [], status, loading };
}
