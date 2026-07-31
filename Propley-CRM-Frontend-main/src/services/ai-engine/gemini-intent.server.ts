import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';
import type { CommandArgs, CommandExecution } from '@/types/voice-agent';
import { ALLOWED_COMMAND_IDS, VOICE_COMMAND_CATALOG } from '@/services/ai-engine/command-catalog';
import { isPlaceholderClientName } from '@/services/ai-engine/voice-agent-flow';

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
export const VERTEX_MODEL = process.env.VERTEX_MODEL ?? 'gemini-2.5-flash';

// --- Vertex AI client (singleton) ---------------------------------------------
let _vertex: GoogleGenAI | null = null;
function loadVertexCredentials(): Record<string, unknown> | null {
  const raw = process.env.VERTEX_CREDENTIAL?.trim();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  try { return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); } catch {}
  if (fs.existsSync(raw)) {
    try { return JSON.parse(fs.readFileSync(raw, 'utf8')); } catch {}
  }
  return null;
}

export function getVertex(): GoogleGenAI | null {
  if (_vertex) return _vertex;
  const project = process.env.VERTEX_PROJECT?.trim();
  const location = process.env.VERTEX_LOCATION?.trim();
  const credentials = loadVertexCredentials();
  if (!project || !location || !credentials) return null;
  _vertex = new GoogleGenAI({
    vertexai: true,
    project,
    location,
    googleAuthOptions: { credentials },
  });
  return _vertex;
}

export function isVertexConfigured(): boolean {
  return Boolean(
    process.env.VERTEX_PROJECT &&
      process.env.VERTEX_LOCATION &&
      process.env.VERTEX_CREDENTIAL
  );
}

export interface GeminiIntentResult {
  commands: CommandExecution[];
  agentReply: string | null;
  rawModelText?: string;
}

interface GeminiCommandPayload {
  commandId: string;
  label?: string;
  args?: Record<string, unknown>;
}

interface GeminiJsonResponse {
  commands?: GeminiCommandPayload[];
  agentReply?: string | null;
}

function buildSystemPrompt(): string {
  const catalog = VOICE_COMMAND_CATALOG.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    aliases: c.aliases,
    args: c.args,
  }));

  return `You are the Propley Sales Portal voice command engine for a premium real estate CRM.

Terminology:
- "meeting" and "presentation" mean the same thing (scheduled sales presentation).
- "customer", "client", "lead", and "contact" mean CRM client records.
- Use Advisor/Consultant language in labels, not "user" or "agent".

Parse the user's spoken or typed request into one or more executable commands from this catalog only:
${JSON.stringify(catalog, null, 2)}

Rules:
1. Return ONLY valid JSON matching the schema below. No markdown.
2. commandId MUST be one of the catalog ids.
3. Split compound requests ("open meetings then filter completed") into multiple commands in order.
4. For schedule-presentation and add-customer, include all args you can extract; missing fields will be asked later.
5. For bare "create a new customer" or "create a new meeting", do NOT invent placeholder names — leave name/client empty.
6. navigate.path must be an exact route string from the catalog.
7. "Our client {name}", "client {name}", or "open client {name}" → search-customer with args.client = full name (e.g. "Our client Rahul Burma").
8. "Give me information about {name}", "tell me about {name}", "who is {name}" → client-info with args.client = name (NOT navigate-only).
9. "Add client {name}" → add-customer with args.name and args.client set to that full name (never skip the name).
10. Examples: "Open the presentations list" → navigate /meetings (no status arg). "Open the customer list" → /customers.
11. Status filters ALWAYS use filter-meetings, never navigate: "Show scheduled presentations" → filter-meetings status Scheduled; "Show completed meetings" → status Completed; "Show live meetings" → status Live.
12. "Tell me something about Rahul Verma", "give me more Rahul", "tell me info rahul", "tell me about Rahul", "okay tell me something about X" → client-info with args.client = name (partial first name OK — app disambiguates). NEVER use search-customer for these.
13. Hindi/Hinglish audio is translated to English before intents; still map client-info when user asks about a client in any phrasing.
14. If nothing matches, return empty commands and a helpful agentReply with 2-3 example phrases.

JSON schema:
{
  "commands": [
    { "commandId": "string", "label": "short human label", "args": { "key": "value" } }
  ],
  "agentReply": "string or null"
}`;
}

