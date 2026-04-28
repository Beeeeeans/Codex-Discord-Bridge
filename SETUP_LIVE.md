# 🧌 Setup Guide: Summoning the Bridge Goblin

This guide gets the Discord ↔ tmux ↔ Codex cave system running without sacrificing a keyboard to the terminal gods. Probably.

---

## 1. Discord Setup 🤖

1. Go to the Discord Developer Portal.
2. Create an application.
3. Add a bot user.
4. Enable **Message Content Intent**.
5. Invite the bot to your server with permissions to:
   - view channels 👀
   - read message history 📚
   - send messages 💬
   - send messages in threads 🧵
   - create/use public threads if you want extra thread goblin powers
6. Create a parent text channel for each project, for example:

   ```text
   #codex-my-app
   #codex-backend
   #codex-chaos-lab
   ```

7. Enable Developer Mode in Discord.
8. Right-click the parent channel and choose **Copy Channel ID**.
9. Paste that majestic number into `config.yaml`.

---

## 2. Host Setup 🖥️

Install `tmux`, aka the cave where Codex lives:

```sh
brew install tmux
```

Install project dependencies:

```sh
npm install
```

Create your local env file:

```sh
cp .env.example .env
```

Edit `.env`:

```sh
DISCORD_TOKEN=your-discord-bot-token
CONFIG_PATH=./config.yaml
LOG_LEVEL=info
```

Do not commit `.env`, unless you enjoy pain, shame, and rotating tokens at 2am. 🔥

---

## 3. Configure a Project 📁

Create config:

```sh
cp config.example.yaml config.yaml
```

Edit `config.yaml`:

```yaml
projects:
  - id: example-project
    name: Example Project
    channel_id: "123456789012345678"
    workdir: "/absolute/path/to/your/project"
    auto_start_on_message: true
    codex_command: "codex"
    codex_args: []

bridge:
  live_status_update_ms: 5000
  live_status_lines: 50
```

Important bits:

- `channel_id` = Discord parent channel ID
- `workdir` = local git repo where Codex should wake up
- `codex_command` = CLI command to run inside tmux
- `live_status_update_ms` = how often the bridge edits the one live status message per thread
- `live_status_lines` = how many cleaned tmux pane lines to show in that live status message

The default expectation is Codex CLI. If you later decide to hack in another terminal-based agent, that is adapter territory — bring snacks and a small fire extinguisher. 🧯

---

## 4. Build and Run 🚀

```sh
npm run build
npm start
```

If the goblin wakes up correctly, it should log into Discord and start watching configured project channels.

For production, use a process manager:

- `launchd` on macOS 🍎
- `systemd` on Linux 🐧
- `pm2` if you enjoy Node-shaped convenience 🟩
- a cursed always-open terminal window if you are living dangerously 🧨

---

## 5. Verification ✅

In Discord:

1. Create a thread under a configured parent project channel.
2. Send:

   ```text
   !start
   ```

3. Check local tmux sessions:

   ```sh
   tmux ls
   ```

4. Send something normal in the Discord thread:

   ```text
   Check git status and tell me whether this repo is clean.
   ```

5. Confirm the bridge creates/edits one live “Codex is working…” status message in the same thread.

If it does, the cave is alive. 🕳️✨

---

## 6. Debugging the Goblin 🧯

Attach to a live tmux session:

```sh
tmux attach -t <session-name>
```

Detach safely:

```text
Ctrl-b then d
```

Capture visible pane output without attaching:

```sh
tmux capture-pane -p -t <session-name> -S -80
```

Useful Discord commands:

```text
!status
!tmux
!tail 100
!dump
!ctrlc
!restart
```

If Discord says nothing, check:

- Is the bridge process running?
- Is the message inside a thread, not just the parent channel?
- Is the parent channel ID correct?
- Does the bot have Message Content Intent?
- Is Codex actually installed on `PATH`?
- Did tmux summon a session or sulk silently?

---

## 7. Cleanliness Rules 🧼

Never commit:

```text
.env
config.yaml
data/
dist/
node_modules/
```

The repo’s `.gitignore` already handles this. Still, check before pushing, because GitHub never forgets and secrets are spicy. 🌶️
