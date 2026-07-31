import type { AxiosInstance } from 'axios';
import { ApiError } from '@/lib/api/http-client';

type FetchOptions = { signal?: AbortSignal };

/** Session-scoped singleton GET (stats, live-stream, meetings/all). */
export function createSingletonGet<TResponse, TParsed = TResponse>(config: {
  client: AxiosInstance;
  path: string;
  parse: (data: TResponse) => TParsed;
}): (options?: FetchOptions) => Promise<TParsed> {
  let inFlight: Promise<TParsed> | null = null;

  return async (options?: FetchOptions) => {
    if (inFlight) return inFlight;

    inFlight = config.client
      .get<TResponse>(config.path, { signal: options?.signal })
      .then(({ data }) => config.parse(data))
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  };
}

/** Keyed GET dedupe (e.g. per `meetingUuid`). */
export function createKeyedGet<TResponse, TParsed = TResponse>(config: {
  client: AxiosInstance;
  path: (key: string) => string;
  parse: (data: TResponse) => TParsed;
}): (key: string, options?: FetchOptions) => Promise<TParsed> {
  const inFlight = new Map<string, Promise<TParsed>>();

  return async (key: string, options?: FetchOptions) => {
    const existing = inFlight.get(key);
    if (existing) return existing;

    const request = config.client
      .get<TResponse>(config.path(key), { signal: options?.signal })
      .then(({ data }) => config.parse(data))
      .finally(() => {
        inFlight.delete(key);
      });

    inFlight.set(key, request);
    return request;
  };
}

export function assertArray<T>(data: unknown, message: string): T[] {
  if (!Array.isArray(data)) {
    throw new ApiError(message, 502);
  }
  return data as T[];
}
