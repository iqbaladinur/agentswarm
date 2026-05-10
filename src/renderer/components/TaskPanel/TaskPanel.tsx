import { memo } from 'react'
import type { Task } from '@shared/ipc-types'
import { useUIStore } from '../../store/uiStore'
import { api } from '../../lib/api'
import { TerminalTab } from './TerminalTab'
import { GitTab } from './GitTab'
import { FilesTab } from './FilesTab'

interface Props {
  task: Task
}

const TABS = [
  { id: 'terminal', label: 'Terminal', icon: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2.5 3.5l2.5 2.5-2.5 2.5M7 9.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
  { id: 'git', label: 'Git', icon: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="3" cy="3.5" r="0.7" fill="currentColor"/>
      <circle cx="10.5" cy="9" r="0.7" fill="currentColor"/>
    </svg>
  )},
  { id: 'files', label: 'Files', icon: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="2" y="1.5" width="9" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4.5 5h4M4.5 7.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )},
] as const

export const TaskPanel = memo(function TaskPanel({ task }: Props) {
  const activeTab = useUIStore((s) => s.activeTab[task.id])
  const setTab = useUIStore((s) => s.setTab)
  const currentTab = activeTab ?? 'terminal'

  return (
    <div className="flex flex-col h-full bg-surface-0">
      {/* Header */}
      <div className="flex items-center border-b border-border-soft px-3.5 py-2 gap-3 flex-shrink-0 select-none">
        <span className="text-[13px] text-accent font-mono font-medium truncate flex-1">{task.branch}</span>
        <button
          onClick={() => api.shell.openVscode(task.worktreePath)}
          title="Open in VS Code"
          className="flex items-center gap-1.5 text-[12px] text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-md px-2.5 py-1.5 transition-all duration-100 flex-shrink-0 font-medium"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/></svg>
          VS Code
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center border-b border-border-soft flex-shrink-0 select-none">
        <div className="flex-1 flex">
          {TABS.map((tab) => {
            const isActive = currentTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setTab(task.id, tab.id)}
                className={`relative flex items-center gap-1.5 px-3.5 py-2 text-[13px] transition-all duration-100 ${
                  isActive
                    ? 'text-text-primary'
                    : 'text-muted-dim hover:text-text-secondary'
                }`}
              >
                <span className={isActive ? 'text-accent' : ''}>{tab.icon}</span>
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />
                )}
              </button>
            )
          })}
        </div>
        <span className="text-[12px] text-muted-dim px-3 py-2 truncate max-w-24">{task.name}</span>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden relative">
        <div className={`absolute inset-0 ${currentTab === 'terminal' ? '' : 'invisible'}`}>
          <TerminalTab task={task} isActive={currentTab === 'terminal'} />
        </div>
        {currentTab === 'git' && (
          <div className="absolute inset-0 overflow-hidden panel-enter">
            <GitTab task={task} />
          </div>
        )}
        {currentTab === 'files' && (
          <div className="absolute inset-0 overflow-hidden panel-enter">
            <FilesTab task={task} isActive={currentTab === 'files'} />
          </div>
        )}
      </div>
    </div>
  )
})
