use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Repo {
    pub path: String,
    pub name: String,
    #[serde(rename = "lastOpened")]
    pub last_opened: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    #[serde(rename = "repoPath")]
    pub repo_path: String,
    pub name: String,
    pub branch: String,
    #[serde(rename = "worktreePath")]
    pub worktree_path: String,
    pub status: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
}

pub struct Database(pub Mutex<Connection>);

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

impl Database {
    pub fn new() -> anyhow::Result<Self> {
        let home = dirs::home_dir().expect("home dir");
        let data_dir = home.join(".agentswarm");
        std::fs::create_dir_all(&data_dir)?;
        let db_path = data_dir.join("agentswarm.db");

        let conn = Connection::open(db_path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS repos (
                path        TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                last_opened INTEGER NOT NULL
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
            CREATE INDEX IF NOT EXISTS idx_tasks_repo ON tasks (repo_path);",
        )?;

        Ok(Self(Mutex::new(conn)))
    }

    pub fn touch_repo(&self, repo_path: &str) -> anyhow::Result<Repo> {
        let name = std::path::Path::new(repo_path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(repo_path)
            .to_string();
        let now = now_ms();
        let conn = self.0.lock().unwrap();
        conn.execute(
            "INSERT INTO repos (path, name, last_opened) VALUES (?1, ?2, ?3)
             ON CONFLICT(path) DO UPDATE SET last_opened = excluded.last_opened",
            params![repo_path, name, now],
        )?;
        Ok(Repo { path: repo_path.to_string(), name, last_opened: now })
    }

    pub fn list_repos(&self) -> anyhow::Result<Vec<Repo>> {
        let conn = self.0.lock().unwrap();
        let mut stmt = conn
            .prepare("SELECT path, name, last_opened FROM repos ORDER BY last_opened DESC")?;
        let repos = stmt
            .query_map([], |row| {
                Ok(Repo {
                    path: row.get(0)?,
                    name: row.get(1)?,
                    last_opened: row.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(repos)
    }

    pub fn delete_repo(&self, repo_path: &str) -> anyhow::Result<()> {
        let conn = self.0.lock().unwrap();
        conn.execute("DELETE FROM repos WHERE path = ?1", params![repo_path])?;
        Ok(())
    }

    pub fn create_task(
        &self,
        id: &str,
        repo_path: &str,
        name: &str,
        branch: &str,
        worktree_path: &str,
    ) -> anyhow::Result<Task> {
        let now = now_ms();
        let conn = self.0.lock().unwrap();
        conn.execute(
            "INSERT INTO tasks (id, repo_path, name, branch, worktree_path, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 'idle', ?6, ?6)",
            params![id, repo_path, name, branch, worktree_path, now],
        )?;
        Ok(Task {
            id: id.to_string(),
            repo_path: repo_path.to_string(),
            name: name.to_string(),
            branch: branch.to_string(),
            worktree_path: worktree_path.to_string(),
            status: "idle".to_string(),
            created_at: now,
        })
    }

    pub fn list_tasks(&self, repo_path: &str) -> anyhow::Result<Vec<Task>> {
        let conn = self.0.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, repo_path, name, branch, worktree_path, status, created_at
             FROM tasks WHERE repo_path = ?1 ORDER BY created_at DESC",
        )?;
        let tasks = stmt
            .query_map(params![repo_path], |row| {
                Ok(Task {
                    id: row.get(0)?,
                    repo_path: row.get(1)?,
                    name: row.get(2)?,
                    branch: row.get(3)?,
                    worktree_path: row.get(4)?,
                    status: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(tasks)
    }

    pub fn get_task(&self, task_id: &str) -> anyhow::Result<Option<Task>> {
        let conn = self.0.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, repo_path, name, branch, worktree_path, status, created_at
             FROM tasks WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map(params![task_id], |row| {
            Ok(Task {
                id: row.get(0)?,
                repo_path: row.get(1)?,
                name: row.get(2)?,
                branch: row.get(3)?,
                worktree_path: row.get(4)?,
                status: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?;
        Ok(rows.next().transpose()?)
    }

    pub fn delete_task(&self, task_id: &str) -> anyhow::Result<()> {
        let conn = self.0.lock().unwrap();
        conn.execute("DELETE FROM tasks WHERE id = ?1", params![task_id])?;
        Ok(())
    }

    pub fn update_task_status(&self, task_id: &str, status: &str) -> anyhow::Result<()> {
        let now = now_ms();
        let conn = self.0.lock().unwrap();
        conn.execute(
            "UPDATE tasks SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status, now, task_id],
        )?;
        Ok(())
    }
}
