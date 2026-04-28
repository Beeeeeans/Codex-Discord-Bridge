import fs from "node:fs/promises";
import path from "node:path";
import type { StartSessionInput, SessionRecord } from "./session-types.js";
import { SessionStore } from "./session-store.js";
import { Tmux } from "./tmux.js";
import { tmuxSessionName, safePathSegment } from "../utils/ids.js";

export class SessionManager {
  constructor(
    private readonly store: SessionStore,
    private readonly tmux: Tmux,
    private readonly dataDir: string
  ) {}

  async start(input: StartSessionInput): Promise<SessionRecord> {
    const existing = this.store.get(input.threadId);
    if (existing && (await this.tmux.hasSession(existing.tmuxSession))) {
      await this.tmux.pipePane(existing.tmuxSession, existing.logPath);
      this.store.updateStatus(input.threadId, "running");
      return { ...existing, status: "running" };
    }

    const now = new Date().toISOString();
    const tmuxSession = existing?.tmuxSession ?? tmuxSessionName(input.threadId);
    const logPath =
      existing?.logPath ??
      path.join(this.dataDir, "logs", `${safePathSegment(input.threadId)}.log`);

    await fs.mkdir(path.dirname(logPath), { recursive: true });

    const record: SessionRecord = {
      threadId: input.threadId,
      channelId: input.channelId,
      projectId: input.project.id,
      tmuxSession,
      workdir: input.project.workdir,
      logPath,
      status: "running",
      byteOffset: existing?.byteOffset ?? 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    await this.tmux.startSession({
      sessionName: tmuxSession,
      workdir: input.project.workdir,
      command: input.project.codexCommand,
      args: input.project.codexArgs,
      logPath
    });
    this.store.upsert(record);
    return record;
  }

  async stop(threadId: string): Promise<SessionRecord | undefined> {
    const record = this.store.get(threadId);
    if (!record) return undefined;
    await this.tmux.stopSession(record.tmuxSession);
    this.store.updateStatus(threadId, "stopped");
    return { ...record, status: "stopped" };
  }

  async restart(input: StartSessionInput): Promise<SessionRecord> {
    await this.stop(input.threadId);
    return this.start(input);
  }

  get(threadId: string): SessionRecord | undefined {
    return this.store.get(threadId);
  }

  list(): SessionRecord[] {
    return this.store.list();
  }

  updateOffset(threadId: string, byteOffset: number): void {
    this.store.updateOffset(threadId, byteOffset);
  }

  async ensureRunning(record: SessionRecord): Promise<boolean> {
    const running = await this.tmux.hasSession(record.tmuxSession);
    if (!running && record.status === "running") {
      this.store.updateStatus(record.threadId, "stopped");
    }
    return running;
  }
}
