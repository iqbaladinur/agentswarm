import { create } from 'zustand'

type TabType = 'terminal' | 'git' | 'files'
type Layout = 'single' | 'split2' | 'split3'

interface UIStore {
  // Which tasks are visible in the split panels (1-3 task IDs)
  panelTaskIds: string[]
  // Active tab per task
  activeTab: Record<string, TabType>
  layout: Layout

  openTask: (taskId: string) => void
  closePanel: (taskId: string) => void
  setTab: (taskId: string, tab: TabType) => void
  setLayout: (layout: Layout) => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  panelTaskIds: [],
  activeTab: {},
  layout: 'single',

  openTask: (taskId) => {
    const { panelTaskIds } = get()
    if (panelTaskIds.includes(taskId)) return

    const next = [...panelTaskIds, taskId].slice(-3)
    const layout: Layout = next.length === 1 ? 'single' : next.length === 2 ? 'split2' : 'split3'
    set({
      panelTaskIds: next,
      layout,
      activeTab: { ...get().activeTab, [taskId]: 'terminal' },
    })
  },

  closePanel: (taskId) => {
    const next = get().panelTaskIds.filter((id) => id !== taskId)
    const layout: Layout = next.length === 0 ? 'single' : next.length === 1 ? 'single' : 'split2'
    set({ panelTaskIds: next, layout })
  },

  setTab: (taskId, tab) => {
    set((s) => ({ activeTab: { ...s.activeTab, [taskId]: tab } }))
  },

  setLayout: (layout) => set({ layout }),
}))
