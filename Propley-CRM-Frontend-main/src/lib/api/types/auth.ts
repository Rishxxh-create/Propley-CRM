export type AuthUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  project_ids: string[];
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginSuccessResponse = {
  status: 'success';
  token: string;
  user: AuthUser;
};

export type LoginErrorResponse = {
  status?: 'error';
  message?: string;
  error?: string;
};

export type SessionSuccessResponse = {
  status: 'success';
  user: AuthUser;
};

export type SessionErrorResponse = {
  status: 'unauthenticated';
};