function normalizeArgs(raw: Record<string, unknown> | undefined): CommandArgs {
  if (!raw || typeof raw !== 'object') return {};
  const args: CommandArgs = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'boolean') {
      args[key] = value;
    } else if (typeof value === 'number') {
      args[key] = String(value);
    } else if (typeof value === 'string') {
      args[key] = value.trim();
    }
  }
  const name = (args.name ?? args.client ?? '').toString().trim();
  if (name && isPlaceholderClientName(name)) {
    delete args.name;
    delete args.client;
  }
  return args;
}

function toCommandExecutions(payloads: GeminiCommandPayload[]): CommandExecution[] {
  const queue: CommandExecution[] = [];
  for (const item of payloads) {
    const commandId = item.commandId?.trim();
    if (!commandId || !ALLOWED_COMMAND_IDS.has(commandId)) continue;
    queue.push({
      id: Math.random().toString(36).substring(2, 9),
      commandId,
      label: item.label?.trim() || commandId,
      status: 'pending',
      args: normalizeArgs(item.args),
    });
  }
  return queue;
}

function extractJson(text: string): GeminiJsonResponse | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as GeminiJsonResponse;
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) {
      try {
        return JSON.parse(fence[1].trim()) as GeminiJsonResponse;
      } catch {
        return null;
      }
    }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as GeminiJsonResponse;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildUserBlock(transcript: string, originalTranscript?: string): string {
  const original =
    originalTranscript?.trim() && originalTranscript.trim() !== transcript.trim()
      ? originalTranscript.trim()
      : null;
  return original
    ? `User request (English, normalized from Hindi/Hinglish):\n"""${transcript.trim()}"""\n\nOriginal utterance:\n"""${original}"""`
    : `User request:\n"""${transcript.trim()}"""`;
}

export async function parseTranscriptWithGemini(
  transcript: string,
  apiKey: string,
  originalTranscript?: string
): Promise<GeminiIntentResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: buildSystemPrompt(),
    generationConfig: {
      temperature: 0.15,
      responseMimeType: 'application/json',
    },
  });

  const userBlock = buildUserBlock(transcript, originalTranscript);
  const result = await model.generateContent(`${userBlock}\n\nRespond with JSON only.`);
  const rawModelText = result.response.text();
  const parsed = extractJson(rawModelText);
  if (!parsed) return { commands: [], agentReply: null, rawModelText };

  const commands = toCommandExecutions(parsed.commands ?? []);
  const agentReply =
    typeof parsed.agentReply === 'string' && parsed.agentReply.trim()
      ? parsed.agentReply.trim()
      : null;
  return { commands, agentReply, rawModelText };
}

/**
 * Vertex AI flavour of the intent parser. Uses the credentials the user
 * already has wired up in the backend (VERTEX_CREDENTIAL/PROJECT/LOCATION).
 * Returns the same shape as parseTranscriptWithGemini.
 */
export async function parseTranscriptWithVertex(
  transcript: string,
  originalTranscript?: string
): Promise<GeminiIntentResult> {
  const ai = getVertex();
  if (!ai) {
    throw new Error(
      'Vertex AI is not configured. Set VERTEX_CREDENTIAL, VERTEX_PROJECT, VERTEX_LOCATION in .env.local.'
    );
  }
  const userBlock = buildUserBlock(transcript, originalTranscript);
  const response = await ai.models.generateContent({
    model: VERTEX_MODEL,
    contents: [{ role: 'user', parts: [{ text: `${userBlock}\n\nRespond with JSON only.` }] }],
    config: {
      systemInstruction: buildSystemPrompt(),
      temperature: 0.15,
      responseMimeType: 'application/json',
    },
  });

  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  const rawModelText = parts
    .map((p) => (typeof (p as { text?: unknown }).text === 'string' ? (p as { text: string }).text : ''))
    .join('')
    .trim();

  const parsed = extractJson(rawModelText);
  if (!parsed) return { commands: [], agentReply: null, rawModelText };

  const commands = toCommandExecutions(parsed.commands ?? []);
  const agentReply =
    typeof parsed.agentReply === 'string' && parsed.agentReply.trim()
      ? parsed.agentReply.trim()
      : null;
  return { commands, agentReply, rawModelText };
}

