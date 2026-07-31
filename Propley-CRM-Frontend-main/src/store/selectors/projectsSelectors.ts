import type { RootState } from '@/store';

export const selectProjects = (state: RootState) => state.projects.list;
export const selectProjectsStatus = (state: RootState) => state.projects.status;
export const selectSelectedProjectId = (state: RootState) => state.projects.selectedProjectId;
export const selectSelectedProject = (state: RootState) => {
  const list = state.projects.list;
  const id = state.projects.selectedProjectId;
  return list.find((p) => p.id === id) || null;
};
