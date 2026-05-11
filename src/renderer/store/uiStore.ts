import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type TabType = 'terminal' | 'git' | 'files'
export type ThemeId = 'default' | 'high-contrast' | 'warm' | 'dracula'

export const THEME_LABELS: Record<ThemeId, string> = {
  'default': 'Default (Purple)',
  'high-contrast': 'High Contrast',
  'warm': 'Warm (Amber)',
  'dracula': 'Dracula',
}

interface UIStore {
  // Ordered list of open task tabs
  openTaskIds: string[]
  // Currently active task tab
  activeTaskId: string | null
  // Active sub-tab per task
  activeTab: Record<string, TabType>
  // Default agent command for new task terminals
  agentCmd: string
  // Active color theme
  theme: ThemeId

  openTask: (taskId: string) => void
  closeTask: (taskId: string) => void
  setActiveTask: (taskId: string) => void
  setTab: (taskId: string, tab: TabType) => void
  setAgentCmd: (cmd: string) => void
  setTheme: (theme: ThemeId) => void
  /** Register PTY cleanup callback — called when a task tab is closed */
  setPtyCleanup: (fn: ((taskId: string) => void) | null) => void
  _ptyCleanup: ((taskId: string) => void) | null
}

let persistTimer: ReturnType<typeof setTimeout> | null = null

const debouncedStorage = {
  getItem: (name: string) => localStorage.getItem(name),
  setItem: (name: string, value: string) => {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => localStorage.setItem(name, value), 300)
  },
  removeItem: (name: string) => localStorage.removeItem(name),
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      openTaskIds: [],
      activeTaskId: null,
      activeTab: {},
      agentCmd: 'claude',
      theme: 'default',
      _ptyCleanup: null,

      openTask: (taskId) => {
        const { openTaskIds } = get()
        if (openTaskIds.includes(taskId)) {
          set({ activeTaskId: taskId })
          return
        }
        set({
          openTaskIds: [...openTaskIds, taskId],
          activeTaskId: taskId,
          activeTab: { ...get().activeTab, [taskId]: 'terminal' },
        })
      },

      closeTask: (taskId) => {
        const cleanup = get()._ptyCleanup
        if (cleanup) cleanup(taskId)

        const { openTaskIds, activeTaskId } = get()
        const next = openTaskIds.filter((id) => id !== taskId)
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

      setTheme: (theme) => set({ theme }),

      setPtyCleanup: (fn) => set({ _ptyCleanup: fn }),
    }),
    {
      name: 'agentswarm-ui',
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (state) =>
        ({
          openTaskIds: state.openTaskIds,
          activeTaskId: state.activeTaskId,
          activeTab: state.activeTab,
          agentCmd: state.agentCmd,
          theme: state.theme,
        } as UIStore),
    },
  ),
)
