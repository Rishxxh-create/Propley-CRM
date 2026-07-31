export type MandakeAnalyticsEvent = {
  type: string;
  slide?: string;
  [key: string]: unknown;
};

export type MandakeAnalyticsPayload = {
  source: "mandake";
  event: MandakeAnalyticsEvent;
  [key: string]: unknown;
};

export type MandakeAnalyticsLogEntry = {
  id: string;
  receivedAt: number;
  ignored: boolean;
  type: string | null;
  slide: string | null;
  payload: unknown;
};

export function isMandakeMessage(data: unknown): data is MandakeAnalyticsPayload {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  const event = record.event;
  return (
    record.source === "mandake" &&
    !!event &&
    typeof event === "object" &&
    typeof (event as MandakeAnalyticsEvent).type === "string"
  );
}

export function normalizeBaseUrl(url: string): string {
  return String(url || "").replace(/\/+$/, "");
}

export function formatLogTime(ts: number): string {
  const d = new Date(ts);
  return `${d.toLocaleTimeString()}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}
