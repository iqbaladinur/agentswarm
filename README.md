# AgentSwarm

Multi-agent coding session manager with workspace isolation. Desktop app built with Tauri 2.

Manage multiple AI agent sessions (Claude Code, GitHub Copilot, Codex, Gemini CLI, or any custom agent) across different git branches, each isolated in its own worktree with a dedicated terminal.

## Features

- **Repository management** — Open, validate, and switch between multiple git repos. Persists recently opened repos with last-opened timestamps. Native OS folder picker or manual path input.
- **Task isolation** — Each task automatically creates a dedicated git branch (`task/<slug>-<id>`) and worktree under `<repo>/.worktrees/<id>/`, keeping work completely separate. Tasks never interfere with each other or the main workspace.
- **Embedded terminal** — ttyd-based terminal per task embedded via `<iframe>`. Auto-launches your configured agent CLI in the correct worktree directory on open. Falls back to `$SHELL` when the agent exits. Up to 3 concurrent task panels with resizable split layout.
- **Git integration** — Visual commit graph (`git log --graph --all -30`) with colored graph lines and ref labels. Side-by-side diff viewer with syntax-colored additions, deletions, and hunk headers. Changed files list parsed from `git status --porcelain` with color-coded status indicators (M/A/D/R/?). Stage-and-commit workflow with message input. One-click merge back to main branch.
- **VS Code integration** — Open any task's worktree in VS Code as a new window with one click. Click individual changed files to open them directly.
- **Session persistence** — Tasks, repos, and their metadata persist across app restarts via local SQLite database (WAL mode). No external database or cloud dependency.

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

- **Backend**: Rust (Tauri 2) with 18 IPC commands across 5 domains — repo CRUD, task/worktree lifecycle, PTY/terminal management, git operations, and filesystem browsing.
- **Frontend**: React 18 + TypeScript + Zustand + Tailwind CSS. Uses `react-resizable-panels` for split-pane layout.
- **Terminal**: ttyd sidecar — spawned per-task on random ephemeral ports, embedded via `<iframe>`. Auto-detects ttyd binary in PATH or common locations.
- **Storage**: SQLite via rusqlite (bundled) at `~/.agentswarm/agentswarm.db` — WAL journal mode, foreign keys enabled.

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

1. **Open a repo** — Type a path or browse folders on the welcome screen. The app validates it as a git repository before adding it.
2. **Switch repos** — Click the repo header to open the dropdown and switch between tracked repos, or open another.
3. **Create a task** — Click "+ New Task" in the sidebar, enter a name. A git branch and worktree are created automatically.
4. **Work in the terminal** — Click a task to open its panel with an embedded terminal (ttyd) that auto-runs your configured agent in the worktree directory.
5. **Track changes** — Use the Files tab to see changed files with color-coded status. Type a commit message and commit directly. Use the Git tab to view the commit graph (30 most recent across all branches) and click any commit to see its diff.
6. **Merge** — When done, click "Merge to main" in the Git tab. The app checks out main, merges the task branch, and returns to the task branch.
7. **Open in VS Code** — Click the VS Code button in any task panel header to open the worktree in a new VS Code window.
8. **Delete a task** — Hover over a task in the sidebar and click the (x) button. A confirmation dialog prevents accidental deletion. The worktree and branch are cleaned up.

## How It Works

### Worktree Isolation

Each task creates:
- A git branch: `task/<slug>-<id>` (auto-generated from task name + short UUID)
- A git worktree: `<repo>/.worktrees/<id>/`

The worktree is a separate working directory with its own branch. If the repository has no commits yet, an empty "init" commit is created first (git worktree requires a commit). Tasks never interfere with each other or the main workspace.

### Terminal (ttyd)

When a task opens:
1. Rust finds a free TCP port (binds to `127.0.0.1:0` for an ephemeral port)
2. Resolves the `ttyd` binary (checks PATH, `/usr/local/bin/ttyd`, `/usr/bin/ttyd`, `~/.local/bin/ttyd`)
3. Spawns `ttyd --interface 127.0.0.1 --port <port> --writable sh -c '<agent>; exec $SHELL'` in the worktree directory
4. Waits up to 5 seconds for the port to accept TCP connections (polling every 80ms)
5. Frontend embeds an `<iframe>` pointed at `http://127.0.0.1:<port>`
6. On task close, the ttyd child process is killed and task status resets to 'idle'

The terminal tab stays mounted even when hidden (other tabs are active), so the PTY connection remains alive. Loading state shows "Starting terminal..."; error state shows the failure message with install instructions.

### Layout System

Up to 3 task panels can be open simultaneously in a horizontal split layout powered by `react-resizable-panels`. Each panel has draggable resize handles and a minimum width of 20%. Layout auto-adjusts as panels are opened and closed, or can be set manually: single, split2, or split3.

### Storage

SQLite database at `~/.agentswarm/agentswarm.db` with WAL journal mode and foreign keys enabled. Two tables:

- **repos** — path (PK), name, last_opened (timestamp)
- **tasks** — id (UUID PK), repo_path (FK), name, branch, worktree_path, status (idle/running/done/failed), created_at, updated_at

The Rust backend wraps the connection in a `Mutex<Connection>` for thread-safe access.

## Project Structure

```
src/
├── renderer/
│   ├── App.tsx                    # Root layout + routing (LoadingState, WelcomeScreen, or Workspace)
│   ├── main.tsx                   # Entry point
│   ├── index.css                  # Global styles (dark theme with CSS custom properties)
│   ├── lib/api.ts                 # Tauri IPC wrappers for all 18 backend commands
│   ├── store/
│   │   ├── taskStore.ts           # Zustand store (repos + tasks CRUD, active repo state)
│   │   └── uiStore.ts            # Zustand store (panel layout, per-task active tab)
│   └── components/
│       ├── TitleBar.tsx           # Custom window title bar (minimize/maximize/close, drag region)
│       ├── Sidebar/               # Repo switcher dropdown + task list with status dots
│       ├── TaskPanel/             # Terminal, Git (graph+diff), Files (status+commit) tabs
│       ├── WelcomeScreen.tsx      # Initial repo selection (path input + folder picker)
│       ├── WorkspaceArea.tsx      # Resizable split-panel layout (react-resizable-panels)
│       ├── FolderPicker.tsx       # In-app directory browser with parent/child navigation
│       └── ConfirmDialog.tsx      # Reusable confirmation modal (supports danger mode)
├── shared/ipc-types.ts            # Shared TypeScript types (Repo, Task, Commit, GraphLine, FileStatus)
src-tauri/
├── src/
│   ├── lib.rs                     # Tauri setup + 18 IPC commands (AppState with db + pty fields)
│   ├── db.rs                      # SQLite operations (repos + tasks CRUD, WAL mode)
│   ├── git.rs                     # Git subprocess operations (worktree, log, diff, merge, graph)
│   └── pty_mgr.rs                 # ttyd process manager (spawn/kill, free port, ttyd resolution)
├── Cargo.toml
└── tauri.conf.json
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2 (Rust) |
| Database | SQLite via rusqlite (bundled, v0.31) |
| Git | `std::process::Command` |
| Terminal | ttyd sidecar |
| Frontend | React 18, TypeScript, Vite 5 |
| State | Zustand 4 |
| Layout | react-resizable-panels |
| Styling | Tailwind CSS 3 (dark theme) |
| UI Font | JetBrains Mono / Fira Code |
