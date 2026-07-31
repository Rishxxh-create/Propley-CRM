import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '@/lib/api/types/auth';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export type AuthState = {
  user: AuthUser | null;
  status: AuthStatus;
};

const initialState: AuthState = {
  user: null,
  status: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthLoading(state) {
      state.status = 'loading';
    },
    setAuthUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      state.status = 'authenticated';
    },
    clearAuthUser(state) {
      state.user = null;
      state.status = 'unauthenticated';
    },
    setAuthIdle(state) {
      state.status = 'idle';
    },
  },
});

export const { setAuthLoading, setAuthUser, clearAuthUser, setAuthIdle } = authSlice.actions;
export default authSlice.reducer;
