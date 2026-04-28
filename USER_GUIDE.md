# 🧌 User Guide: How to Operate the Cave Goblin

Welcome. You have a Discord bot, a tmux cave, and a coding agent lurking inside your local repo. This is normal now.

---

## 🧵 Starting a Session

Create a thread under one of your configured project channels and send:

```text
!start
```

The bridge will create a persistent `tmux` session, launch the configured CLI agent, and wire that Discord thread to that terminal session.

After that, send normal messages in the thread:

```text
Check why the login page is throwing errors and suggest a fix.
```

The bridge will paste that into the agent like terminal input. Very glamorous. Very goblin. 🧌

---

## 🧪 Example Workflow

1. Create a thread:

   ```text
   Fix settings icon alignment
   ```

2. Start the agent:

   ```text
   !start
   ```

3. Ask for work:

   ```text
   Inspect the settings screen and find why the icon looks misaligned.
   ```

4. The bridge sends it into the local CLI session.
5. The agent works inside your configured project folder.
6. The bridge updates one live status message with the latest cleaned tmux pane.
7. Approval prompts still appear separately with buttons when Codex needs a decision.
8. Everyone watches the goblin cook without drowning in spinner soup. 🍳

---

## 💬 Normal Messages vs Commands

Normal messages go to the coding agent:

```text
Run the tests and summarize failures.
```

Messages beginning with `!` are bridge commands:

```text
!status
!tail 100
!ctrlc
```

So if you want to talk to the agent, do not start with `!` unless you enjoy confusing the cave machinery.

---

## 🎛️ Buttons for Prompts

When the agent asks for a simple choice, the bridge can turn known prompts into Discord buttons.

Example:

```text
Codex wants to run a command
[Yes, proceed] [Always for this command] [No / cancel]
```

Clicking a button sends the matching choice into tmux and presses Enter.

Currently supported Codex-style prompts:

- workspace trust prompt
- command approval prompt

This project expects Codex CLI. If you swap in another CLI later, its prompts may need their own detector goblins.

---

## 📎 Attachments

Upload files directly into the thread.

The bridge downloads them locally and sends the agent a path like:

```text
Attachment: /path/to/data/attachments/123/file.png
```

So screenshots, logs, configs, and cursed mystery files can be shown to the agent without manual copy/paste gymnastics.

---

## 🧽 Output Cleanup

Terminal apps love spewing haunted redraw fragments.

The bridge tries to clean stuff like:

```text
Working
orking
WWo
context left
esc to interrupt
gpt-5.5 default · ~/project
```

before showing them in Discord.

By default, active sessions use a **single live status message** per thread. The bridge edits that message every few seconds with the latest cleaned terminal window, rather than posting a fresh message for every `Working…` redraw.

Config knobs:

```yaml
bridge:
  live_status_update_ms: 5000
  live_status_lines: 50
```

This is basically regex with a broom. It is useful, but not divine. 🧹

---

## 🧰 Useful Commands

| Command | What it does |
|---|---|
| `!start` | Start the agent in this thread |
| `!status` | Show whether this thread has a running session |
| `!tail 100` | Show recent cleaned log output |
| `!dump` | Dump the full cleaned session log |
| `!clearlog` | Clear this thread's log file |
| `!tmux` | Show the local tmux attach command |
| `!enter` | Send Enter to the agent |
| `!escape` | Send Escape |
| `!ctrlc` | Send Ctrl-C, aka “stop that immediately” |
| `!restart` | Restart the thread's session |
| `!stop` | Stop the thread's session |
| `!help` | Show command help |

---

## 🖥️ Direct tmux Access

On the host machine, you can attach directly:

```sh
tmux ls
tmux attach -t <session-name>
```

Detach safely without killing the session:

```text
Ctrl-b then d
```

If you kill the tmux session manually, the Discord bridge may become confused and need `!restart`. It is only a goblin, not a prophet.
