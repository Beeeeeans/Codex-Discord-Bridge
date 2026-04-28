import { type Client } from "discord.js";
import { codeBlock, chunkForDiscord } from "../utils/text.js";
import { tailFromOffset } from "../sessions/log-tail.js";
import { choicePromptComponents, choicePromptContent, detectChoicePrompt } from "./interactive-prompts.js";
import type { AppConfig, SessionRecord } from "../sessions/session-types.js";
import { SessionManager } from "../sessions/session-manager.js";
import { Tmux } from "../sessions/tmux.js";
import { logger } from "../logger.js";

export class OutputSender {
  private timer: NodeJS.Timeout | undefined;
  private readonly pending = new Map<string, NodeJS.Timeout>();
  private readonly buffers = new Map<string, string[]>();

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
    for (const timeout of this.pending.values()) clearTimeout(timeout);
    this.pending.clear();
    this.buffers.clear();
  }

  private async poll(): Promise<void> {
    for (const record of this.sessions.list().filter((session) => session.status === "running")) {
      try {
        const result = await tailFromOffset(record.logPath, record.byteOffset);
        if (!result.text) {
          this.sessions.updateOffset(record.threadId, result.byteOffset);
          continue;
        }

        this.sessions.updateOffset(record.threadId, result.byteOffset);
        const buffer = this.buffers.get(record.threadId) ?? [];
        buffer.push(result.text);
        this.buffers.set(record.threadId, buffer);

        const previous = this.pending.get(record.threadId);
        if (previous) clearTimeout(previous);
        this.pending.set(
          record.threadId,
          setTimeout(() => {
            this.pending.delete(record.threadId);
            const text = (this.buffers.get(record.threadId) ?? []).join("\n");
            this.buffers.delete(record.threadId);
            void this.send(record, text);
          }, this.config.bridge.outputIdleMs)
        );
      } catch (error) {
        logger.warn({ error, threadId: record.threadId }, "failed to poll session output");
      }
    }
  }

  private async send(record: SessionRecord, rawText: string): Promise<void> {
    const threadId = record.threadId;
    const channel = await this.client.channels.fetch(threadId).catch(() => null);
    if (!channel?.isTextBased()) return;

    if (!("send" in channel) || typeof channel.send !== "function") return;

    const rawPrompt = detectChoicePrompt(rawText, threadId);
    if (rawPrompt) {
      await channel.send({
        content: choicePromptContent(rawPrompt),
        components: choicePromptComponents(rawPrompt)
      });
      return;
    }

    const text = await this.presentableText(record, rawText);
    if (!text.trim()) return;

    const prompt = detectChoicePrompt(text, threadId);
    if (prompt) {
      await channel.send({
        content: choicePromptContent(prompt),
        components: choicePromptComponents(prompt)
      });
      return;
    }

    const chunks = chunkForDiscord(text, Math.min(this.config.bridge.discordChunkChars - 30, 1800));
    for (const chunk of chunks) {
      await channel.send(`**Codex output**\n${codeBlock(chunk)}`);
    }
  }

  private async presentableText(record: SessionRecord, rawText: string): Promise<string> {
    if (detectChoicePrompt(rawText, record.threadId)) return rawText;
    if (!looksLikeTuiRedrawNoise(rawText)) return cleanForDiscord(rawText);

    const pane = await this.tmux.capturePane(record.tmuxSession, 80).catch(() => "");
    return cleanForDiscord(pane.trim() || rawText);
  }
}

export function cleanForDiscord(text: string): string {
  const lines = text
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
