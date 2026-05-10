import { create } from 'zustand'
import { pty as ptyApi } from '../lib/api'

export interface PtyTerminal {
  index: number
  port: number | null
  error: string
}

interface PtySession {
  terminals: PtyTerminal[]
  activeTerminal: number
  agentCmd: string
}

interface PtyStore {
  sessions: Record<string, PtySession>
  initTask: (taskId: string, worktreePath: string, agentCmd: string) => Promise<void>
  spawnTerminal: (taskId: string, worktreePath: string, cmd?: string) => Promise<void>
  killTerminal: (taskId: string, termIndex: number) => Promise<void>
  killAll: (taskId: string) => Promise<void>
  setActiveTerminal: (taskId: string, index: number) => void
  setAgentCmd: (taskId: string, worktreePath: string, cmd: string) => Promise<void>
}

let nextTermIndex = 0

const updateTerminal = (
  sessions: Record<string, PtySession>,
  taskId: string,
  termIndex: number,
  update: Partial<PtyTerminal>,
): Record<string, PtySession> => {
  const session = sessions[taskId]
  if (!session) return sessions
  return {
    ...sessions,
    [taskId]: {
      ...session,
      terminals: session.terminals.map((t) =>
        t.index === termIndex ? { ...t, ...update } : t,
      ),
    },
  }
}

export const usePtyStore = create<PtyStore>((set, get) => ({
  sessions: {},

  initTask: async (taskId, worktreePath, agentCmd) => {
    if (get().sessions[taskId]) return

    const idx = nextTermIndex++
    set((s) => ({
      sessions: {
        ...s.sessions,
        [taskId]: {
          terminals: [{ index: idx, port: null, error: '' }],
          activeTerminal: 0,
          agentCmd,
        },
      },
    }))

    try {
      const port = await ptyApi.spawn(taskId, idx, worktreePath, agentCmd || undefined)
      set((s) => ({ sessions: updateTerminal(s.sessions, taskId, idx, { port }) }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      set((s) => ({ sessions: updateTerminal(s.sessions, taskId, idx, { error: msg }) }))
    }
  },

  spawnTerminal: async (taskId, worktreePath, cmd) => {
    const idx = nextTermIndex++
    set((s) => {
      const session = s.sessions[taskId]
      if (!session) return s
      return {
        sessions: {
          ...s.sessions,
          [taskId]: {
            ...session,
            terminals: [...session.terminals, { index: idx, port: null, error: '' }],
            activeTerminal: session.terminals.length,
          },
        },
      }
    })

    try {
      const port = await ptyApi.spawn(taskId, idx, worktreePath, cmd)
      set((s) => ({ sessions: updateTerminal(s.sessions, taskId, idx, { port }) }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      set((s) => ({ sessions: updateTerminal(s.sessions, taskId, idx, { error: msg }) }))
    }
  },

  killTerminal: async (taskId, termIndex) => {
    ptyApi.kill(taskId, termIndex)
    set((s) => {
      const session = s.sessions[taskId]
      if (!session) return s
      const next = session.terminals.filter((t) => t.index !== termIndex)
      if (next.length === 0) {
        const idx = nextTermIndex++
        return {
          sessions: {
            ...s.sessions,
            [taskId]: {
              ...session,
              terminals: [{ index: idx, port: null, error: '' }],
              activeTerminal: 0,
            },
          },
        }
      }
      const newActive = Math.min(session.activeTerminal, next.length - 1)
      return {
        sessions: {
          ...s.sessions,
          [taskId]: {
            ...session,
            terminals: next,
            activeTerminal: newActive,
          },
        },
      }
    })
  },

  killAll: async (taskId) => {
    await ptyApi.killAll(taskId)
    set((s) => {
      const { [taskId]: _, ...rest } = s.sessions
      return { sessions: rest }
    })
  },

  setActiveTerminal: (taskId, index) => {
    set((s) => {
      const session = s.sessions[taskId]
      if (!session) return s
      return { sessions: { ...s.sessions, [taskId]: { ...session, activeTerminal: index } } }
    })
  },

  setAgentCmd: async (taskId, worktreePath, cmd) => {
    const session = get().sessions[taskId]
    if (!session) return

    const old = session.terminals[0]
    if (old) {
      await ptyApi.kill(taskId, old.index)
    }

    const idx = nextTermIndex++
    set((s) => ({
      sessions: {
        ...s.sessions,
        [taskId]: {
          ...s.sessions[taskId],
          terminals: [{ index: idx, port: null, error: '' }, ...s.sessions[taskId].terminals.slice(1)],
          activeTerminal: 0,
          agentCmd: cmd,
        },
      },
    }))

    try {
      const port = await ptyApi.spawn(taskId, idx, worktreePath, cmd || undefined)
      set((s) => ({ sessions: updateTerminal(s.sessions, taskId, idx, { port }) }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      set((s) => ({ sessions: updateTerminal(s.sessions, taskId, idx, { error: msg }) }))
    }
  },
}))
