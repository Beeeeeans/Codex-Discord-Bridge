import { execa } from "execa";

export async function commandExists(command: string): Promise<boolean> {
  try {
    await execa("sh", ["-lc", `command -v ${JSON.stringify(command)} >/dev/null 2>&1`]);
    return true;
  } catch {
    return false;
  }
}
