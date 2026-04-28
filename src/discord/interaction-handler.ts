import type { ButtonInteraction } from "discord.js";
import { parsePromptCustomId } from "./interactive-prompts.js";
import { SessionManager } from "../sessions/session-manager.js";
import { Tmux } from "../sessions/tmux.js";

export class InteractionHandler {
  constructor(
    private readonly sessions: SessionManager,
    private readonly tmux: Tmux
  ) {}

  async onButton(interaction: ButtonInteraction): Promise<void> {
    const parsed = parsePromptCustomId(interaction.customId);
    if (!parsed) return;

    const record = this.sessions.get(parsed.threadId);
    if (!record) {
      await interaction.reply({ content: "No session is registered for that prompt anymore.", ephemeral: true });
      return;
    }

    const live = await this.sessions.ensureRunning(record);
    if (!live) {
      await interaction.reply({ content: "That Codex session is not running anymore.", ephemeral: true });
      return;
    }

    await this.tmux.sendText(record.tmuxSession, parsed.value);
    await delay(150);
    await this.tmux.sendEnter(record.tmuxSession);
    await interaction.update({
      content: `✅ Sent choice \`${parsed.value}\` to Codex.`,
      components: []
    });
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
