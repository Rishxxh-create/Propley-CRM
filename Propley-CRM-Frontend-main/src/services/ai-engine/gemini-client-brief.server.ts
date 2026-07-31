import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ClientBriefPayload } from '@/lib/client-voice-lookup';

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

export interface GeminiClientBriefResult {
  brief: string;
  source: 'gemini' | 'fallback';
}

function buildSystemPrompt(): string {
  return `You are a senior sales intelligence assistant for the Propley premium real estate CRM.

The user asked a question about a specific client. You receive ONLY structured CRM data (JSON). Your job is to answer with a rich, helpful briefing.

Rules:
1. Use ONLY facts present in the JSON. Never invent email, phone, meetings, or notes.
2. Write in clear prose for a sales advisor (professional, warm, concise). Use markdown: ## headings, bullet lists where helpful.
3. Include these sections when data exists (omit empty sections):
   - ## Overview (2–4 sentences synthesizing who they are and relationship status)
   - ## Contact & assignment
   - ## Pipeline & engagement (deal stage, client status, lead source, last presentation)
   - ## Presentations (each project with status, date/time; note patterns e.g. live vs completed)
   - ## Advisor notes (summarize note themes; quote short phrases if useful)
   - ## Suggested next step (one concrete action for the advisor)
4. If the user question is specific (e.g. budget, meetings, advisor), prioritize answering that within the sections.
5. Do not mention JSON, Gemini, or AI. End with one line: "Opening their CRM profile now."
6. Keep total length roughly 150–280 words unless data is very sparse.`;
}

export async function generateClientBriefWithGemini(
  payload: ClientBriefPayload,
  apiKey: string
): Promise<GeminiClientBriefResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: buildSystemPrompt(),
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 1024,
    },
  });

  const userBlock = `User question:\n"""${payload.userQuestion.trim()}"""\n\nCRM data:\n${JSON.stringify(payload.crm, null, 2)}`;

  const result = await model.generateContent(userBlock);
  const text = result.response.text()?.trim();

  if (!text) {
    return { brief: '', source: 'fallback' };
  }

  return { brief: text, source: 'gemini' };
}
