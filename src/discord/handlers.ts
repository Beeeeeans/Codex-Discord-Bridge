import fs from "node:fs/promises";
import path from "node:path";
import type { Message, ThreadChannel } from "discord.js";
import type { AppConfig, ProjectConfig, SessionRecord } from "../sessions/session-types.js";
import { CommandRouter } from "../commands/command-router.js";
import { SessionManager } from "../sessions/session-manager.js";
import { Tmux } from "../sessions/tmux.js";
import { ProjectResolver } from "../projects/project-resolver.js";
import { safePathSegment } from "../utils/ids.js";
import { logger } from "../logger.js";

export class DiscordHandlers {
  constructor(
    private readonly config: AppConfig,
    private readonly resolver: ProjectResolver,
    private readonly sessions: SessionManager,
    private readonly tmux: Tmux,
    private readonly commands: CommandRouter
  ) {}

  async onMessage(message: Message): Promise<void> {
    if (this.shouldIgnore(message)) return;
    if (!message.channel.isThread()) return;

    const thread = message.channel as ThreadChannel;
    const project = this.projectForThread(thread);
    if (!project) return;

    if (await this.commands.route(message, project)) return;

    const record = await this.sessionForMessage(message, project);
    if (!record) return;

    const payload = await this.payloadForCodex(message);
    if (!payload) return;

    await this.tmux.clearCurrentLine(record.tmuxSession);
    await this.tmux.sendText(record.tmuxSession, payload);
    await delay(150);
    await this.tmux.submitInput(record.tmuxSession);
    await message.react("✅").catch(() => undefined);
  }

  private shouldIgnore(message: Message): boolean {
    if (this.config.discord.ignoreBots && message.author.bot) return true;
    const allowed = this.config.discord.allowedUserIds;
    return allowed.length > 0 && !allowed.includes(message.author.id);
  }

  private projectForThread(thread: ThreadChannel): ProjectConfig | undefined {
    if (!thread.parentId) return undefined;
    return this.resolver.forChannel(thread.parentId);
  }

  private async sessionForMessage(message: Message, project: ProjectConfig): Promise<SessionRecord | undefined> {
    const existing = this.sessions.get(message.channelId);
    if (existing && (await this.sessions.ensureRunning(existing))) return existing;
    if (!project.autoStartOnMessage) {
      await message.reply("No running session for this thread. Run `!start` first.");
      return undefined;
    }

    logger.info({ threadId: message.channelId, projectId: project.id }, "auto-starting session");
    return this.sessions.start({
      threadId: message.channelId,
      channelId: project.channelId,
      project
    });
  }

  private async payloadForCodex(message: Message): Promise<string> {
    const attachmentPaths = await this.downloadAttachments(message);
    if (attachmentPaths.length === 0) return message.content;
    const paths = attachmentPaths.map((filePath) => `Attachment: ${filePath}`).join("\n");
    return message.content ? `${message.content}\n\n${paths}` : paths;
  }

  private async downloadAttachments(message: Message): Promise<string[]> {
    if (message.attachments.size === 0) return [];
    const dir = path.join(this.config.bridge.dataDir, "attachments", safePathSegment(message.channelId));
    await fs.mkdir(dir, { recursive: true });

    const paths: string[] = [];
    for (const attachment of message.attachments.values()) {
      const fileName = `${attachment.id}-${safePathSegment(attachment.name ?? "attachment")}`;
      const filePath = path.join(dir, fileName);
      const response = await fetch(attachment.url);
      if (!response.ok) {
        throw new Error(`Failed to download attachment ${attachment.url}: ${response.status}`);
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(filePath, bytes);
      paths.push(filePath);
    }
    return paths;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