// ---------------------------------------------------------------------------
// Slot-field extractor — used during slot-fill to extract one or more field
// values from a single utterance ("lodha, schedule it on 29 may at 10 pm").
// Tolerant of typos, multi-field utterances, and natural phrasing.
// ---------------------------------------------------------------------------

export interface SlotExtractRequest {
  commandId: string;
  missingFields: string[];
  filledArgs: Record<string, string | number | boolean | null | undefined>;
  text: string;
}

export type SlotTurnAction = 'fields' | 'cancel' | 'new_intent' | 'none';

export interface SlotExtractResult {
  /** What the user is actually doing this turn */
  action: SlotTurnAction;
  /** Populated when action === 'fields' — values to merge into args */
  fields: Record<string, string>;
  /** Populated when action === 'new_intent' — abort slot, dispatch */
  commands?: GeminiCommandPayload[];
  rawModelText?: string;
}

const SLOT_FIELD_HINTS: Record<string, string> = {
  project:
    'Development name. Recognise nicknames/short forms — e.g. "lodha" → "Lodha World Towers", "ivory" → "The Ivory Pavilion". Return the canonical full name when you can infer it from the DEVELOPMENTS list.',
  client: "Client's full name (e.g. 'Rahul Verma'). NOT an email or phone number.",
  email: 'A complete email address with @ and a TLD (e.g. rahul@gmail.com).',
  phone:
    'Phone number — keep digits, allow leading + for country code. Spoken digits ("nine eight seven six...") count as digits.',
  city: 'City name (e.g. Mumbai, Bengaluru).',
  date:
    'Date — normalise to one of: "today", "tomorrow", "next-week", "next-monday", or a literal date string the user said (e.g. "29 May", "May 29", "2026-05-29"). Be tolerant of typos like "tommrow", "tommorow", "tomorow".',
  time:
    'Time — normalise to 24-hour HH:MM. "10 pm" → "22:00", "3:30 PM" → "15:30", "10" → "10:00".',
  leadSource:
    'Where the client came from: referral, website, walk-in, Google, Instagram, etc.',
  name: "Client's full name (used by the add-customer flow).",
};

function buildSlotSystemPrompt(commandId: string, missingFields: string[]): string {
  const fieldDescriptions = missingFields
    .map((f) => `- ${f}: ${SLOT_FIELD_HINTS[f] ?? 'free-form value'}`)
    .join('\n');

  const developments =
    commandId === 'schedule-presentation'
      ? '\nCanonical developments (resolve nicknames against this list when possible): Lodha World Towers, The Ivory Pavilion, Skyview Estate, Prestige Lakeside Habitat, Raheja Artesia, DLF Camellias, Sobha Waterfront, Azure Marina, Stone Ridge Villas\n'
      : '';

  const catalog = VOICE_COMMAND_CATALOG.map((c) => `${c.id}: ${c.description}`).join('\n');

  return `You are the slot-fill turn handler for the Propley command "${commandId}".

The user is mid-flow and we are still waiting on these fields:
${fieldDescriptions}
${developments}
Decide which ONE of these the user's reply is doing:

(A) Answering the prompt — extract any field values they gave.
(B) Cancelling the flow with NO follow-up action — bare "cancel", "stop", "nevermind", "leave it", "forget it", "exit", "abort", "skip it".
(C) Switching to a different command — ANY actionable request like "go to dashboard", "open the customer list", "tell me about Rahul". This INCLUDES dismiss-then-act phrases like "leave it, go to dashboard" or "forget it open meetings": the new action implicitly abandons the current flow, so return new_intent (NOT cancel) with the new command.
(D) None of the above — gibberish or unrelated remark.

Priority: if the reply contains BOTH a dismissal AND an actionable command, choose (C) new_intent. Only choose (B) cancel when there is no follow-on action.

Valid catalog of commands you may emit in case (C):
${catalog}

Output STRICT JSON only — no markdown, no commentary:
{
  "action": "fields" | "cancel" | "new_intent" | "none",
  "fields"?: { "<fieldName>": "<value>", ... },
  "commands"?: [ { "commandId": "<catalogId>", "label": "<short label>", "args": { ... } } ],
  "reasoning"?: "one short sentence"
}

Strict rules:
1. Pick exactly one action.
2. For "fields": only include fields you confidently extracted; normalise per hints above; ignore everything else.
3. For "new_intent": include at least one command from the catalog with appropriate args. Do NOT use this for cases A or B.
4. For "cancel": no fields, no commands.
5. Tolerate typos heavily ("tommrow", "shedule", "lodha world towers" with caps inconsistency).
6. Never invent slot values not present in the user's text.
7. A SINGLE utterance can encode multiple field answers — extract them all.
8. Ignore conversational filler, hedging and self-talk ("you can", "maybe", "maybe not", "I think", "let's say", "actually", "okay so", "um", "like"). If the user states a concrete value ANYWHERE in the reply, extract it — e.g. "you can schedule it for tomorrow 6 PM, maybe not" → date "tomorrow", time "18:00". Only treat it as a retraction/cancel if they EXPLICITLY say to cancel or "no, not <value>".
9. Day-parts: combine them with any clock time given. "tomorrow 6 PM evening" → date "tomorrow", time "18:00". When only a day-part is given, use morning→09:00, afternoon→14:00, evening→18:00, night→20:00. An explicit clock time always wins over the day-part word.
10. The user may volunteer info for a field that is NOT in the missing list (e.g. a city, or chit-chat, when only date/time remain). Extract only the missing fields and ignore the rest — do NOT return "none" just because some extra info was unused.`;
}

