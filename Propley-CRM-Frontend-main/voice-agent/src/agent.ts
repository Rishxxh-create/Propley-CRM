import { voice, type ChatContext, type ChatChunk, type FlushSentinel, type stt, type ToolContext } from "@livekit/agents";
import type * as sarvam from "@livekit/agents-plugin-sarvam";
import type { AudioFrame } from "@livekit/rtc-node";
import type { BrowserBridge } from "./browser-bridge.js";
import { DEFAULT_TTS_LANGUAGE, languageName, speaksLanguage, ttsLanguageForText } from "./language.js";
import { LanguagePolicy } from "./language-policy.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import { isMeaningfulUtterance } from "./utterance.js";
import { stripSelfEcho } from "./echo.js";
import { stripGrovel, stripPlumbing } from "./grovel.js";
import { snapToVocabulary } from "./vocab.js";
import { buildTools, newTurnBudget, type TurnBudget } from "./tools.js";
import {
  isDataQuestion,
  isUngrounded,
  RETRY_INSTRUCTION,
  SAFE_FALLBACK,
} from "./grounding.js";

const RECOVERY_LINE = "Sorry, I lost that — say it again?";

const LANGUAGE_TAG_RE = /\s*\[reply-language:[^\]]*\]\s*/gi;
const stripLanguageTag = (text: string) => text.replace(LANGUAGE_TAG_RE, "");

type ModelSettings = Parameters<voice.Agent["llmNode"]>[2];

function textToStream(text: string): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      controller.enqueue(text);
      controller.close();
    },
  });
}

type Chunk = ChatChunk | string | FlushSentinel;

interface Collected {
  chunks: Chunk[];
  text: string;
  calledTool: boolean;
}

async function collectStream(stream: ReadableStream<Chunk>): Promise<Collected> {
  const chunks: Chunk[] = [];
  let text = "";
  let calledTool = false;

  const reader = stream.getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);

      if (typeof value === "string") {
        text += value;
        continue;
      }
      const delta = (value as ChatChunk)?.delta;
      if (!delta) continue;
      if (delta.content) text += delta.content;
      if (delta.toolCalls && delta.toolCalls.length > 0) calledTool = true;
    }
  } finally {
    reader.releaseLock();
  }

  return { chunks, text: text.trim(), calledTool };
}

