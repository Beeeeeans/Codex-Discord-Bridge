import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export type ChoiceStyle = "primary" | "secondary" | "success" | "danger";

export interface PromptChoice {
  id: string;
  label: string;
  value: string;
  style: ChoiceStyle;
}

export interface ChoicePrompt {
  kind: "choice";
  threadId: string;
  title: string;
  question: string;
  details?: string;
  choices: PromptChoice[];
}

const TRUST_PROMPT_COMPACT = "doyoutrustthecontentsofthisdirectory";
const COMMAND_APPROVAL_COMPACT = "wouldyouliketorunthefollowingcommand";

export function detectChoicePrompt(text: string, threadId: string): ChoicePrompt | undefined {
  const compact = text.toLowerCase().replace(/[^a-z0-9/._~-]+/g, "");
  if (compact.includes(COMMAND_APPROVAL_COMPACT)) return commandApprovalPrompt(text, threadId);
  if (!compact.includes(TRUST_PROMPT_COMPACT)) return undefined;

  const directory = extractDirectory(text);

  return {
    kind: "choice",
    threadId,
    title: "Codex needs a choice",
    question: "Trust this project directory?",
    details: directory,
    choices: [
      { id: "yes", label: "Yes, continue", value: "1", style: "success" },
      { id: "no", label: "No, quit", value: "2", style: "danger" }
    ]
  };
}

function commandApprovalPrompt(text: string, threadId: string): ChoicePrompt {
  return {
    kind: "choice",
    threadId,
    title: "Codex wants to run a command",
    question: "Allow this command?",
    details: extractCommand(text),
    choices: [
      { id: "yes", label: "Yes, proceed", value: "1", style: "success" },
      { id: "always", label: "Always for this command", value: "2", style: "primary" },
      { id: "no", label: "No / cancel", value: "3", style: "danger" }
    ]
  };
}

export function promptCustomId(prompt: ChoicePrompt, choice: PromptChoice): string {
  return `codex-choice:${prompt.threadId}:${choice.id}:${choice.value}`;
}

export function parsePromptCustomId(customId: string): { threadId: string; choiceId: string; value: string } | undefined {
  const [prefix, threadId, choiceId, value] = customId.split(":");
  if (prefix !== "codex-choice" || !threadId || !choiceId || !value) return undefined;
  return { threadId, choiceId, value };
}

export function choicePromptComponents(prompt: ChoicePrompt): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    prompt.choices.map((choice) =>
      new ButtonBuilder()
        .setCustomId(promptCustomId(prompt, choice))
        .setLabel(choice.label)
        .setStyle(buttonStyle(choice.style))
    )
  );
  return [row];
}

export function choicePromptContent(prompt: ChoicePrompt): string {
  const detail = prompt.details ? `\n\`${prompt.details}\`` : "";
  return `**${prompt.title}**\n${prompt.question}${detail}`;
}

function buttonStyle(style: ChoiceStyle): ButtonStyle {
  switch (style) {
    case "primary":
      return ButtonStyle.Primary;
    case "success":
      return ButtonStyle.Success;
    case "danger":
      return ButtonStyle.Danger;
    case "secondary":
    default:
      return ButtonStyle.Secondary;
  }
}

function extractCommand(text: string): string | undefined {
  const commandLine = text.match(/^\s*\$\s*(.+)$/m)?.[1];
  return commandLine ? `$ ${commandLine.trim()}` : undefined;
}

function extractDirectory(text: string): string | undefined {
  const explicit = text.match(/(?:in|directory:)\s+([~\/][^\n\r` ]+)/i)?.[1];
  if (explicit) return explicit;
  const pathLike = text.match(/(\/Users\/[^\n\r` ]+)/)?.[1];
  return pathLike;
}
