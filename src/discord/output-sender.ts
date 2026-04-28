import { type Client, type Message } from "discord.js";
import { cleanTerminalOutput } from "../utils/text.js";
import { tailFromOffset } from "../sessions/log-tail.js";
import { choicePromptComponents, choicePromptContent, detectChoicePrompt } from "./interactive-prompts.js";
import type { AppConfig, SessionRecord } from "../sessions/session-types.js";
import { SessionManager } from "../sessions/session-manager.js";
import { Tmux } from "../sessions/tmux.js";
import { logger } from "../logger.js";

export class OutputSender {
  private timer: NodeJS.Timeout | undefined;
  private readonly liveStatusMessages = new Map<string, Message>();
  private readonly liveStatusLastEditedAt = new Map<string, number>();
  private readonly lastPromptKeys = new Map<string, string>();

  constructor(
    private readonly client: Client,
    private readonly config: AppConfig,
    private readonly sessions: SessionManager,
    private readonly tmux: Tmux
  ) {}

  start(): void {
    this.timer = setInterval(() => {
      void this.poll();
    }, this.config.bridge.outputPollMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.liveStatusMessages.clear();
    this.liveStatusLastEditedAt.clear();
    this.lastPromptKeys.clear();
  }

  private async poll(): Promise<void> {
    for (const record of this.sessions.list().filter((session) => session.status === "running")) {
      try {
        const result = await tailFromOffset(record.logPath, record.byteOffset);
        this.sessions.updateOffset(record.threadId, result.byteOffset);
        if (result.text) await this.sendChoicePromptIfPresent(record, result.text);
        await this.updateLiveStatus(record, Date.now());
      } catch (error) {
        logger.warn({ error, threadId: record.threadId }, "failed to poll session output");
      }
    }
  }

  private async sendChoicePromptIfPresent(record: SessionRecord, rawText: string): Promise<boolean> {
    const threadId = record.threadId;
    const rawPrompt = detectChoicePrompt(rawText, threadId);
    if (rawPrompt) return this.sendChoicePrompt(record, rawPrompt);

    const cleanedPrompt = detectChoicePrompt(cleanForDiscord(rawText), threadId);
    if (cleanedPrompt) return this.sendChoicePrompt(record, cleanedPrompt);

    return false;
  }

  private async sendChoicePrompt(record: SessionRecord, prompt: NonNullable<ReturnType<typeof detectChoicePrompt>>): Promise<boolean> {
    const key = `${prompt.title}:${prompt.question}:${prompt.details ?? ""}:${prompt.choices.map((choice) => choice.value).join(",")}`;
    if (this.lastPromptKeys.get(record.threadId) === key) return false;

    const channel = await this.fetchSendableThread(record.threadId);
    if (!channel) return false;
    await channel.send({
      content: choicePromptContent(prompt),
      components: choicePromptComponents(prompt)
    });
    this.lastPromptKeys.set(record.threadId, key);
    return true;
  }

  private async updateLiveStatus(record: SessionRecord, nowMs: number): Promise<void> {
    const lastEditMs = this.liveStatusLastEditedAt.get(record.threadId);
    if (!shouldEditLiveStatus({ nowMs, lastEditMs, updateMs: this.config.bridge.liveStatusUpdateMs })) return;

    const channel = await this.fetchSendableThread(record.threadId);
    if (!channel) return;

    const pane = await this.tmux.capturePane(record.tmuxSession, this.config.bridge.liveStatusLines).catch(() => "");
    const cleanedPaneText = cleanForDiscord(pane);
    if (!cleanedPaneText.trim()) return;

    const content = formatLiveStatusMessage({
      cleanedPaneText,
      lineCount: this.config.bridge.liveStatusLines,
      now: new Date(nowMs)
    });

    const existing = this.liveStatusMessages.get(record.threadId);
    if (existing) {
      const edited = await existing.edit(content).catch(() => null);
      if (edited) {
        this.liveStatusLastEditedAt.set(record.threadId, nowMs);
        return;
      }
      this.liveStatusMessages.delete(record.threadId);
    }

    const sent = await channel.send(content);
    this.liveStatusMessages.set(record.threadId, sent);
    this.liveStatusLastEditedAt.set(record.threadId, nowMs);
  }

  private async fetchSendableThread(threadId: string): Promise<({ send: (...args: any[]) => Promise<Message> } & { isTextBased: () => boolean }) | undefined> {
    const channel = await this.client.channels.fetch(threadId).catch(() => null);
    if (!channel?.isTextBased()) return undefined;
    if (!("send" in channel) || typeof channel.send !== "function") return undefined;
    return channel as { send: (...args: any[]) => Promise<Message> } & { isTextBased: () => boolean };
  }
}

export interface LiveStatusDecisionInput {
  nowMs: number;
  lastEditMs: number | undefined;
  updateMs: number;
}

export function shouldEditLiveStatus(input: LiveStatusDecisionInput): boolean {
  return input.lastEditMs === undefined || input.nowMs - input.lastEditMs >= input.updateMs;
}

export interface LiveStatusMessageInput {
  cleanedPaneText: string;
  lineCount: number;
  now: Date;
}

export function formatLiveStatusMessage(input: LiveStatusMessageInput): string {
  const lines = cleanForDiscord(cleanTerminalOutput(input.cleanedPaneText))
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .slice(-input.lineCount);
  let body = lines.length > 0 ? lines.join("\n") : "(no useful output yet)";
  const maxBodyChars = 1800;
  if (body.length > maxBodyChars) body = `…${body.slice(-(maxBodyChars - 1))}`;
  const timestamp = input.now.toISOString().slice(11, 19);

  return ["🧠 Codex is working…", "", "```console", body.replace(/```/g, "`\u200b``"), "```", `Updated ${timestamp}`].join("\n");
}

export function cleanForDiscord(text: string): string {
  const lines = cleanTerminalOutput(text)
    .replace(/•/g, "\n• ")
    .split("\n")
    .map((line) => normalizeCodexLine(line))
    .filter((line) => line.length > 0)
    .filter((line) => !isCodexUiNoise(line));

  const deduped: string[] = [];
  for (const line of lines) {
    if (line !== deduped.at(-1)) deduped.push(line);
  }
  return deduped.join("\n").trim();
}

function normalizeCodexLine(line: string): string {
  let normalized = line
    .trim()
    .replace(/^•\s*/, "")
    .replace(/^•›/, "›")
    .replace(/›.*$/g, "")
    .replace(/^git status(?=Run \/review)/i, "")
    .replace(/^Run \/review on my current changes\s*/i, "")
    .replace(/\d*WWo$/i, "")
    .replace(/\d+$/g, "")
    .trim();

  if (/^[Ll]\s+##\s+/.test(normalized)) normalized = normalized.replace(/^[Ll]\s+/, "┃ ");
  return normalized;
}

function isCodexUiNoise(line: string): boolean {
  if (!line) return true;
  if (/^›/.test(line)) return true;
  if (/^gpt-[\w.-]+\s+default/i.test(line)) return true;
  if (/gpt-[\w.-]+\s+default\s+[·•]\s+~\//i.test(line)) return true;
  if (/^(gpt-[\w.-]+|>)?\s*tab to queue message/i.test(line)) return true;
  if (/context left/i.test(line)) return true;
  if (/esc to interrupt/i.test(line)) return true;
  if (/background terminal running\s+·\s+\/ps to view/i.test(line)) return true;
  if (/^[-─_]{8,}(?:\d*WWo)?$/i.test(line)) return true;
  if (/^Run \/review on my current changes$/i.test(line)) return true;
  if (/^git status$/i.test(line)) return true;
  if (/Checking it again now\.\s*Working$/i.test(line)) return true;
  if (isSpinnerFragment(line)) return true;
  return false;
}

function isSpinnerFragment(line: string): boolean {
  const compact = line.replace(/[\s().0-9]/g, "");
  if (!compact) return true;
  if (/^Working/i.test(compact)) return true;
  if (/^WWo$/i.test(compact)) return true;
  if (/^ngg$/i.test(compact)) return true;
  if (/^[Ww]?o?r?k?i?n?g?$/i.test(compact) && compact.length <= "Working".length) return true;
  if (/^[working]+$/i.test(compact) && compact.length <= 14) return true;
  return false;
}

function looksLikeTuiRedrawNoise(text: string): boolean {
  return /([A-Za-z]{1,12})\1{2,}/.test(text) || text.includes("BBoBoo") || text.includes("BootBooti");
}
