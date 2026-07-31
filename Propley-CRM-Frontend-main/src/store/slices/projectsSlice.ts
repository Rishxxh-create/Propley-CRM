import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ApiProject } from '@/lib/api/types/projects';
import { fetchProjectsThunk } from './projectsThunks';

interface ProjectsState {
  list: ApiProject[];
  roles: string[];
  status: 'idle' | 'loading' | 'loaded' | 'error';
  selectedProjectId: string | null;
}

const initialState: ProjectsState = {
  list: [],
  roles: [],
  status: 'idle',
  selectedProjectId: null,
};

export const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setSelectedProject: (state, action: PayloadAction<string>) => {
      state.selectedProjectId = action.payload;
    },
    clearProjects: (state) => {
      state.list = [];
      state.roles = [];
      state.status = 'idle';
      state.selectedProjectId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjectsThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProjectsThunk.fulfilled, (state, action) => {
        state.status = 'loaded';
        state.list = action.payload.projects;
        state.roles = action.payload.roles;
      })
      .addCase(fetchProjectsThunk.rejected, (state) => {
        state.status = 'error';
      });
  },
});

export const { setSelectedProject, clearProjects } = projectsSlice.actions;
export default projectsSlice.reducer;