interface SlotJsonResponse {
  action?: string;
  fields?: Record<string, unknown>;
  commands?: GeminiCommandPayload[];
}

export async function parseSlotFieldsWithVertex(
  req: SlotExtractRequest
): Promise<SlotExtractResult> {
  const ai = getVertex();
  if (!ai) throw new Error('Vertex AI is not configured.');
  if (!req.missingFields.length) return { action: 'none', fields: {} };

  const userBlock = `Current filled args: ${JSON.stringify(req.filledArgs)}\nMissing fields (extract these if present): ${req.missingFields.join(', ')}\n\nUser said:\n"""${req.text.trim()}"""\n\nReturn JSON only.`;

  const response = await ai.models.generateContent({
    model: VERTEX_MODEL,
    contents: [{ role: 'user', parts: [{ text: userBlock }] }],
    config: {
      systemInstruction: buildSlotSystemPrompt(req.commandId, req.missingFields),
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  });

  const parts2 = response?.candidates?.[0]?.content?.parts ?? [];
  const rawModelText2 = parts2
    .map((p) => (typeof (p as { text?: unknown }).text === 'string' ? (p as { text: string }).text : ''))
    .join('')
    .trim();

  let parsed2: SlotJsonResponse | null = null;
  try {
    parsed2 = JSON.parse(rawModelText2) as SlotJsonResponse;
  } catch {
    const fence = rawModelText2.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) {
      try { parsed2 = JSON.parse(fence[1].trim()) as SlotJsonResponse; } catch {}
    }
    if (!parsed2) {
      const s = rawModelText2.indexOf('{');
      const e = rawModelText2.lastIndexOf('}');
      if (s >= 0 && e > s) {
        try { parsed2 = JSON.parse(rawModelText2.slice(s, e + 1)) as SlotJsonResponse; } catch {}
      }
    }
  }

  if (!parsed2) {
    return { action: 'none', fields: {}, rawModelText: rawModelText2 };
  }

  const action = ((): SlotTurnAction => {
    const a = String(parsed2.action ?? '').toLowerCase();
    if (a === 'cancel') return 'cancel';
    if (a === 'new_intent' || a === 'new-intent' || a === 'newintent') return 'new_intent';
    if (a === 'fields') return 'fields';
    if (a === 'none') return 'none';
    // Tolerate models that just return fields without action — treat as 'fields'.
    if (parsed2.fields && typeof parsed2.fields === 'object' && Object.keys(parsed2.fields).length > 0) {
      return 'fields';
    }
    if (parsed2.commands && Array.isArray(parsed2.commands) && parsed2.commands.length > 0) {
      return 'new_intent';
    }
    return 'none';
  })();

  const cleaned: Record<string, string> = {};
  if (action === 'fields' && parsed2.fields && typeof parsed2.fields === 'object') {
    for (const f of req.missingFields) {
      const v = parsed2.fields[f];
      if (v === null || v === undefined) continue;
      const str = String(v).trim();
      if (!str) continue;
      cleaned[f] = str;
    }
  }

  return {
    action,
    fields: cleaned,
    commands: action === 'new_intent' ? parsed2.commands : undefined,
    rawModelText: rawModelText2,
  };
}
