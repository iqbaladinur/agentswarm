import { create } from 'zustand'
import type { Task, Repo } from '@shared/ipc-types'
import { api } from '../lib/api'
import { useUIStore } from './uiStore'

interface TaskStore {
  repos: Repo[]
  repoPath: string | null
  tasks: Task[]
  /** Cache all tasks across repos so panels stay alive when switching repo */
  taskCache: Record<string, Task>
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
  getCachedTask: (taskId: string) => Task | undefined
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  repos: [],
  repoPath: null,
  tasks: [],
  taskCache: {},
  initialized: false,

  init: async () => {
    const repos = await api.repo.list()
    const active = repos[0]?.path ?? null
    // Load tasks from all repos into cache so persisted tabs work on startup
    const allTasks = await Promise.all(repos.map((r) => api.task.list(r.path)))
    const taskCache: Record<string, Task> = {}
    for (const tasks of allTasks) {
      for (const t of tasks) taskCache[t.id] = t
    }
    const tasks = active ? allTasks.flat().filter((t) => t.repoPath === active) : []
    set({ repos, repoPath: active, tasks, taskCache, initialized: true })
  },

  openRepo: async (path) => {
    const { valid } = await api.repo.validate(path)
    if (!valid) throw new Error('Not a git repository')
    await api.repo.touch(path)
    const repos = await api.repo.list()
    const tasks = await api.task.list(path)
    const taskCache = { ...get().taskCache }
    for (const t of tasks) taskCache[t.id] = t
    set({ repos, repoPath: path, tasks, taskCache })
  },

  switchRepo: async (path) => {
    await api.repo.touch(path)
    const [repos, tasks] = await Promise.all([api.repo.list(), api.task.list(path)])
    const taskCache = { ...get().taskCache }
    for (const t of tasks) taskCache[t.id] = t
    set({ repos, repoPath: path, tasks, taskCache })
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
      const taskCache = { ...get().taskCache }
      for (const t of tasks) taskCache[t.id] = t
      set({ repos, repoPath: next, tasks, taskCache })
    } else {
      set({ repos })
    }
  },

  loadTasks: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    const tasks = await api.task.list(repoPath)
    const taskCache = { ...get().taskCache }
    for (const t of tasks) taskCache[t.id] = t
    set({ tasks, taskCache })
  },

  createTask: async (name) => {
    const { repoPath, tasks, taskCache } = get()
    if (!repoPath) throw new Error('No repo open')
    const task = await api.task.create(repoPath, name)
    set({ tasks: [task, ...tasks], taskCache: { ...taskCache, [task.id]: task } })
    return task
  },

  deleteTask: async (taskId) => {
    await api.task.delete(taskId)
    // Close the task tab if it's open
    useUIStore.getState().closeTask(taskId)
    const { taskCache } = get()
    const next = { ...taskCache }
    delete next[taskId]
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId), taskCache: next }))
  },

  updateTaskStatus: (taskId, status) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
      taskCache: s.taskCache[taskId]
        ? { ...s.taskCache, [taskId]: { ...s.taskCache[taskId], status } }
        : s.taskCache,
    }))
    api.task.updateStatus(taskId, status).catch(console.error)
  },

  getCachedTask: (taskId) => {
    const { taskCache, tasks } = get()
    return tasks.find((t) => t.id === taskId) ?? taskCache[taskId]
  },
}))
