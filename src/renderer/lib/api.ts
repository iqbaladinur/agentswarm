import { invoke } from '@tauri-apps/api/core'
import type { Task, Repo, Commit, FileStatus, GraphLine } from '@shared/ipc-types'

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
    updateStatus: (taskId: string, status: string) =>
      invoke<void>('update_task_status', { taskId, status }),
  },
  git: {
    log: (worktreePath: string, baseBranch?: string) =>
      invoke<Commit[]>('git_log', { worktreePath, baseBranch }),
    diff: (worktreePath: string, commitHash: string) =>
      invoke<string>('git_diff', { worktreePath, commitHash }).then((diff) => ({ diff })),
    files: (worktreePath: string) => invoke<FileStatus[]>('git_files', { worktreePath }),
    fileDiff: (worktreePath: string, filePath: string) =>
      invoke<string>('git_file_diff', { worktreePath, filePath }),
    commit: (worktreePath: string, message: string) => invoke<void>('git_commit', { worktreePath, message }),
    currentBranch: (worktreePath: string) => invoke<string>('git_current_branch', { worktreePath }),
    graph: (worktreePath: string) => invoke<GraphLine[]>('git_graph', { worktreePath }),
    defaultBranch: (repoPath: string) => invoke<string>('git_default_branch', { repoPath }),
    merge: (repoPath: string, worktreePath: string, branch: string, targetBranch?: string) =>
      invoke<void>('git_merge', { repoPath, worktreePath, branch, targetBranch }),
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

// ── PTY (ttyd) ───────────────────────────────────────────────────────────────

export const pty = {
  spawn: (taskId: string, termIndex: number, worktreePath: string, initialCmd?: string) =>
    invoke<number>('pty_spawn', { taskId, termIndex, worktreePath, initialCmd }),
  kill: (taskId: string, termIndex: number) =>
    invoke<void>('pty_kill', { taskId, termIndex }),
  killAll: (taskId: string) => invoke<void>('pty_kill_all', { taskId }),
}
