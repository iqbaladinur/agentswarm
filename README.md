# AgentSwarm

Claude Code session manager with workspace isolation. Desktop app built with Tauri 2.

Manage multiple Claude Code sessions across different git branches, each isolated in its own worktree with a dedicated terminal.

## Features

- **Repository management** — Open and switch between multiple git repos
- **Task isolation** — Each task creates a git worktree + branch, keeping work completely separate
- **Embedded terminal** — ttyd-based terminal per task, auto-launches `claude` CLI
- **Git integration** — View commit log, diff, changed files, and merge back to main
- **VS Code integration** — Open any task's worktree in VS Code with one click
- **Session persistence** — Tasks and repos persist across app restarts (SQLite)

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Tauri 2 (Rust)                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │   DB     │  │   PTY    │  │  Git (std::   │  │
│  │ (SQLite) │  │  Manager │  │  process)     │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│       │              │               │           │
│       ▼              ▼               ▼           │
│  ┌─────────────────────────────────────────────┐ │
│  │           Tauri IPC (invoke)                │ │
│  └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│              WebView (React + Vite)              │
│  ┌────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │Sidebar │ │ TaskPanel│ │  Terminal (iframe)│  │
│  │        │ │ (Git/Files)│ │   → ttyd:port    │  │
│  └────────┘ └──────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────┘
```

- **Backend**: Rust (Tauri 2) — SQLite via rusqlite, git via `std::process::Command`
- **Frontend**: React 18 + TypeScript + Zustand + Tailwind CSS
- **Terminal**: ttyd sidecar — spawned per-task on random ports, embedded via `<iframe>`

## Prerequisites

- Rust 1.79+ (recommended: 1.95+)
- Node.js 18+
- [ttyd](https://github.com/tsl0922/ttyd) — terminal over HTTP

Install ttyd:

```bash
sudo apt install ttyd
# or download from https://github.com/tsl0922/ttyd/releases
```

## Getting Started

```bash
# Install JS dependencies
npm install

# Run in dev mode (starts Vite + Tauri dev server)
npm run dev

# Build for production
npm run build
```

The dev server starts Vite on `http://localhost:47821`, then opens a Tauri window pointing to it.

## Usage

1. **Open a repo** — Type a path or browse folders on the welcome screen
2. **Create a task** — Click "+ New Task" in the sidebar, enter a name
3. **Work in the terminal** — Each task opens an embedded terminal (ttyd) that auto-runs `claude`
4. **Track changes** — Use the Git tab to view commits and file changes
5. **Merge** — When done, click "Merge to main" in the Git tab
6. **Switch repos** — Click the repo header to open the dropdown and switch

## How It Works

### Worktree Isolation

Each task creates:
- A git branch: `task/<slug>-<id>`
- A git worktree: `<repo>/.worktrees/<id>/`

The worktree is a separate working directory with its own branch, so tasks never interfere with each other or the main workspace.

### Terminal (ttyd)

When a task opens:
1. Rust finds a free TCP port
2. Spawns `ttyd --interface 127.0.0.1 --port <port> --writable sh -c 'claude; exec $SHELL'` in the worktree directory
3. Frontend embeds an `<iframe>` pointed at `http://127.0.0.1:<port>`
4. On task close, the ttyd process is killed

### Storage

SQLite database at `~/.agentswarm/agentswarm.db` (WAL mode) stores repos and tasks. No external database needed.

## Project Structure

```
src/
├── renderer/
│   ├── App.tsx                    # Root layout + routing
│   ├── main.tsx                   # Entry point
│   ├── index.css                  # Global styles
│   ├── lib/api.ts                 # Tauri IPC wrappers
│   ├── store/
│   │   ├── taskStore.ts           # Zustand store (repos + tasks)
│   │   └── uiStore.ts            # Zustand store (UI state)
│   └── components/
│       ├── TitleBar.tsx           # Custom window title bar
│       ├── Sidebar/               # Repo/task sidebar
│       ├── TaskPanel/             # Terminal, Git, Files tabs
│       ├── WelcomeScreen.tsx      # Initial repo selection
│       └── FolderPicker.tsx       # In-app directory browser
├── shared/ipc-types.ts            # Shared TypeScript types
src-tauri/
├── src/
│   ├── lib.rs                     # Tauri commands
│   ├── db.rs                      # SQLite operations
│   ├── git.rs                     # Git operations
│   └── pty_mgr.rs                 # ttyd process manager
├── Cargo.toml
└── tauri.conf.json
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2 (Rust) |
| Database | SQLite (rusqlite, bundled) |
| Git | `std::process::Command` |
| Terminal | ttyd sidecar |
| Frontend | React 18, TypeScript, Vite |
| State | Zustand |
| Styling | Tailwind CSS |
