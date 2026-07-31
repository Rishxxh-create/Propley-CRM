import { createAsyncThunk } from '@reduxjs/toolkit';
import { fetchProjects } from '@/lib/api/projects';
import type { ApiProjectsResponse } from '@/lib/api/types/projects';
import type { RootState } from '@/store';
import { setSelectedProject } from './projectsSlice';

export const fetchProjectsThunk = createAsyncThunk<
  ApiProjectsResponse,
  void,
  { state: RootState }
>('projects/fetchProjects', async (_, { getState, signal, dispatch }) => {
  const response = await fetchProjects({ signal });
  
  // Set default selected project if none is selected and projects are available
  const state = getState();
  if (!state.projects.selectedProjectId && response.projects.length > 0) {
    dispatch(setSelectedProject(response.projects[0].id));
  }
  
  return response;
}, {
  condition: (_, { getState }) => {
    const { status } = getState().projects;
    return status === 'idle' || status === 'error';
  },
});
