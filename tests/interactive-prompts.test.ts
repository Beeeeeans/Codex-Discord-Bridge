import { describe, expect, it } from "vitest";
import { detectChoicePrompt } from "../src/discord/interactive-prompts.js";

describe("interactive Codex prompt detection", () => {
  it("detects the Codex workspace trust prompt and maps choices to terminal input", () => {
    const prompt = detectChoicePrompt(
      "> You are in /Users/example/project\n" +
        "Do you trust the contents of this directory?\n" +
        "Working with untrusted content comes with higher risk of prompt injection.\n" +
        "1. Yes, continue\n" +
        "2. No, quit\n" +
        "Press enter to continue",
      "thread-1"
    );

    expect(prompt).toEqual({
      kind: "choice",
      threadId: "thread-1",
      title: "Codex needs a choice",
      question: "Trust this project directory?",
      details: "/Users/example/project",
      choices: [
        { id: "yes", label: "Yes, continue", value: "1", style: "success" },
        { id: "no", label: "No, quit", value: "2", style: "danger" }
      ]
    });
  });

  it("detects Codex command approval prompts and maps each menu option to a button", () => {
    const prompt = detectChoicePrompt(
      "Would you like to run the following command?\n\n" +
        "Reason: Allow git pull to update .git/FETCH_HEAD and fetch from the remote?\n\n" +
        "$ git pull\n\n" +
        "1. Yes, proceed (y)\n" +
        "2. Yes, and don't ask again for commands that start with `git pull` (p)\n" +
        "3. No, and tell Codex what to do differently (esc)\n\n" +
        "Press enter to confirm or esc to cancel",
      "thread-1"
    );

    expect(prompt).toEqual({
      kind: "choice",
      threadId: "thread-1",
      title: "Codex wants to run a command",
      question: "Allow this command?",
      details: "$ git pull",
      choices: [
        { id: "yes", label: "Yes, proceed", value: "1", style: "success" },
        { id: "always", label: "Always for this command", value: "2", style: "primary" },
        { id: "no", label: "No / cancel", value: "3", style: "danger" }
      ]
    });
  });

  it("returns undefined for normal Codex output", () => {
    expect(detectChoicePrompt("All tests passed", "thread-1")).toBeUndefined();
  });
});
