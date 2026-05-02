import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type TabType = 'terminal' | 'git' | 'files'

interface UIStore {
  // Ordered list of open task tabs
  openTaskIds: string[]
  // Currently active task tab
  activeTaskId: string | null
  // Active sub-tab per task
  activeTab: Record<string, TabType>
  // Agent command to auto-run in the first terminal
  agentCmd: string

  openTask: (taskId: string) => void
  closeTask: (taskId: string) => void
  setActiveTask: (taskId: string) => void
  setTab: (taskId: string, tab: TabType) => void
  setAgentCmd: (cmd: string) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      openTaskIds: [],
      activeTaskId: null,
      activeTab: {},
      agentCmd: 'claude',

      openTask: (taskId) => {
        const { openTaskIds } = get()
        if (openTaskIds.includes(taskId)) {
          // Already open — just switch to it
          set({ activeTaskId: taskId })
          return
        }
        // Add to tab list and make active
        set({
          openTaskIds: [...openTaskIds, taskId],
          activeTaskId: taskId,
          activeTab: { ...get().activeTab, [taskId]: 'terminal' },
        })
      },

      closeTask: (taskId) => {
        const { openTaskIds, activeTaskId } = get()
        const next = openTaskIds.filter((id) => id !== taskId)
        // If we closed the active tab, pick the last remaining
        const newActive = activeTaskId === taskId
          ? (next[next.length - 1] ?? null)
          : activeTaskId
        set({ openTaskIds: next, activeTaskId: newActive })
      },

      setActiveTask: (taskId) => set({ activeTaskId: taskId }),

      setTab: (taskId, tab) => {
        set((s) => ({ activeTab: { ...s.activeTab, [taskId]: tab } }))
      },

      setAgentCmd: (cmd) => set({ agentCmd: cmd }),
    }),
    { name: 'agentswarm-ui' },
  ),
)
