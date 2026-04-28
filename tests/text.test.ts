import { describe, expect, it } from "vitest";
import { chunkForDiscord, cleanTerminalOutput } from "../src/utils/text.js";
import { tmuxSessionName } from "../src/utils/ids.js";

describe("text utilities", () => {
  it("strips ansi and control characters", () => {
    expect(cleanTerminalOutput("\u001b[31mhello\u001b[0m\r\nworld\u0007")).toBe("hello\nworld");
  });

  it("chunks text under the requested limit", () => {
    const chunks = chunkForDiscord("alpha beta gamma delta", 10);
    expect(chunks.every((chunk) => chunk.length <= 10)).toBe(true);
    expect(chunks.join("").replace(/\s+/g, "")).toBe("alphabetagammadelta");
  });

  it("applies terminal backspace overstrikes before posting output", () => {
    expect(cleanTerminalOutput("Codx\bex ready")).toBe("Codex ready");
  });

  it("builds stable tmux session names", () => {
    expect(tmuxSessionName("123")).toBe(tmuxSessionName("123"));
    expect(tmuxSessionName("123")).toMatch(/^codex_[a-f0-9]{12}$/);
  });
});
