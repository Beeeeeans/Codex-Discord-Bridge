import type { Message } from "discord.js";
import type { AppConfig, ProjectConfig } from "../sessions/session-types.js";
import { SessionManager } from "../sessions/session-manager.js";
import { Tmux } from "../sessions/tmux.js";
import type { CommandContext } from "./bridge-commands.js";
import {
  clearLogCommand,
  ctrlCCommand,
  cwdCommand,
  dumpCommand,
  enterCommand,
  escapeCommand,
  helpCommand,
  projectCommand,
  restartCommand,
  sessionsCommand,
  startCommand,
  statusCommand,
  stopCommand,
  tailCommand,
  tmuxCommand
} from "./bridge-commands.js";

type Handler = (ctx: CommandContext) => Promise<void>;

const handlers: Record<string, Handler> = {
  start: startCommand,
  stop: stopCommand,
  restart: restartCommand,
  status: statusCommand,
  sessions: sessionsCommand,
  tail: tailCommand,
  dump: dumpCommand,
  clearlog: clearLogCommand,
  cwd: cwdCommand,
  project: projectCommand,
  tmux: tmuxCommand,
  enter: enterCommand,
  escape: escapeCommand,
  ctrlc: ctrlCCommand,
  help: helpCommand
};

export class CommandRouter {
  constructor(
    private readonly config: AppConfig,
    private readonly sessions: SessionManager,
    private readonly tmux: Tmux
  ) {}

  isCommand(content: string): boolean {
    return content.trimStart().startsWith(this.config.bridge.commandPrefix);
  }

  async route(message: Message, project: ProjectConfig): Promise<boolean> {
    const trimmed = message.content.trim();
    if (!trimmed.startsWith(this.config.bridge.commandPrefix)) return false;

    const withoutPrefix = trimmed.slice(this.config.bridge.commandPrefix.length);
    const [name = "", ...args] = withoutPrefix.split(/\s+/);
    const handler = handlers[name.toLowerCase()];
    if (!handler) {
      await message.reply(`Unknown command \`${name}\`. Try \`${this.config.bridge.commandPrefix}help\`.`);
      return true;
    }

    await handler({ message, args, project, config: this.config, sessions: this.sessions, tmux: this.tmux });
    return true;
  }
}
