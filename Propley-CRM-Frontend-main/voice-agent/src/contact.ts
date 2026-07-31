const ASKED_RE = /\b(phone|number|mobile|cell|contact|e-?mail|reach (him|her|them)|call (him|her|them))\b/i;

const ASKED_INDIC_RE = /(फ़ोन|फोन|नंबर|ईमेल|मोबाइल|संपर्क)/;

const CONTACT_FIELDS = ["phone", "email", "mobile"];

export function asksForContact(userText: string): boolean {
  return ASKED_RE.test(userText) || ASKED_INDIC_RE.test(userText);
}

const NOTE_RE = /\b(note|noted|jot|log|record|write (this |that )?down|remember|make a note|add a note|mention)\b/i;
const NOTE_INDIC_RE = /(नोट|लिख|याद)/;

export function asksForNote(userText: string): boolean {
  return NOTE_RE.test(userText) || NOTE_INDIC_RE.test(userText);
}

export function withoutContact(result: unknown): unknown {
  if (result === null || typeof result !== "object") return result;

  if (Array.isArray(result)) return result.map(withoutContact);

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(result as Record<string, unknown>)) {
    if (CONTACT_FIELDS.includes(key)) continue;
    out[key] = typeof value === "object" && value !== null ? withoutContact(value) : value;
  }
  return out;
}
