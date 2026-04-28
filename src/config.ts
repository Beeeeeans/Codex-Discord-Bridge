import { readFile } from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import YAML from "yaml";
import { z } from "zod";
import type { AppConfig } from "./sessions/session-types.js";

dotenv.config();

const rawProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  channel_id: z.string().min(1),
  workdir: z.string().min(1),
  auto_start_on_message: z.boolean().optional(),
  codex_command: z.string().min(1).optional(),
  codex_args: z.array(z.string()).optional()
});

const rawConfigSchema = z.object({
  discord: z.object({
    token_env: z.string().min(1).default("DISCORD_TOKEN"),
    ignore_bots: z.boolean().default(true),
    allowed_user_ids: z.array(z.string()).default([])
  }),
  bridge: z.object({
    command_prefix: z.string().min(1).default("!"),
    data_dir: z.string().min(1).default("./data"),
    database_path: z.string().min(1).default("./data/bridge.sqlite"),
    output_poll_ms: z.number().int().positive().default(1000),
    output_idle_ms: z.number().int().positive().default(1200),
    live_status_update_ms: z.number().int().positive().default(5000),
    live_status_lines: z.number().int().min(10).max(200).default(50),
    discord_chunk_chars: z.number().int().min(500).max(1990).default(1900),
    auto_start_on_message: z.boolean().default(true),
    codex_command: z.string().min(1).default("codex"),
    codex_args: z.array(z.string()).default([])
  }),
  projects: z.array(rawProjectSchema).min(1)
});

export async function loadConfig(configPath = process.env.CONFIG_PATH ?? "./config.yaml"): Promise<AppConfig> {
  const resolvedPath = path.resolve(configPath);
  const content = await readFile(resolvedPath, "utf8");
  const raw = rawConfigSchema.parse(YAML.parse(content));
  const token = process.env[raw.discord.token_env];

  if (!token) {
    throw new Error(`Missing Discord token in environment variable ${raw.discord.token_env}`);
  }

  const dataDir = path.resolve(raw.bridge.data_dir);
  const bridge = {
    commandPrefix: raw.bridge.command_prefix,
    dataDir,
    databasePath: path.resolve(raw.bridge.database_path),
    outputPollMs: raw.bridge.output_poll_ms,
    outputIdleMs: raw.bridge.output_idle_ms,
    liveStatusUpdateMs: raw.bridge.live_status_update_ms,
    liveStatusLines: raw.bridge.live_status_lines,
    discordChunkChars: raw.bridge.discord_chunk_chars,
    autoStartOnMessage: raw.bridge.auto_start_on_message,
    codexCommand: raw.bridge.codex_command,
    codexArgs: raw.bridge.codex_args
  };

  return {
    discord: {
      token,
      ignoreBots: raw.discord.ignore_bots,
      allowedUserIds: raw.discord.allowed_user_ids
    },
    bridge,
    projects: raw.projects.map((project) => ({
      id: project.id,
      name: project.name,
      channelId: project.channel_id,
      workdir: path.resolve(project.workdir),
      autoStartOnMessage: project.auto_start_on_message ?? bridge.autoStartOnMessage,
      codexCommand: project.codex_command ?? bridge.codexCommand,
      codexArgs: project.codex_args ?? bridge.codexArgs
    }))
  };
}
