import { createHash } from "node:crypto";

export function tmuxSessionName(threadId: string): string {
  const digest = createHash("sha256").update(threadId).digest("hex").slice(0, 12);
  return `codex_${digest}`;
}

export function safePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}
