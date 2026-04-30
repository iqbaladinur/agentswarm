import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import os from 'os'
import type { Task, Repo } from '../../shared/ipc-types'

interface RepoRow {
  path: string
  name: string
  last_opened: number
}

interface TaskRow {
  id: string
  repo_path: string
  name: string
  branch: string
  worktree_path: string
  status: string
  created_at: number
  updated_at: number
}

export class DatabaseService {
  private static instance: DatabaseService
  private db!: Database.Database

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  init(): void {
    const dataDir = path.join(os.homedir(), '.agentswarm')
    fs.mkdirSync(dataDir, { recursive: true })
    const dbPath = path.join(dataDir, 'agentswarm.db')

    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../db/migrations/001_init.sql'),
      'utf-8'
    )
    this.db.exec(migrationSQL)
  }

  // ── Repos ────────────────────────────────────────────────────────────────────

  touchRepo(repoPath: string): Repo {
    const name = repoPath.split('/').pop() ?? repoPath
    const now = Date.now()
    this.db.prepare(`
      INSERT INTO repos (path, name, last_opened)
      VALUES (?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET last_opened = excluded.last_opened
    `).run(repoPath, name, now)
    return { path: repoPath, name, lastOpened: now }
  }

  listRepos(): Repo[] {
    return (this.db.prepare('SELECT * FROM repos ORDER BY last_opened DESC').all() as RepoRow[])
      .map((r) => ({ path: r.path, name: r.name, lastOpened: r.last_opened }))
  }

  deleteRepo(repoPath: string): void {
    this.db.prepare('DELETE FROM repos WHERE path = ?').run(repoPath)
  }

  // ── Tasks ────────────────────────────────────────────────────────────────────

  createTask(task: Omit<Task, 'status'> & { status: Task['status'] }): Task {
    const now = Date.now()
    this.db.prepare(`
      INSERT INTO tasks (id, repo_path, name, branch, worktree_path, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(task.id, task.repoPath, task.name, task.branch, task.worktreePath, task.status, now, now)

    return { ...task, createdAt: now }
  }

  listTasks(repoPath: string): Task[] {
    const rows = this.db.prepare(
      'SELECT * FROM tasks WHERE repo_path = ? ORDER BY created_at DESC'
    ).all(repoPath) as TaskRow[]

    return rows.map(this.rowToTask)
  }

  updateStatus(taskId: string, status: Task['status']): void {
    this.db.prepare(
      'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?'
    ).run(status, Date.now(), taskId)
  }

  deleteTask(taskId: string): void {
    this.db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId)
  }

  getTask(taskId: string): Task | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow | undefined
    return row ? this.rowToTask(row) : null
  }

  private rowToTask(row: TaskRow): Task {
    return {
      id: row.id,
      repoPath: row.repo_path,
      name: row.name,
      branch: row.branch,
      worktreePath: row.worktree_path,
      status: row.status as Task['status'],
      createdAt: row.created_at,
    }
  }
}