function replay(chunks: Chunk[]): ReadableStream<Chunk> {
  return new ReadableStream<Chunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

const HEAD_CHARS = 220;
const SENTENCE_END = /[.!?](\s|$)/;

function guardOpening(stream: ReadableStream<Chunk>): ReadableStream<Chunk> {
  return new ReadableStream<Chunk>({
    async start(controller) {
      const reader = stream.getReader();
      const buffered: Chunk[] = [];
      let head = "";
      let sawTool = false;

      try {
        while (head.length < HEAD_CHARS && !sawTool && !SENTENCE_END.test(head)) {
          const { value, done } = await reader.read();
          if (done) break;
          buffered.push(value);

          if (typeof value === "string") {
            head += value;
            continue;
          }
          const delta = (value as ChatChunk)?.delta;
          if (!delta) continue;
          if (delta.toolCalls && delta.toolCalls.length > 0) sawTool = true;
          if (delta.content) head += delta.content;
        }

        const cleaned = sawTool ? head : stripPlumbing(stripGrovel(head));

        if (cleaned === head) {
          for (const chunk of buffered) controller.enqueue(chunk);
        } else {
          console.log(`[clean] ${JSON.stringify(head.slice(0, 56))} -> ${JSON.stringify(cleaned.slice(0, 56))}`);
          controller.enqueue(cleaned);
        }

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

function hasFreshToolOutput(chatCtx: ChatContext): boolean {
  const items = chatCtx.items;
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item.type === "message" && item.role === "user") return false;
    if (item.type === "function_call_output") return true;
  }
  return false;
}

export function lastUserText(chatCtx: ChatContext): string {
  for (let i = chatCtx.items.length - 1; i >= 0; i--) {
    const item = chatCtx.items[i];
    if (item.type === "message" && item.role === "user") {
      return item.textContent ?? "";
    }
  }
  return "";
}

function lastAgentText(chatCtx: ChatContext): string | null {
  for (let i = chatCtx.items.length - 1; i >= 0; i--) {
    const item = chatCtx.items[i];
    if (item.type === "message" && item.role === "assistant") {
      return item.textContent ?? null;
    }
  }
  return null;
}

function languageDirective(spoken: string): string {
  const name = languageName(spoken);
  return [
    `#### LANGUAGE OF THIS TURN: ${name.toUpperCase()}. THIS OVERRIDES EVERYTHING BELOW. ####`,
    `The advisor just spoke ${name}. Your ENTIRE reply must be in ${name}, in ${name}'s own script.`,
    `Earlier turns may have been in another language. That is IRRELEVANT — do not carry it forward.`,
    spoken === DEFAULT_TTS_LANGUAGE
      ? `They are speaking English. Answer in plain English, in Latin letters — no Devanagari, no Odia, no Indic script of any kind, not even one word.`
      : `They are speaking ${name}. Answer in ${name} — informally, the way a colleague speaks it, with English words mixed in wherever people actually use them ("Rahul अभी offer stage में हैं।"). Not in English alone, and never in stiff, formal, textbook ${name}.`,
  ].join("\n");
}

function currentTurnOnly(chatCtx: ChatContext): ChatContext {
  const trimmed = chatCtx.copy();
  const items = trimmed.items;

  let start = 0;
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item.type === "message" && item.role === "user") {
      start = i;
      break;
    }
  }

  const instructions = items.find((item) => item.id === INSTRUCTIONS_ID);
  const turn = items.slice(start);

  trimmed.items = instructions && !turn.includes(instructions) ? [instructions, ...turn] : turn;
  return trimmed;
}

const INSTRUCTIONS_ID = "lk.agent_task.instructions";

function applyInstructions(chatCtx: ChatContext, instructions: string): boolean {
  const index = chatCtx.indexById(INSTRUCTIONS_ID);
  if (index === undefined) return false;

  const item = chatCtx.items[index];
  if (item.type !== "message") return false;

  item.content = [instructions];
  return true;
}

function replaceLastUserText(chatCtx: ChatContext, text: string): void {
  for (let i = chatCtx.items.length - 1; i >= 0; i--) {
    const item = chatCtx.items[i];
    if (item.type === "message" && item.role === "user") {
      item.content = [text];
      return;
    }
  }
}

export class PropleyAgent extends voice.Agent {
  private ttsLanguage: string | null = null;
  private lastContext: string | null = null;
  private readonly turn: { text: string };
  private readonly budget: TurnBudget;
  private readonly language: LanguagePolicy;

  private confidence = 1;
  private answeredIn: string = DEFAULT_TTS_LANGUAGE;

  constructor(
    private readonly bridge: BrowserBridge,
    private readonly sarvamTts: sarvam.TTS,
    private readonly vocabulary: string[] = [],
    languages: string[] = [],
  ) {
    const turn = { text: "" };
    const budget = newTurnBudget();
    super({
      instructions: SYSTEM_PROMPT,
      allowInterruptions: true,
      tools: buildTools(bridge, () => turn.text, budget),
    });
    this.turn = turn;
    this.budget = budget;
    this.language = new LanguagePolicy(DEFAULT_TTS_LANGUAGE, languages);
  }

  get currentLanguage(): string {
    return this.language.language;
  }

  noteSpokenLanguage(code: string | null | undefined, transcript = ""): void {
    const decision = this.language.observe({
      detected: code,
      transcript,
      confidence: this.confidence,
    });

    if (decision.switched) {
      console.log(`[lang] switched to ${decision.language}`);
    } else if (decision.reason) {
      console.log(`[lang] stayed in ${decision.language}: ${decision.reason}`);
    }
  }

  async sttNode(
    audio: Parameters<voice.Agent["sttNode"]>[0],
    modelSettings: ModelSettings,
  ): Promise<ReadableStream<stt.SpeechEvent | string> | null> {
    const source = await super.sttNode(audio, modelSettings);
    if (!source) return null;

    const capture = (event: stt.SpeechEvent | string) => {
      if (typeof event === "string") return;
      const alternative = event.alternatives?.[0];
      if (alternative && typeof alternative.confidence === "number") {
        this.confidence = alternative.confidence;
      }
    };

    const reader = source.getReader();
    return new ReadableStream<stt.SpeechEvent | string>({
      async pull(controller) {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        capture(value);
        controller.enqueue(value);
      },
      cancel: (reason) => reader.cancel(reason),
    });
  }

  async llmNode(
    chatCtx: ChatContext,
    toolCtx: ToolContext,
    modelSettings: ModelSettings,
  ): Promise<ReadableStream<ChatChunk | string | FlushSentinel> | null> {
    const heard = stripLanguageTag(lastUserText(chatCtx)).trim();
    const deEchoed = stripSelfEcho(heard, lastAgentText(chatCtx)).trim();

    if (!deEchoed && heard) {
      console.log(`[echo] dropped self-echo: ${JSON.stringify(heard)}`);
      return null;
    }

    const userText = snapToVocabulary(deEchoed, this.vocabulary).trim();

    if (userText !== heard) {
      console.log(`[heard] ${JSON.stringify(heard)} -> ${JSON.stringify(userText)}`);
      replaceLastUserText(chatCtx, userText);
    }

    this.turn.text = userText;
    this.budget.reset();

    if (!isMeaningfulUtterance(userText)) {
      console.log(`[skip] ignoring non-utterance: ${JSON.stringify(userText)}`);
      return null;
    }

    const spoken = this.language.language;

    const pageContext = await this.bridge.pageContext();
    const instructions = [languageDirective(spoken), SYSTEM_PROMPT, pageContext]
      .filter(Boolean)
      .join("\n\n");

    const applied = applyInstructions(chatCtx, instructions);

    if (instructions !== this.lastContext) {
      this.lastContext = instructions;
      await this.updateInstructions(instructions);
    }
    console.log(`[lang] ${spoken}${applied ? "" : " (WARNING: not applied to this turn)"}`);
    if (process.env.DEBUG_LANG) {
      const idx = chatCtx.indexById(INSTRUCTIONS_ID);
      const item = idx !== undefined ? chatCtx.items[idx] : undefined;
      const seen = item && item.type === "message" ? (item.textContent ?? "") : "<none>";
      console.log(`[lang-probe] system tail: ${JSON.stringify(seen.slice(-160))}`);
      console.log(`[lang-probe] history: ${chatCtx.items.filter((i) => i.type === "message").length} messages`);
    }

    return this.groundedTurn(chatCtx, toolCtx, modelSettings, userText, pageContext, spoken);
  }

  private async groundedTurn(
    chatCtx: ChatContext,
    toolCtx: ToolContext,
    modelSettings: ModelSettings,
    userText: string,
    screen: string | null,
    spoken: string,
  ): Promise<ReadableStream<ChatChunk | string | FlushSentinel> | null> {
    const hasToolOutput = hasFreshToolOutput(chatCtx);

    const needsGrounding = isDataQuestion(userText) && !hasToolOutput;

    const switched = spoken !== this.answeredIn;

    let stream: ReadableStream<ChatChunk | string | FlushSentinel> | null;
    try {
      stream = await super.llmNode(chatCtx, toolCtx, modelSettings);
    } catch (err) {
      console.error("[llm] failed", err);
      return textToStream(RECOVERY_LINE);
    }
    if (!stream) return textToStream(RECOVERY_LINE);

    if (!needsGrounding && !switched) return guardOpening(stream);

    const collected = await collectStream(stream);

    if (collected.calledTool) return guardOpening(replay(collected.chunks));

    const grounded = await this.groundOrRetry(
      collected,
      { chatCtx, toolCtx, modelSettings, userText, screen, hasToolOutput },
    );
    if (grounded === null) return textToStream(SAFE_FALLBACK);

    const spokenOut = await this.enforceLanguage(grounded, chatCtx, toolCtx, modelSettings, spoken);
    this.answeredIn = spoken;
    return guardOpening(replay(spokenOut.chunks));
  }

  private async groundOrRetry(
    collected: Collected,
    ctx: {
      chatCtx: ChatContext;
      toolCtx: ToolContext;
      modelSettings: ModelSettings;
      userText: string;
      screen: string | null;
      hasToolOutput: boolean;
    },
  ): Promise<Collected | null> {
    const { chatCtx, toolCtx, modelSettings, userText, screen, hasToolOutput } = ctx;

    if (
      !isUngrounded({
        userText,
        replyText: collected.text,
        calledTool: collected.calledTool,
        hasToolOutput,
        screen,
      })
    ) {
      return collected;
    }

    console.warn(`[grounding] ungrounded answer blocked: ${JSON.stringify(collected.text)}`);

    const retryCtx = chatCtx.copy();
    retryCtx.addMessage({ role: "system", content: RETRY_INSTRUCTION });

    let retryStream: ReadableStream<ChatChunk | string | FlushSentinel> | null = null;
    try {
      retryStream = await super.llmNode(retryCtx, toolCtx, modelSettings);
    } catch (err) {
      console.error("[grounding] retry failed", err);
    }
    if (!retryStream) return null;

    const retried = await collectStream(retryStream);

    if (
      isUngrounded({
        userText,
        replyText: retried.text,
        calledTool: retried.calledTool,
        hasToolOutput,
        screen,
      })
    ) {
      console.warn("[grounding] retry still ungrounded — refusing to guess");
      return null;
    }

    console.log(`[grounding] recovered${retried.calledTool ? " via tool call" : ""}`);
    return retried;
  }

  private async enforceLanguage(
    out: Collected,
    chatCtx: ChatContext,
    toolCtx: ToolContext,
    modelSettings: ModelSettings,
    spoken: string,
  ): Promise<Collected> {
    if (out.calledTool || !out.text) return out;
    if (speaksLanguage(out.text, spoken)) return out;

    const name = languageName(spoken);
    console.warn(`[lang] wrong language out (wanted ${spoken}): ${JSON.stringify(out.text.slice(0, 40))}`);

    const retryCtx = currentTurnOnly(chatCtx);
    applyInstructions(
      retryCtx,
      [
        `#### ANSWER ONLY IN ${name.toUpperCase()}. ####`,
        `The advisor spoke ${name}. Every single word of your reply must be in ${name}, in ${name}'s own script. Not one word of any other language.`,
        `Do not apologise. Do not mention the language. Do not repeat this instruction — it is not something the advisor said.`,
        this.lastContext ?? SYSTEM_PROMPT,
      ].join("\n\n"),
    );

    try {
      const retryStream = await super.llmNode(retryCtx, toolCtx, modelSettings);
      if (!retryStream) return out;
      const retried = await collectStream(retryStream);
      if (retried.text && speaksLanguage(retried.text, spoken)) {
        console.log(`[lang] recovered in ${spoken}`);
        return retried;
      }
    } catch (err) {
      console.error("[lang] retry failed", err);
    }

    return out;
  }

  private applyLanguage(text: string): void {
    const spoken = this.language.language;
    const language = speaksLanguage(text, spoken) ? spoken : ttsLanguageForText(text);
    if (language === this.ttsLanguage) return;
    this.ttsLanguage = language;
    this.sarvamTts.updateOptions({ targetLanguageCode: language });
  }

  async ttsNode(
    text: ReadableStream<string> | AsyncIterable<string>,
    modelSettings: ModelSettings,
  ): Promise<ReadableStream<AudioFrame> | null> {
    const iterator = (text as AsyncIterable<string>)[Symbol.asyncIterator]();
    const buffered: string[] = [];

    while (true) {
      const { value, done } = await iterator.next();
      if (done) break;
      buffered.push(value);
      if (value && value.trim()) {
        this.applyLanguage(value);
        break;
      }
    }

    const replayed = (async function* () {
      for (const chunk of buffered) yield chunk;
      while (true) {
        const { value, done } = await iterator.next();
        if (done) return;
        yield value;
      }
    })();

    return super.ttsNode(replayed, modelSettings);
  }
}
