// Gemini-format messages, mirrored from the backend.

export interface TextPart {
  text: string;
}
export interface FunctionCallPart {
  functionCall: { name: string; args: Record<string, unknown> };
  thoughtSignature?: string;
}
export interface FunctionResponsePart {
  functionResponse: { name: string; response: Record<string, unknown> };
}

export type Part = TextPart | FunctionCallPart | FunctionResponsePart;

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Part[];
}

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface CopilotTurnResponse {
  parts: Part[];
  finishReason: string;
}

// Chat-history entries for the UI (a flattened view of the message log).
export interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export function isTextPart(p: Part): p is TextPart {
  return typeof (p as TextPart).text === 'string';
}
export function isFunctionCallPart(p: Part): p is FunctionCallPart {
  return !!(p as FunctionCallPart).functionCall;
}
export function isFunctionResponsePart(p: Part): p is FunctionResponsePart {
  return !!(p as FunctionResponsePart).functionResponse;
}
