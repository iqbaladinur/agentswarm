import { create } from 'zustand'
import type { Task, Repo } from '@shared/ipc-types'
import { api } from '../lib/api'

interface TaskStore {
  repos: Repo[]
  repoPath: string | null
  tasks: Task[]
  initialized: boolean

  init: () => Promise<void>
  openRepo: (path: string) => Promise<void>
  switchRepo: (path: string) => Promise<void>
  closeRepo: () => void
  removeRepo: (path: string) => Promise<void>
  loadTasks: () => Promise<void>
  createTask: (name: string) => Promise<Task>
  deleteTask: (taskId: string) => Promise<void>
  updateTaskStatus: (taskId: string, status: Task['status']) => void
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  repos: [],
  repoPath: null,
  tasks: [],
  initialized: false,

  init: async () => {
    const repos = await api.repo.list()
    const active = repos[0]?.path ?? null
    const tasks = active ? await api.task.list(active) : []
    set({ repos, repoPath: active, tasks, initialized: true })
  },

  openRepo: async (path) => {
    const { valid } = await api.repo.validate(path)
    if (!valid) throw new Error('Not a git repository')
    await api.repo.touch(path)
    const repos = await api.repo.list()
    const tasks = await api.task.list(path)
    set({ repos, repoPath: path, tasks })
  },

  switchRepo: async (path) => {
    await api.repo.touch(path)
    const [repos, tasks] = await Promise.all([api.repo.list(), api.task.list(path)])
    set({ repos, repoPath: path, tasks })
  },

  closeRepo: () => {
    set({ repoPath: null, tasks: [] })
  },

  removeRepo: async (path) => {
    await api.repo.delete(path)
    const repos = await api.repo.list()
    const { repoPath } = get()
    if (repoPath === path) {
      const next = repos[0]?.path ?? null
      const tasks = next ? await api.task.list(next) : []
      set({ repos, repoPath: next, tasks })
    } else {
      set({ repos })
    }
  },

  loadTasks: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    const tasks = await api.task.list(repoPath)
    set({ tasks })
  },

  createTask: async (name) => {
    const { repoPath, tasks } = get()
    if (!repoPath) throw new Error('No repo open')
    const task = await api.task.create(repoPath, name)
    set({ tasks: [task, ...tasks] })
    return task
  },

  deleteTask: async (taskId) => {
    await api.task.delete(taskId)
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) }))
  },

  updateTaskStatus: (taskId, status) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
    }))
  },
}))
