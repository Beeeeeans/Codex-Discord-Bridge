import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("config", () => {
  it("loads yaml and applies bridge defaults to projects", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "bridge-config-"));
    const configPath = path.join(dir, "config.yaml");
    process.env.TEST_DISCORD_TOKEN="test-token";

    await writeFile(
      configPath,
      `
discord:
  token_env: TEST_DISCORD_TOKEN
bridge:
  data_dir: ./data
  database_path: ./data/test.sqlite
  codex_command: codex
projects:
  - id: repo
    name: Repo
    channel_id: "42"
    workdir: ./workspace
`
    );

    const config = await loadConfig(configPath);
    expect(config.discord.token).toBe("test-token");
    expect(config.projects[0]?.codexCommand).toBe("codex");
    expect(config.projects[0]?.autoStartOnMessage).toBe(true);
    expect(path.isAbsolute(config.projects[0]?.workdir ?? "")).toBe(true);
  });
});
