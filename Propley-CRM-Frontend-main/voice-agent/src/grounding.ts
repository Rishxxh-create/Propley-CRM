const DATA_QUESTION_RE = new RegExp(
  [
    "how many|how much|how's|how is|how am i|how are we",
    "what stage|which stage|what's the stage",
    "what number|phone|email|contact",
    "when is|when's|what time|what date",
    "who is|who's|which client|which customer",
    "list|show me|tell me about|brief me",
    "revenue|pipeline|deals|closed|conversion|funnel",
    "presentations|meetings|clients|customers|leads",
    "मेरे कितने|कितनी|कौन सा|कौन है|स्टेज",
  ].join("|"),
  "i",
);

const CONCRETE_FACT_RE = new RegExp(
  [
    "\\b\\d",
    "\\b(inquiry|enquiry|negotiation|offer|closed won|closed lost|vsv)\\b",
    "\\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\\b",
    "\\b(january|february|march|april|may|june|july|august|september|october|november|december)\\b",
    "@",
  ].join("|"),
  "i",
);

const HEDGE_RE =
  /\b(i don'?t (have|know)|i can'?t (see|find|look)|not sure|no (presentations|clients|meetings)|nothing|couldn'?t find|let me (check|look)|मुझे नहीं|पता नहीं)\b/i;

export function isDataQuestion(text: string): boolean {
  return DATA_QUESTION_RE.test(text);
}

export function statesConcreteFact(text: string): boolean {
  if (!text.trim()) return false;
  if (HEDGE_RE.test(text)) return false;
  return CONCRETE_FACT_RE.test(text);
}

const NOT_A_CLAIM = new Set([
  "i", "you", "your", "yours", "we", "our", "us", "he", "she", "it", "its", "they",
  "them", "their", "his", "her", "hers", "the", "that", "this", "these", "those",
  "there", "here", "and", "but", "so", "or", "if", "as", "at", "on", "in", "for",
  "ah", "oh", "well", "right", "sure", "okay", "ok", "yes", "no", "not", "nothing",
  "none", "nope", "want", "let", "got", "course", "sorry", "mm", "hmm",
  "what", "when", "who", "whom", "how", "why", "where", "which", "shall", "should",
  "both", "all", "each", "every", "any", "some", "many", "much", "more", "most",
  "next", "last", "first", "second", "third", "still", "then", "than", "also", "just",
  "only", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "everything", "everyone", "anything", "nobody", "looks", "seems", "sounds", "done",
  "great", "good", "perfect", "maybe", "actually", "currently", "live", "scheduled",
  "completed", "canceled", "cancelled", "active", "pending", "today", "tomorrow",
  "yesterday", "now", "soon", "later", "before", "after", "up", "down", "back",
]);

const STAGE_WORDS = /\b(inquiry|enquiry|negotiation|offer|closed won|closed lost|vsv)\b/gi;

function claims(replyText: string): string[] {
  const out: string[] = [];

  for (const number of replyText.match(/\d+/g) ?? []) out.push(number);

  for (const word of replyText.match(/\b[A-Z][a-z]{2,}\b/g) ?? []) {
    if (!NOT_A_CLAIM.has(word.toLowerCase())) out.push(word);
  }

  for (const stage of replyText.match(STAGE_WORDS) ?? []) out.push(stage);

  return out;
}

const MONTHS =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/g;

const canonical = (text: string) => text.toLowerCase().replace(MONTHS, (month) => month.slice(0, 3));

export function supportedByScreen(replyText: string, context: string | null): boolean {
  if (!context) return false;

  const haystack = canonical(context);
  const asserted = claims(replyText);

  if (asserted.length === 0) return false;

  return asserted.every((claim) => haystack.includes(canonical(claim)));
}

export function isUngrounded(params: {
  userText: string;
  replyText: string;
  calledTool: boolean;
  hasToolOutput: boolean;
  screen?: string | null;
}): boolean {
  if (params.calledTool || params.hasToolOutput) return false;
  if (!isDataQuestion(params.userText)) return false;
  if (!statesConcreteFact(params.replyText)) return false;
  return !supportedByScreen(params.replyText, params.screen ?? null);
}

export const RETRY_INSTRUCTION =
  "STOP. You just answered with specific facts about the advisor's data without looking anything up, and you do not know those facts. Call the correct tool now to get the real answer. If no tool can answer it, say plainly that you do not have it — never guess a number, a stage, a date or a contact detail.";

export const SAFE_FALLBACK = "I don't have that to hand — let me pull it up for you.";
