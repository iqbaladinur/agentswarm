import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { Task, Repo, Commit, FileStatus } from '@shared/ipc-types'

// ── REST-equivalent commands ──────────────────────────────────────────────────

export const api = {
  repo: {
    list: () => invoke<Repo[]>('list_repos'),
    touch: (repoPath: string) => invoke<Repo>('touch_repo', { repoPath }),
    delete: (repoPath: string) => invoke<void>('delete_repo', { repoPath }),
    validate: (repoPath: string) =>
      invoke<boolean>('validate_repo', { repoPath }).then((valid) => ({ valid })),
  },
  task: {
    list: (repoPath: string) => invoke<Task[]>('list_tasks', { repoPath }),
    create: (repoPath: string, name: string) =>
      invoke<Task>('create_task', { repoPath, name }),
    delete: (taskId: string) => invoke<void>('delete_task', { taskId }),
  },
  git: {
    log: (worktreePath: string, baseBranch?: string) =>
      invoke<Commit[]>('git_log', { worktreePath, baseBranch }),
    diff: (worktreePath: string, commitHash: string) =>
      invoke<string>('git_diff', { worktreePath, commitHash }).then((diff) => ({ diff })),
    files: (worktreePath: string) => invoke<FileStatus[]>('git_files', { worktreePath }),
    merge: (worktreePath: string, branch: string, targetBranch?: string) =>
      invoke<void>('git_merge', { worktreePath, branch, targetBranch }),
  },
  shell: {
    openVscode: (worktreePath: string) => invoke<void>('open_vscode', { worktreePath }),
  },
  fs: {
    browse: (path?: string) =>
      invoke<{ current: string; parent: string | null; dirs: { name: string; path: string }[] }>(
        'fs_browse',
        { path },
      ),
    openFolderDialog: () => invoke<string | null>('dialog_open_folder'),
  },
}

// ── PTY commands ──────────────────────────────────────────────────────────────

export const pty = {
  spawn: (taskId: string, worktreePath: string) =>
    invoke<void>('pty_spawn', { taskId, worktreePath }),
  write: (taskId: string, data: string) =>
    invoke<void>('pty_write', { taskId, data }),
  resize: (taskId: string, cols: number, rows: number) =>
    invoke<void>('pty_resize', { taskId, cols, rows }),
  kill: (taskId: string) => invoke<void>('pty_kill', { taskId }),
}

// ── PTY event listeners ───────────────────────────────────────────────────────

export interface PtyOutputEvent {
  taskId: string
  data: string
}

export interface PtyExitEvent {
  taskId: string
  exitCode: number
}

export function onPtyOutput(handler: (e: PtyOutputEvent) => void): Promise<UnlistenFn> {
  return listen<PtyOutputEvent>('pty:output', (event) => handler(event.payload))
}

export function onPtyExit(handler: (e: PtyExitEvent) => void): Promise<UnlistenFn> {
  return listen<PtyExitEvent>('pty:exit', (event) => handler(event.payload))
}
