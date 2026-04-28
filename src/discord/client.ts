import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import type { AppConfig } from "../sessions/session-types.js";
import { CommandRouter } from "../commands/command-router.js";
import { OutputSender } from "./output-sender.js";
import { DiscordHandlers } from "./handlers.js";
import { InteractionHandler } from "./interaction-handler.js";
import { ProjectResolver } from "../projects/project-resolver.js";
import { SessionManager } from "../sessions/session-manager.js";
import { Tmux } from "../sessions/tmux.js";
import { logger } from "../logger.js";

export function createDiscordClient(options: {
  config: AppConfig;
  resolver: ProjectResolver;
  sessions: SessionManager;
  tmux: Tmux;
}): { client: Client; output: OutputSender } {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
  });

  const commands = new CommandRouter(options.config, options.sessions, options.tmux);
  const interactions = new InteractionHandler(options.sessions, options.tmux);
  const handlers = new DiscordHandlers(
    options.config,
    options.resolver,
    options.sessions,
    options.tmux,
    commands
  );
  const output = new OutputSender(client, options.config, options.sessions, options.tmux);

  client.once(Events.ClientReady, (readyClient) => {
    logger.info({ user: readyClient.user.tag }, "discord client ready");
    output.start();
  });

  client.on(Events.MessageCreate, (message) => {
    void handlers.onMessage(message).catch((error) => {
      logger.error({ error, messageId: message.id }, "message handler failed");
      void message.reply(`Bridge error: ${error instanceof Error ? error.message : String(error)}`).catch(() => undefined);
    });
  });

  client.on(Events.InteractionCreate, (interaction) => {
    if (!interaction.isButton()) return;
    void interactions.onButton(interaction).catch((error) => {
      logger.error({ error, interactionId: interaction.id }, "interaction handler failed");
      const content = `Bridge error: ${error instanceof Error ? error.message : String(error)}`;
      if (interaction.deferred || interaction.replied) {
        void interaction.followUp({ content, ephemeral: true }).catch(() => undefined);
      } else {
        void interaction.reply({ content, ephemeral: true }).catch(() => undefined);
      }
    });
  });

  return { client, output };
}
