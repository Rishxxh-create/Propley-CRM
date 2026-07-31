import type { Room } from "@livekit/rtc-node";
import { RPC_TIMEOUT_MS } from "./config.js";

export interface ToolEnvelope {
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface WizardTurn {
  prompt: string;
  done: boolean;
}

export interface HandoffResult {
  wizard: true;
  prompt: string;
  done: boolean;
}

export function isHandoffResult(value: unknown): value is HandoffResult {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { wizard?: unknown }).wizard === true &&
    typeof (value as { prompt?: unknown }).prompt === "string"
  );
}

export class BrowserBridge {
  constructor(
    private readonly room: Room,
    private readonly identity: string,
  ) {}

  private async call(method: string, payload: unknown): Promise<string> {
    const local = this.room.localParticipant;
    if (!local) throw new Error("agent is not connected to the room");
    return local.performRpc({
      destinationIdentity: this.identity,
      method,
      payload: JSON.stringify(payload),
      responseTimeout: RPC_TIMEOUT_MS,
    });
  }

  async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    try {
      const raw = await this.call("tool.execute", { name, args });
      const envelope = JSON.parse(raw) as ToolEnvelope;
      if (!envelope.ok) return { error: envelope.error ?? `tool ${name} failed` };
      return envelope.result;
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }

  async pageContext(): Promise<string | null> {
    try {
      const raw = await this.call("context.get", {});
      const ctx = JSON.parse(raw) as {
        path?: string;
        page?: string;
        onScreen?: string[];
        wizard?: string | null;
        advisor?: string | null;
      };
      if (!ctx.page) return null;

      const lines = [
        "WHAT YOU CAN SEE ON THEIR SCREEN RIGHT NOW.",
        "This is your view of their screen. Answer questions about it directly from this — never say you cannot see the screen. But do not narrate or announce it unless they ask.",
        `- current page: ${ctx.page} (${ctx.path ?? "/"})`,
      ];
      if (ctx.advisor) {
        lines.push(
          `- you are assisting ${ctx.advisor}. Use their first name sparingly and naturally, the way an assistant would — not in every reply.`,
        );
      }
      for (const item of ctx.onScreen ?? []) lines.push(`- ${item}`);
      if (ctx.wizard) lines.push(`- guided flow active: ${ctx.wizard}`);
      return lines.join("\n");
    } catch {
      return null;
    }
  }

  async advisor(): Promise<string | null> {
    try {
      const raw = await this.call("context.get", {});
      const ctx = JSON.parse(raw) as { advisor?: string | null };
      return ctx.advisor?.trim() ? ctx.advisor.trim() : null;
    } catch {
      return null;
    }
  }

  async vocabulary(): Promise<string[]> {
    try {
      const raw = await this.call("vocabulary.get", {});
      const parsed = JSON.parse(raw) as { terms?: unknown };
      if (!Array.isArray(parsed.terms)) return [];
      return parsed.terms.filter((t): t is string => typeof t === "string" && t.length > 0);
    } catch {
      return [];
    }
  }

  async wizardInput(text: string): Promise<WizardTurn> {
    try {
      const raw = await this.call("wizard.input", { text });
      const turn = JSON.parse(raw) as WizardTurn;
      if (typeof turn.prompt !== "string") throw new Error("malformed wizard response");
      return turn;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { prompt: `Sorry, that flow failed: ${message}. Let's start over.`, done: true };
    }
  }
}
