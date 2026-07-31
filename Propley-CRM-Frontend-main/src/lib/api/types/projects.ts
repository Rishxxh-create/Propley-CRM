export interface ApiProject {
  id: string;
  name: string;
  slides: string[];
  city: string | null;
  status: string;
}

export interface ApiProjectsResponse {
  projects: ApiProject[];
  roles: string[];
}
