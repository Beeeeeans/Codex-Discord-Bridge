# 🧌 Project Summary

**Codex Discord Bridge** is a standalone Discord-to-terminal bridge for running Codex CLI from Discord threads.

It started as a Codex bridge, but the core idea is more general:

```text
Discord thread → bridge daemon → tmux session → interactive CLI agent → local repo
```

No mystical cloud platform. No extra LLM layer. Just Discord, Node, tmux, SQLite, Codex CLI, and a suspicious amount of string cleaning.

---

## 🧠 What It Does

- Maps each Discord thread to its own persistent terminal session.
- Launches a configured CLI agent, such as Codex, inside a local project folder.
- Relays normal Discord messages into that CLI session.
- Captures terminal output and posts it back into the same Discord thread.
- Stores session metadata in SQLite so restarts are less tragic.
- Provides bridge commands like `!start`, `!status`, `!tail`, `!tmux`, `!ctrlc`, and `!restart`.
- Converts known approval prompts into Discord buttons where possible.

---

## 🧵 Main Idea

```text
One Discord thread = one terminal session = one task context
```

So instead of one massive cursed AI chat, each bug or feature gets its own tidy little cave.

Examples:

```text
Thread: Fix login redirect bug
Thread: Review checkout flow
Thread: Clean up settings page goblin CSS
```

Each thread can keep its own agent context and output history.

---

## 💸 Why It Is Cheap-ish

The bridge itself does not ask another AI what to do.

It simply relays:

```text
Discord message in → CLI agent
CLI output out → Discord
```

That means token usage belongs to the actual coding agent, not a pile of extra middleware having a meeting about it.

---

## 🧍 Standalone Runtime

The bridge itself is a normal standalone Node app.

The real requirement is:

```text
Discord bot + Node bridge + tmux + Codex CLI + local project folder
```

Other terminal-based agents could be explored later, but this release is intentionally documented as a standalone Codex CLI bridge. Codex-specific bits include:

- command name defaults
- prompt/button detection
- output cleanup filters
- approval menu mappings

---

## 🧌 Philosophy

This is not a giant AI platform.

It is a useful goblin pipe:

```text
Discord → tmux → CLI agent → tmux logs → Discord
```

Small, practical, slightly haunted, and surprisingly handy.
