import fs from "node:fs/promises";
import type { Message } from "discord.js";
import { cleanTerminalOutput, codeBlock, chunkForDiscord } from "../utils/text.js";
import { tailLastLines } from "../sessions/log-tail.js";
import type { AppConfig, ProjectConfig, SessionRecord } from "../sessions/session-types.js";
import { SessionManager } from "../sessions/session-manager.js";
import { Tmux } from "../sessions/tmux.js";

export interface CommandContext {
  message: Message;
  args: string[];
  project: ProjectConfig;
  config: AppConfig;
  sessions: SessionManager;
  tmux: Tmux;
}

export async function startCommand(ctx: CommandContext): Promise<void> {
  const record = await ctx.sessions.start({
    threadId: ctx.message.channelId,
    channelId: ctx.project.channelId,
    project: ctx.project
  });
  await ctx.message.reply(`Started Codex session \`${record.tmuxSession}\` in \`${record.workdir}\`.`);
}

export async function stopCommand(ctx: CommandContext): Promise<void> {
  const record = await ctx.sessions.stop(ctx.message.channelId);
  await ctx.message.reply(record ? `Stopped \`${record.tmuxSession}\`.` : "No session is registered for this thread.");
}

export async function restartCommand(ctx: CommandContext): Promise<void> {
  const record = await ctx.sessions.restart({
    threadId: ctx.message.channelId,
    channelId: ctx.project.channelId,
    project: ctx.project
  });
  await ctx.message.reply(`Restarted \`${record.tmuxSession}\`.`);
}

export async function statusCommand(ctx: CommandContext): Promise<void> {
  const record = ctx.sessions.get(ctx.message.channelId);
  if (!record) {
    await ctx.message.reply("No session is registered for this thread yet. Send `!start`, or send a normal non-command message and I’ll auto-start Codex for this thread.");
    return;
  }
  const live = await ctx.sessions.ensureRunning(record);
  await ctx.message.reply(formatSession(record, live));
}

export async function sessionsCommand(ctx: CommandContext): Promise<void> {
  const sessions = ctx.sessions.list();
  if (sessions.length === 0) {
    await ctx.message.reply("No sessions registered.");
    return;
  }
  await ctx.message.reply(codeBlock(sessions.map((session) => formatSessionLine(session)).join("\n")));
}

export async function tailCommand(ctx: CommandContext): Promise<void> {
  const record = requireSession(ctx);
  if (!record) return;
  const lines = parsePositiveInt(ctx.args[0], 80);
  const text = await tailLastLines(record.logPath, lines);
  await replyChunks(ctx.message, text || "(log is empty)", ctx.config.bridge.discordChunkChars);
}

export async function dumpCommand(ctx: CommandContext): Promise<void> {
  const record = requireSession(ctx);
  if (!record) return;
  const text = await fs.readFile(record.logPath, "utf8").catch(() => "");
  await replyChunks(ctx.message, cleanTerminalOutput(text) || "(log is empty)", ctx.config.bridge.discordChunkChars);
}

export async function clearLogCommand(ctx: CommandContext): Promise<void> {
  const record = requireSession(ctx);
  if (!record) return;
  await fs.writeFile(record.logPath, "");
  ctx.sessions.updateOffset(record.threadId, 0);
  await ctx.message.reply("Cleared this session log.");
}

export async function cwdCommand(ctx: CommandContext): Promise<void> {
  const record = ctx.sessions.get(ctx.message.channelId);
  await ctx.message.reply(`\`${record?.workdir ?? ctx.project.workdir}\``);
}

export async function projectCommand(ctx: CommandContext): Promise<void> {
  await ctx.message.reply(`${ctx.project.name} (\`${ctx.project.id}\`) -> \`${ctx.project.workdir}\``);
}

export async function tmuxCommand(ctx: CommandContext): Promise<void> {
  const record = requireSession(ctx);
  if (!record) return;
  await ctx.message.reply(`\`tmux attach -t ${record.tmuxSession}\``);
}

export async function enterCommand(ctx: CommandContext): Promise<void> {
  const record = requireSession(ctx);
  if (!record) return;
  await ctx.tmux.sendEnter(record.tmuxSession);
  await ctx.message.react("✅");
}

export async function escapeCommand(ctx: CommandContext): Promise<void> {
  const record = requireSession(ctx);
  if (!record) return;
  await ctx.tmux.sendEscape(record.tmuxSession);
  await ctx.message.react("✅");
}

export async function ctrlCCommand(ctx: CommandContext): Promise<void> {
  const record = requireSession(ctx);
  if (!record) return;
  await ctx.tmux.sendCtrlC(record.tmuxSession);
  await ctx.message.react("✅");
}

export async function helpCommand(ctx: CommandContext): Promise<void> {
  await ctx.message.reply(
    codeBlock(
      [
        "!start - start Codex in this thread",
        "!stop - stop this thread's tmux session",
        "!restart - restart Codex",
        "!status - show this thread's session",
        "!sessions - list known sessions",
        "!tail [lines] - show recent log lines",
        "!dump - post the complete cleaned log",
        "!clearlog - truncate this thread's log",
        "!cwd - show the workdir",
        "!project - show project mapping",
        "!tmux - show attach command",
        "!enter - send Enter",
        "!escape - send Escape",
        "!ctrlc - send Ctrl-C",
        "!help - show this help"
      ].join("\n")
    )
  );
}

function requireSession(ctx: CommandContext): SessionRecord | undefined {
  const record = ctx.sessions.get(ctx.message.channelId);
  if (!record) {
    void ctx.message.reply("No session is registered for this thread. Run `!start` first.");
    return undefined;
  }
  return record;
}

async function replyChunks(message: Message, text: string, maxChars: number): Promise<void> {
  for (const chunk of chunkForDiscord(text, maxChars - 10)) {
    await message.reply(codeBlock(chunk));
  }
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1000) : fallback;
}

function formatSession(record: SessionRecord, live: boolean): string {
  return codeBlock(
    [
      `thread: ${record.threadId}`,
      `project: ${record.projectId}`,
      `tmux: ${record.tmuxSession}`,
      `status: ${record.status}`,
      `live: ${live ? "yes" : "no"}`,
      `workdir: ${record.workdir}`,
      `log: ${record.logPath}`,
      `offset: ${record.byteOffset}`
    ].join("\n")
  );
}

function formatSessionLine(record: SessionRecord): string {
  return `${record.status.padEnd(7)} ${record.projectId.padEnd(16)} ${record.threadId} ${record.tmuxSession}`;
}
