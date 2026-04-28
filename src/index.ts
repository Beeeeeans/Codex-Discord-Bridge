import fs from "node:fs/promises";
import { loadConfig } from "./config.js";
import { createDiscordClient } from "./discord/client.js";
import { logger } from "./logger.js";
import { ProjectResolver } from "./projects/project-resolver.js";
import { SessionManager } from "./sessions/session-manager.js";
import { SessionStore } from "./sessions/session-store.js";
import { Tmux } from "./sessions/tmux.js";

async function main(): Promise<void> {
  const config = await loadConfig();
  await fs.mkdir(config.bridge.dataDir, { recursive: true });
  await fs.mkdir(`${config.bridge.dataDir}/logs`, { recursive: true });
  await fs.mkdir(`${config.bridge.dataDir}/attachments`, { recursive: true });

  const tmux = new Tmux();
  await tmux.assertAvailable();

  const store = new SessionStore(config.bridge.databasePath);
  const sessions = new SessionManager(store, tmux, config.bridge.dataDir);
  const resolver = new ProjectResolver(config.projects);
  const { client, output } = createDiscordClient({ config, resolver, sessions, tmux });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down bridge");
    output.stop();
    client.destroy();
    store.close();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await client.login(config.discord.token);
}

void main().catch((error) => {
  logger.error({ error }, "fatal startup error");
  process.exit(1);
});
