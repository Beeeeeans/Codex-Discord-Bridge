import { describe, expect, it } from "vitest";
import { cleanForDiscord, shouldFlushBufferedOutput } from "../src/discord/output-sender.js";

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

  it("flushes buffered output after a maximum wait even while terminal output keeps streaming", () => {
    expect(
      shouldFlushBufferedOutput({
        nowMs: 10_001,
        lastOutputAtMs: 10_000,
        firstBufferedAtMs: 0,
        idleMs: 1_200,
        maxBufferMs: 10_000
      })
    ).toBe(true);
  });

  it("waits for idle output before the maximum wait is reached", () => {
    expect(
      shouldFlushBufferedOutput({
        nowMs: 5_000,
        lastOutputAtMs: 4_900,
        firstBufferedAtMs: 0,
        idleMs: 1_200,
        maxBufferMs: 10_000
      })
    ).toBe(false);
  });
});
