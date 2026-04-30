CREATE TABLE IF NOT EXISTS repos (
  path          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  last_opened   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id            TEXT PRIMARY KEY,
  repo_path     TEXT NOT NULL,
  name          TEXT NOT NULL,
  branch        TEXT NOT NULL,
  worktree_path TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'idle',
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_repo ON tasks (repo_path);
