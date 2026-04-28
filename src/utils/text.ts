import stripAnsi from "strip-ansi";

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export function cleanTerminalOutput(value: string): string {
  return applyBackspaces(stripAnsi(value))
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(CONTROL_CHARS, "")
    .trimEnd();
}

function applyBackspaces(value: string): string {
  const output: string[] = [];
  for (const char of value) {
    if (char === "\b" || char === "\u007f") {
      output.pop();
    } else {
      output.push(char);
    }
  }
  return output.join("");
}

export function chunkForDiscord(value: string, maxChars: number): string[] {
  if (value.length <= maxChars) return value.length === 0 ? [] : [value];

  const chunks: string[] = [];
  let remaining = value;
  while (remaining.length > maxChars) {
    const boundary = Math.max(
      remaining.lastIndexOf("\n", maxChars),
      remaining.lastIndexOf(" ", maxChars)
    );
    const cut = boundary > Math.floor(maxChars * 0.5) ? boundary : maxChars;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).replace(/^\n/, "");
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

export function codeBlock(value: string): string {
  const escaped = value.replace(/```/g, "`\u200b``");
  return `\`\`\`\n${escaped}\n\`\`\``;
}
