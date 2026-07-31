import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import eventsReducer from '@/store/slices/eventsSlice';
import reportsReducer from '@/store/slices/reportsSlice';
import meetingsReducer from '@/store/slices/meetingsSlice';
import projectsReducer from '@/store/slices/projectsSlice';

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      events: eventsReducer,
      meetings: meetingsReducer,
      projects: projectsReducer,
      reports: reportsReducer,
    },
    devTools: process.env.NODE_ENV !== 'production',
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

let activeStore: AppStore | null = null;

export function setActiveStore(store: AppStore) {
  activeStore = store;
}

export function getActiveStore(): AppStore | null {
  return activeStore;
}
