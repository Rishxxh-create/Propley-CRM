import { getBackendBaseUrl } from "@/lib/api/config";
import { ApiError, createHttpClient } from "@/lib/api/http-client";
import type {
  LoginErrorResponse,
  LoginRequest,
  LoginSuccessResponse,
} from "@/lib/api/types/auth";

const backendClient = createHttpClient({
  baseURL: getBackendBaseUrl(),
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
  },
});

export { ApiError };

/** Server-only: Route Handlers → `NEXT_BACKEND_URL`. */
export async function loginWithBackend(
  credentials: LoginRequest,
): Promise<LoginSuccessResponse> {
  const data = (
    await backendClient.post<LoginSuccessResponse | LoginErrorResponse>(
      "/auth/login",
      credentials,
    )
  ).data;

  if (data.status !== "success" || !("token" in data) || !("user" in data)) {
    throw new ApiError("Invalid login response", 502);
  }

  return data as LoginSuccessResponse;
}
