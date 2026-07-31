import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchMeetingActivityThunk,
  fetchMeetingsAllThunk,
} from '@/store/slices/meetingsThunks';
import {
  selectMeetingActivity,
  selectMeetingActivityStatus,
  selectMeetingActivityUuid,
  selectMeetingsList,
  selectMeetingsListStatus,
} from '@/store/selectors/meetingsSelectors';

/** Fetch all meetings once per session (deduped in thunk + axios layer). */
export function useLoadMeetings() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(fetchMeetingsAllThunk());
  }, [dispatch]);
}

export function useMeetings() {
  const list = useAppSelector(selectMeetingsList);
  const status = useAppSelector(selectMeetingsListStatus);
  const loading = status === 'idle' || status === 'loading';
  return { list, status, loading };
}

export function useLoadMeetingActivity(meetingUuid: string | undefined) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!meetingUuid) return;
    void dispatch(fetchMeetingActivityThunk(meetingUuid));
  }, [dispatch, meetingUuid]);
}

export function useMeetingActivity(meetingUuid: string | undefined) {
  const events = useAppSelector(selectMeetingActivity);
  const status = useAppSelector(selectMeetingActivityStatus);
  const loadedUuid = useAppSelector(selectMeetingActivityUuid);

  const loading = status === 'idle' || status === 'loading';
  const ready = status === 'loaded' && loadedUuid === meetingUuid;

  const items = useMemo(
    () => (ready && meetingUuid ? events : []),
    [ready, meetingUuid, events],
  );

  return { events: items, status, loading: loading && !!meetingUuid };
}

/** API list when loaded; no local storage fallback for meetings. */
export function usePresentationsList() {
  const { list, loading } = useMeetings();

  return useMemo(() => {
    return { list, loading };
  }, [list, loading]);
}
