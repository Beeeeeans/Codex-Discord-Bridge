export type SessionStatus = "running" | "stopped";

export interface ProjectConfig {
  id: string;
  name: string;
  channelId: string;
  workdir: string;
  autoStartOnMessage: boolean;
  codexCommand: string;
  codexArgs: string[];
}

export interface BridgeConfig {
  commandPrefix: string;
  dataDir: string;
  databasePath: string;
  outputPollMs: number;
  outputIdleMs: number;
  discordChunkChars: number;
  autoStartOnMessage: boolean;
  codexCommand: string;
  codexArgs: string[];
}

export interface DiscordConfig {
  token: string;
  ignoreBots: boolean;
  allowedUserIds: string[];
}

export interface AppConfig {
  discord: DiscordConfig;
  bridge: BridgeConfig;
  projects: ProjectConfig[];
}

export interface SessionRecord {
  threadId: string;
  channelId: string;
  projectId: string;
  tmuxSession: string;
  workdir: string;
  logPath: string;
  status: SessionStatus;
  byteOffset: number;
  createdAt: string;
  updatedAt: string;
}

export interface StartSessionInput {
  threadId: string;
  channelId: string;
  project: ProjectConfig;
}
