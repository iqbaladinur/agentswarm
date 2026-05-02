export interface Repo {
  path: string
  name: string
  lastOpened: number
}

export interface Task {
  id: string
  repoPath: string
  name: string
  branch: string
  worktreePath: string
  status: 'idle' | 'running' | 'done' | 'failed'
  createdAt: number
}

export interface Commit {
  hash: string
  message: string
  author: string
  date: string
  refs: string
}

export interface GraphLine {
  prefix: string
  hash: string
  shortHash: string
  message: string
  author: string
  date: string
  refs: string
}

export interface FileStatus {
  path: string
  status: 'M' | 'A' | 'D' | '?' | 'R'
}

export interface DiffResult {
  diff: string
}

// IPC channel names
export const IPC = {
  // Task
  TASK_CREATE: 'task:create',
  TASK_LIST: 'task:list',
  TASK_DELETE: 'task:delete',
  TASK_UPDATE_STATUS: 'task:updateStatus',

  // PTY
  PTY_SPAWN: 'pty:spawn',
  PTY_WRITE: 'pty:write',
  PTY_OUTPUT: 'pty:output',
  PTY_RESIZE: 'pty:resize',
  PTY_KILL: 'pty:kill',
  PTY_EXIT: 'pty:exit',

  // Git
  GIT_LOG: 'git:log',
  GIT_DIFF: 'git:diff',
  GIT_FILES: 'git:files',
  GIT_MERGE: 'git:merge',

  // Shell
  SHELL_OPEN_VSCODE: 'shell:openVscode',
  DIALOG_OPEN_FOLDER: 'dialog:openFolder',
} as const

// Payload types
export interface TaskCreatePayload { repoPath: string; name: string }
export interface TaskListPayload { repoPath: string }
export interface TaskDeletePayload { taskId: string }
export interface TaskUpdateStatusPayload { taskId: string; status: Task['status'] }

export interface PtySpawnPayload { taskId: string; worktreePath: string }
export interface PtyWritePayload { taskId: string; data: string }
export interface PtyOutputPayload { taskId: string; data: string }
export interface PtyResizePayload { taskId: string; cols: number; rows: number }
export interface PtyKillPayload { taskId: string }
export interface PtyExitPayload { taskId: string; exitCode: number }

export interface GitLogPayload { worktreePath: string; baseBranch?: string }
export interface GitDiffPayload { worktreePath: string; commitHash: string }
export interface GitFilesPayload { worktreePath: string }
export interface GitMergePayload { worktreePath: string; branch: string; targetBranch?: string }

export interface ShellOpenVscodePayload { worktreePath: string }
