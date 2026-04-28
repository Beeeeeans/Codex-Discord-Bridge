# 🧌 Codex Discord Bridge

> A tiny Discord goblin that shoves your messages into Codex, steals the terminal output, wipes off most of the slime, and throws it back into the thread. Beautiful? Sometimes. Useful? Alarmingly. 🪄

**Codex Discord Bridge** turns Discord threads into persistent Codex CLI sessions running on your own machine. It is a standalone Node app with no extra assistant framework required.

```text
Discord thread 💬 → bridge goblin 🧌 → tmux cave 🖥️ → Codex CLI 🤖 → local repo 📁
```

No extra assistant framework. No extra LLM in the middle. No majestic orchestration cathedral. Just a very determined courier gremlin with a clipboard.

---

## ✨ What This Beast Does

- 🧵 **One Discord thread = one Codex session**  
  Each bug/feature/task thread gets its own persistent context.

- 🖥️ **Runs Codex inside `tmux`**  
  Codex stays alive like a little terminal creature hiding in the walls.

- 📁 **Works in your real local repo**  
  Codex has access to your project files, git, package scripts, tests, and whatever chaos lives in your dev environment.

- 💸 **Low-token relay path**  
  Discord messages go straight to Codex. The bridge itself does not call another LLM to interpret every message.

- 🎛️ **Discord buttons for known Codex prompts**  
  Workspace trust? Command approval? Buttons. Lovely buttons. Less “type 1 like it’s 1998”.

- 📎 **Attachment support**  
  Upload a screenshot/file in Discord; the bridge downloads it locally and gives Codex the file path.

- 🧽 **Terminal grime removal**  
  Codex’s TUI sometimes emits haunted fragments like `WorkiWorkin`, `WWo`, and other cursed alphabet soup. The bridge attempts to clean that before posting.

- 🧠 **Restart-safe-ish sessions**  
  Session metadata is stored in SQLite so the daemon can remember which Discord thread mapped to which tmux cave.

---

## 🏗️ Why This Exists

Codex CLI is great, but sometimes you want the workflow to happen in Discord:

- friends/team can watch progress 👀
- each bug gets a thread 🐛
- context stays grouped 🧵
- you can poke Codex from your phone like a tiny code wizard 📱
- you avoid copy/pasting terminal sludge around like a medieval scribe 🪶

This bridge makes Discord feel like a lightweight remote UI for Codex, while Codex still runs locally where the code actually lives.

---

## 🧪 Example Flow

Create a Discord parent channel like:

```text
#codex-my-app
```

Create a thread:

```text
Fix settings page doing cursed goblin wobble
```

Start Codex:

```text
!start
```

Then send normal messages:

```text
Check why the settings icon alignment is weird and suggest a fix.
```

Under the floorboards, the bridge does this:

```text
Discord message
  ↓
Bridge receives it
  ↓
Bridge finds the thread's tmux session
  ↓
Bridge pastes your message into Codex
  ↓
Codex does coding goblin things
  ↓
Bridge captures + cleans output
  ↓
Discord gets the reply
```

---

## 🚀 Quick Start

### 1. Install dependencies

```sh
npm install
```

### 2. Copy the example config files

```sh
cp .env.example .env
cp config.example.yaml config.yaml
```

### 3. Add your Discord bot token

Edit `.env`:

```sh
DISCORD_TOKEN=your-discord-bot-token
CONFIG_PATH=./config.yaml
LOG_LEVEL=info
```

### 4. Configure your project

Edit `config.yaml`:

```yaml
projects:
  - id: example-project
    name: Example Project
    channel_id: "123456789012345678"
    workdir: "/absolute/path/to/your/project"
```

### 5. Build and run the goblin

```sh
npm run build
npm start
```

### 6. In Discord

Create a thread under your configured parent channel and send:

```text
!start
```

Congratulations. You have opened the cave. 🕳️🧌

---

## 🧰 Requirements

