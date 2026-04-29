import { describe, expect, it } from "vitest";
import { cleanForDiscord, formatLiveStatusMessage, isLiveStatusMessage, shouldEditLiveStatus, shouldUpdateLiveStatusContent } from "../src/discord/output-sender.js";

describe("Codex output cleanup", () => {
  it("removes Codex TUI spinner fragments and prompt echoes while keeping useful output", () => {
    const raw = `git status
Run /review on my current changes
• Working(0s
• orking
• rking
• king
ing
• ngg1
WWo
• Wor
• Work
• WorkiWorkin
•
• Checking it again now.Working
• orking
• rking
• king
ing
• ngg • 1 background terminal running · /ps to view…
• Ran git status --short --branch
┃ ## main...origin/main
WWo
• Wor
• Work
• WorkiWorkin
•
• Workingorking
• Still clean: main is tracking origin/main with no local changes.
•›Run /review on my current changes  gpt-5.5 default · ~/project`;

    expect(cleanForDiscord(raw)).toBe(
      [
        "Ran git status --short --branch",
        "┃ ## main...origin/main",
        "Still clean: main is tracking origin/main with no local changes."
      ].join("\n")
    );
  });

  it("keeps useful text when Codex prompt/status garbage is concatenated on the same line", () => {
    const raw = [
      "git statusRun /review on my current changes",
      "One more status check coming up.2WWo",
      "Ran git status --short --branch",
      "L ## main...origin/main",
      "______________________________________________________________________________________4WWo",
      "KWWo•Wor",
      "• Clean again: main is tracking origin/main, with no uncommitted changes.›Run /review on my current changes  gpt-5.5 default · ~/project"
    ].join("\n");

    expect(cleanForDiscord(raw)).toBe(
      [
        "One more status check coming up.",
        "Ran git status --short --branch",
        "┃ ## main...origin/main",
        "Clean again: main is tracking origin/main, with no uncommitted changes."
      ].join("\n")
    );
  });

  it("edits the live status message only after the configured interval", () => {
    expect(shouldEditLiveStatus({ nowMs: 10_000, lastEditMs: undefined, updateMs: 5_000 })).toBe(true);
    expect(shouldEditLiveStatus({ nowMs: 14_999, lastEditMs: 10_000, updateMs: 5_000 })).toBe(false);
    expect(shouldEditLiveStatus({ nowMs: 15_000, lastEditMs: 10_000, updateMs: 5_000 })).toBe(true);
  });

  it("formats a bounded live status window from the latest cleaned pane lines", () => {
    const text = formatLiveStatusMessage({
      cleanedPaneText: ["one", "two", "three", "four"].join("\n"),
      lineCount: 2,
      now: new Date("2026-04-28T04:32:15Z")
    });

    expect(text).toBe([
      "🧠 Codex is working…",
      "",
      "```console",
      "three",
      "four",
      "```",
      "Updated 04:32:15"
    ].join("\n"));
  });

  it("does not refresh live status when the cleaned pane content has not changed", () => {
    expect(shouldUpdateLiveStatusContent({ previousContentKey: undefined, nextContentKey: "same output" })).toBe(true);
    expect(shouldUpdateLiveStatusContent({ previousContentKey: "same output", nextContentKey: "same output" })).toBe(false);
    expect(shouldUpdateLiveStatusContent({ previousContentKey: "old output", nextContentKey: "new output" })).toBe(true);
  });

  it("recognises existing live status messages so restarts can reuse them", () => {
    expect(isLiveStatusMessage("🧠 Codex is working…\n\n```console\nold output\n```\nUpdated 21:35:01")).toBe(true);
    expect(isLiveStatusMessage("**Codex wants to run a command**\nAllow this command?")).toBe(false);
    expect(isLiveStatusMessage("Started Codex session `codex_123`.")).toBe(false);
  });
});
