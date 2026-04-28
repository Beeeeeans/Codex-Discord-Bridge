import { execa } from "execa";

export class Tmux {
  async assertAvailable(): Promise<void> {
    await this.run(["-V"]);
  }

  async hasSession(sessionName: string): Promise<boolean> {
    try {
      await this.run(["has-session", "-t", sessionName]);
      return true;
    } catch {
      return false;
    }
  }

  async startSession(options: {
    sessionName: string;
    workdir: string;
    command: string;
    args: string[];
    logPath: string;
  }): Promise<void> {
    const shellCommand = [quote(options.command), ...options.args.map(quote)].join(" ");
    await this.run(["new-session", "-d", "-s", options.sessionName, "-c", options.workdir, shellCommand]);
    await this.pipePane(options.sessionName, options.logPath);
  }

  async pipePane(sessionName: string, logPath: string): Promise<void> {
    await this.run(["pipe-pane", "-o", "-t", sessionName, `cat >> ${quote(logPath)}`]);
  }

  async stopSession(sessionName: string): Promise<void> {
    if (await this.hasSession(sessionName)) {
      await this.run(["kill-session", "-t", sessionName]);
    }
  }

  async sendText(sessionName: string, text: string): Promise<void> {
    await this.run(["load-buffer", "-b", sessionName, "-"], { input: text });
    await this.run(["paste-buffer", "-b", sessionName, "-t", sessionName]);
  }

  async sendEnter(sessionName: string): Promise<void> {
    await this.run(["send-keys", "-t", sessionName, "Enter"]);
  }

  async clearCurrentLine(sessionName: string): Promise<void> {
    await this.run(["send-keys", "-t", sessionName, "C-u"]);
  }

  async sendEscape(sessionName: string): Promise<void> {
    await this.run(["send-keys", "-t", sessionName, "Escape"]);
  }

  async sendCtrlC(sessionName: string): Promise<void> {
    await this.run(["send-keys", "-t", sessionName, "C-c"]);
  }

  async capturePane(sessionName: string, lines = 80): Promise<string> {
    const result = await this.run(["capture-pane", "-p", "-t", sessionName, "-S", `-${lines}`]);
    return result.stdout;
  }

  async listSessions(): Promise<string> {
    const result = await this.run(["list-sessions"]);
    return result.stdout;
  }

  private async run(args: string[], options: { input?: string } = {}) {
    return execa("tmux", args, {
      input: options.input,
      reject: true
    });
  }
}

function quote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