- Node.js 20+
- `tmux`
- Codex CLI on your `PATH`
- A Discord bot token
- Discord **Message Content Intent** enabled
- A local git repo/project for Codex to work in
- Emotional resilience when terminal UIs emit eldritch soup

---

## 🤖 Discord Bot Setup

1. Create an app in the Discord Developer Portal.
2. Add a bot user.
3. Enable **Message Content Intent**.
4. Invite the bot with permissions for:
   - view channels
   - read message history
   - send messages
   - send messages in threads
   - create/use public threads if desired
5. Create a parent text channel per project.
6. Copy the parent channel ID into `config.yaml`.

---

## 🧙 Commands

| Command | Goblin Translation |
|---|---|
| `!start` | Open the tmux cave and awaken Codex |
| `!stop` | Bonk the session on the head |
| `!restart` | Bonk, then resurrect |
| `!status` | Ask “is the creature alive?” |
| `!sessions` | List known cave goblins |
| `!tail [lines]` | Show recent cleaned output |
| `!dump` | Dump the full cleaned log, probably too much |
| `!clearlog` | Sweep the cave floor |
| `!cwd` | Show where Codex thinks it lives |
| `!project` | Show project mapping |
| `!tmux` | Print the local attach command |
| `!enter` | Press Enter for Codex |
| `!escape` | Send Escape |
| `!ctrlc` | Send Ctrl-C, the universal “stop licking that” |
| `!help` | Summon the command list |

---

## 🖥️ Direct tmux Access

If Discord is being dramatic, attach to the session locally:

```sh
tmux ls
tmux attach -t <session-name>
```

Detach without killing Codex:

```text
Ctrl-b then d
```

Do **not** just close the terminal like a barbarian unless you know what you’re doing. 🪓

---

## 🧽 About Output Cleanup

Codex is an interactive terminal app. Interactive terminal apps love repainting the screen 900 times a second like caffeinated raccoons.

Raw logs can contain nonsense like:

```text
Working
orking
rking
WWo
WorkiWorkin
gpt-5.5 default · ~/project
```

The bridge strips ANSI/control chars, filters known spinner/status fragments, batches output, and posts cleaner chunks back to Discord.

This is not magic. It is regex wearing a trench coat. 🕵️‍♂️

---

## 🧍 Standalone Runtime

**Yes, this runs as its own standalone app.**

The bridge does not need a separate assistant platform sitting in the middle, whispering into the soup like a Victorian ghost. 👻

The actual runtime shape is just:

```text
Discord bot → Node bridge → tmux → Codex CLI → local project files
```

You need:

- a Discord bot token
- the bot invited to your server/channel
- Message Content Intent enabled
- this Node app running somewhere
- `tmux` installed
- Codex CLI installed/authenticated on that machine
- `config.yaml` mapping Discord parent channels to local project folders

That is it. Users of this project just run the bridge app plus Codex CLI. Tiny goblin pipe, very little ceremony.

Could the architecture be adapted to other interactive CLI agents? Probably, if they can run in tmux and accept stdin. But this project is documented and shipped as a **Codex CLI bridge**. 🍝

---

## 🔐 Secrets and Runtime Junk

Do not commit:

- `.env`
- `config.yaml`
- `data/`
- `dist/`
- `node_modules/`

The `.gitignore` already ignores them. Keep your Discord token out of GitHub unless you enjoy emergency key rotation as a lifestyle. 🔥

---

## ⚠️ Caveats

- This is a bridge around an interactive terminal app, so weird TUI edge cases can happen.
- Output cleanup may need tuning as Codex changes its UI.
- Reusing a bot identity that another assistant uses can cause weirdness. A dedicated bot is cleaner.
- It can run commands in your local repo. Treat access like giving someone a terminal with a funny hat. 🎩

---

## 🧌 Philosophy

This project is not a grand platform.

It is a useful little goblin pipe:

```text
message in → coding agent does stuff → output out
```

Low ceremony. Low token waste. High probability of yelling “why is Discord showing `WWo` again?”

Perfect software, basically.
