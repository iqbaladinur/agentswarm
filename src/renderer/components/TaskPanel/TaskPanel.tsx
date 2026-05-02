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
  { id: 'terminal', label: 'Terminal' },
  { id: 'git', label: 'Git' },
  { id: 'files', label: 'Files' },
] as const

export function TaskPanel({ task }: Props) {
  const { activeTab, setTab } = useUIStore()
  const currentTab = activeTab[task.id] ?? 'terminal'

  return (
    <div className="flex flex-col h-full bg-surface-1">
      {/* Header */}
      <div className="flex items-center border-b border-border px-3 py-2 gap-2 flex-shrink-0">
        <span className="text-sm text-accent font-mono truncate flex-1">{task.branch}</span>

        <button
          onClick={() => api.shell.openVscode(task.worktreePath)}
          title="Open folder in VS Code"
          className="text-xs text-muted hover:text-white px-2 py-0.5 rounded hover:bg-surface-3 transition-colors flex-shrink-0"
        >
          VS Code
        </button>
      </div>

      {/* Sub-tabs: Terminal / Git / Files */}
      <div className="flex border-b border-border flex-shrink-0">
        <div className="flex-1 flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTab(task.id, tab.id)}
              className={`px-4 py-2 text-sm transition-colors border-b-2 ${
                currentTab === tab.id
                  ? 'border-accent text-white'
                  : 'border-transparent text-muted hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-sm text-muted px-3 py-2 truncate max-w-32">{task.name}</span>
      </div>

      {/* Tab content — all always mounted, hidden via CSS so terminal PTY stays alive */}
      <div className="flex-1 overflow-hidden relative">
        <div className={`absolute inset-0 ${currentTab === 'terminal' ? '' : 'invisible pointer-events-none'}`}>
          <TerminalTab task={task} isActive={currentTab === 'terminal'} />
        </div>
        <div className={`absolute inset-0 overflow-hidden ${currentTab === 'git' ? '' : 'hidden'}`}>
          <GitTab task={task} />
        </div>
        <div className={`absolute inset-0 overflow-hidden ${currentTab === 'files' ? '' : 'hidden'}`}>
          <FilesTab task={task} />
        </div>
      </div>
    </div>
  )
}
