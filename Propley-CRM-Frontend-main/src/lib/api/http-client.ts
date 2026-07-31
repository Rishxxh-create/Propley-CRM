import axios, { type AxiosInstance, type CreateAxiosDefaults } from "axios";

const DEFAULT_TIMEOUT_MS = 10_000;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

export type ApiErrorPayload = {
  message?: string;
  error?: string;
  [key: string]: unknown;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: ApiErrorPayload,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getApiErrorPayload(value: unknown): ApiErrorPayload | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return value as ApiErrorPayload;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const payload = getApiErrorPayload(error.response?.data);
    const status = error.response?.status ?? 0;
    const fallback =
      status > 0 ? `Request failed (${status})` : "Network request failed";
    const message =
      payload?.message ?? payload?.error ?? error.message ?? fallback;
    return new ApiError(message, status, payload);
  }

  const message =
    error instanceof Error ? error.message : "Unknown request error";
  return new ApiError(message, 0);
}

export function serializeApiError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

export function createHttpClient(
  config: CreateAxiosDefaults = {},
): AxiosInstance {
  const client = axios.create({
    timeout: DEFAULT_TIMEOUT_MS,
    headers: {
      Accept: "application/json",
      ...(config.headers ?? {}),
    },
    ...config,
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (axios.isCancel(error)) {
        return Promise.reject(error);
      }
      return Promise.reject(toApiError(error));
    },
  );

  return client;
}

export type RetryOptions = {
  attempts?: number;
  initialDelayMs?: number;
  /** Max random ms added per backoff step (thundering-herd mitigation). */
  jitterMs?: number;
  shouldRetry?: (error: ApiError, attemptNumber: number) => boolean;
};

/** True when the request was aborted (navigation, debounced search, unmount). */
export function isRequestCanceled(error: unknown): boolean {
  return axios.isCancel(error);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 2);
  const initialDelayMs = Math.max(0, options.initialDelayMs ?? 200);
  const shouldRetry =
    options.shouldRetry ??
    ((error: ApiError) =>
      error.status === 0 || RETRYABLE_STATUS_CODES.has(error.status));

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const apiError = toApiError(error);
      const isLastAttempt = attempt >= attempts;
      if (isLastAttempt || !shouldRetry(apiError, attempt)) {
        throw apiError;
      }

      const jitter =
        options.jitterMs && options.jitterMs > 0
          ? Math.random() * options.jitterMs
          : 0;
      await wait(initialDelayMs * 2 ** (attempt - 1) + jitter);
    }
  }

  throw new ApiError("Request failed after retry attempts", 0);
}
