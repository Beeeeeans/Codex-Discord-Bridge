import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { SessionRecord, SessionStatus } from "./session-types.js";

interface SessionRow {
  thread_id: string;
  channel_id: string;
  project_id: string;
  tmux_session: string;
  workdir: string;
  log_path: string;
  status: SessionStatus;
  byte_offset: number;
  created_at: string;
  updated_at: string;
}

export class SessionStore {
  private readonly db: Database.Database;

  constructor(databasePath: string) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    this.db = new Database(databasePath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        thread_id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        tmux_session TEXT NOT NULL UNIQUE,
        workdir TEXT NOT NULL,
        log_path TEXT NOT NULL,
        status TEXT NOT NULL,
        byte_offset INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  upsert(record: SessionRecord): void {
    this.db.prepare(`
      INSERT INTO sessions (
        thread_id, channel_id, project_id, tmux_session, workdir, log_path, status,
        byte_offset, created_at, updated_at
      ) VALUES (
        @threadId, @channelId, @projectId, @tmuxSession, @workdir, @logPath, @status,
        @byteOffset, @createdAt, @updatedAt
      )
      ON CONFLICT(thread_id) DO UPDATE SET
        channel_id = excluded.channel_id,
        project_id = excluded.project_id,
        tmux_session = excluded.tmux_session,
        workdir = excluded.workdir,
        log_path = excluded.log_path,
        status = excluded.status,
        byte_offset = excluded.byte_offset,
        updated_at = excluded.updated_at
    `).run(record);
  }

  get(threadId: string): SessionRecord | undefined {
    const row = this.db.prepare("SELECT * FROM sessions WHERE thread_id = ?").get(threadId) as
      | SessionRow
      | undefined;
    return row ? fromRow(row) : undefined;
  }

  list(): SessionRecord[] {
    const rows = this.db.prepare("SELECT * FROM sessions ORDER BY updated_at DESC").all() as SessionRow[];
    return rows.map(fromRow);
  }

  listRunning(): SessionRecord[] {
    const rows = this.db.prepare("SELECT * FROM sessions WHERE status = 'running'").all() as SessionRow[];
    return rows.map(fromRow);
  }

  updateOffset(threadId: string, byteOffset: number): void {
    this.db
      .prepare("UPDATE sessions SET byte_offset = ?, updated_at = ? WHERE thread_id = ?")
      .run(byteOffset, new Date().toISOString(), threadId);
  }

  updateStatus(threadId: string, status: SessionStatus): void {
    this.db
      .prepare("UPDATE sessions SET status = ?, updated_at = ? WHERE thread_id = ?")
      .run(status, new Date().toISOString(), threadId);
  }

  close(): void {
    this.db.close();
  }
}

function fromRow(row: SessionRow): SessionRecord {
  return {
    threadId: row.thread_id,
    channelId: row.channel_id,
    projectId: row.project_id,
    tmuxSession: row.tmux_session,
    workdir: row.workdir,
    logPath: row.log_path,
    status: row.status,
    byteOffset: row.byte_offset,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
