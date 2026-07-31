import { createSingletonGet } from '@/lib/api/core/deduped-get';
import { apiClient } from '@/lib/api/api-client';
import { ApiError } from '@/lib/api/http-client';
import type { ApiProject, ApiProjectsResponse } from '@/lib/api/types/projects';

function parseProjectsResponse(data: unknown): ApiProjectsResponse {
  if (!data || typeof data !== 'object' || !('projects' in data)) {
    throw new ApiError('Invalid projects response', 502);
  }
  const raw = data as { projects: ApiProject[]; roles?: string[] };
  const projects = (raw.projects ?? []).map((p) => ({ ...p, id: String(p.id) }));
  return { projects, roles: raw.roles ?? [] };
}

/** Browser domain: all projects via direct API (`GET /projects`). */
export const fetchProjects = createSingletonGet({
  client: apiClient,
  path: '/projects',
  parse: parseProjectsResponse,
});

