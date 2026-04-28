import { open, stat } from "node:fs/promises";
import { cleanTerminalOutput } from "../utils/text.js";

export interface TailResult {
  text: string;
  byteOffset: number;
}

export async function tailFromOffset(logPath: string, byteOffset: number): Promise<TailResult> {
  let size: number;
  try {
    size = (await stat(logPath)).size;
  } catch {
    return { text: "", byteOffset };
  }

  const start = byteOffset > size ? 0 : byteOffset;
  if (size <= start) return { text: "", byteOffset: size };

  const handle = await open(logPath, "r");
  try {
    const length = size - start;
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, start);
    return {
      text: cleanTerminalOutput(buffer.toString("utf8")),
      byteOffset: size
    };
  } finally {
    await handle.close();
  }
}

export async function tailLastLines(logPath: string, lines: number): Promise<string> {
  const result = await tailFromOffset(logPath, 0);
  const split = result.text.split("\n");
  return split.slice(Math.max(0, split.length - lines)).join("\n");
}
