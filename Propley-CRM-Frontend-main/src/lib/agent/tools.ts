import { ToolDeclaration } from './types';

export const MEETING_FIELDS = [
  'project',
  'customerName',
  'customerEmail',
  'customerPhone',
  'customerCity',
] as const;
export type MeetingFieldName = (typeof MEETING_FIELDS)[number];

export const TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: 'openNewMeetingDrawer',
    description:
      'Open the New Meeting drawer so the consultant can see fields being filled. Call this first when scheduling.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'closeNewMeetingDrawer',
    description: 'Close the New Meeting drawer without submitting.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'setMeetingField',
    description:
      'Set a single text field on the meeting draft. Use this for name, email, phone, city, and project.',
    parameters: {
      type: 'object',
      properties: {
        field: {
          type: 'string',
          enum: [...MEETING_FIELDS],
          description: 'Which field to set.',
        },
        value: { type: 'string', description: 'The new value (plain text).' },
      },
      required: ['field', 'value'],
    },
  },
  {
    name: 'setMeetingDate',
    description: 'Set the session date. Use ISO format YYYY-MM-DD.',
    parameters: {
      type: 'object',
      properties: {
        iso: {
          type: 'string',
          description: 'ISO date: YYYY-MM-DD (e.g. 2026-06-03).',
        },
      },
      required: ['iso'],
    },
  },
  {
    name: 'setMeetingTime',
    description: 'Set the preferred time. 24-hour format HH:MM.',
    parameters: {
      type: 'object',
      properties: {
        hhmm: {
          type: 'string',
          description: '24-hour time HH:MM (e.g. 15:30).',
        },
      },
      required: ['hhmm'],
    },
  },
  {
    name: 'getMeetingDraft',
    description: 'Read the current meeting-draft state. Call this if you need to re-orient.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'getMeetingDraftStatus',
    description:
      'Check whether the draft has every required field. Returns ready=true and missing=[] when submittable.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'lookupCustomer',
    description:
      'Search prior customers by email or phone (server-side). Returns a match or null. Customers are NEVER identified by name.',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Client email address.' },
        phone: { type: 'string', description: 'Client phone number.' },
      },
    },
  },
  {
    name: 'submitMeeting',
    description:
      'Submit the meeting draft to the backend. Only call when getMeetingDraftStatus reports ready=true. Do not ask the user for confirmation.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'askUser',
    description:
      'Ask the user a clarifying question. The loop pauses and waits for their next message. Use this only when you genuinely need information you cannot infer.',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question to show to the user.' },
      },
      required: ['question'],
    },
  },
  {
    name: 'navigate',
    description: 'Navigate to a route within the Propley app (e.g. /meetings, /customers).',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path starting with /.' },
      },
      required: ['path'],
    },
  },
  {
    name: 'getUiState',
    description: 'Read the current UI state: route and whether the meeting drawer is open.',
    parameters: { type: 'object', properties: {} },
  },
];

// Format Gemini expects: tools: [{ functionDeclarations: [...] }]
export const TOOLS_FOR_GEMINI = [{ functionDeclarations: TOOL_DECLARATIONS }];
