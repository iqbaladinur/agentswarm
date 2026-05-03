import { useUIStore } from '../store/uiStore'
import { useTaskStore } from '../store/taskStore'
import { TaskPanel } from './TaskPanel/TaskPanel'

export function WorkspaceArea() {
  const { openTaskIds, activeTaskId, setActiveTask, closeTask } = useUIStore()
  const { tasks, taskCache } = useTaskStore()

  const findTask = (id: string) => tasks.find((t) => t.id === id) ?? taskCache[id]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Task tabs */}
      <div className="flex items-center border-b border-border bg-surface-1 flex-shrink-0 overflow-x-auto">
        {openTaskIds.map((id) => {
          const t = findTask(id)
          const isActive = id === activeTaskId
          return (
            <div
              key={id}
              className={`group flex items-center gap-1 px-3 py-2 text-sm cursor-pointer border-r border-border transition-colors flex-shrink-0 ${
                isActive
                  ? 'bg-surface-0 text-white border-b-2 border-b-accent'
                  : 'text-muted hover:text-white hover:bg-surface-2'
              }`}
              onClick={() => setActiveTask(id)}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                t ? (t.status === 'running' ? 'bg-success' : t.status === 'failed' ? 'bg-error' : 'bg-muted') : 'bg-muted'
              }`} />
              <span className="flex items-baseline gap-1 min-w-0">
                <span className="truncate">{t?.name ?? id}</span>
                {t && <span className="text-muted text-xs shrink-0">· {t.repoPath.split('/').pop()}</span>}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); closeTask(id) }}
                className="ml-1 text-muted hover:text-error transition-colors leading-none text-xs"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      {/* Task panels — all mounted, only active one visible */}
      <div className="flex-1 overflow-hidden relative">
        {openTaskIds.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted text-sm">
            Select a task
          </div>
        ) : (
          openTaskIds.map((id) => {
            const t = findTask(id)
            if (!t) return null
            return (
              <div
                key={id}
                className={`absolute inset-0 ${id === activeTaskId ? '' : 'invisible pointer-events-none'}`}
              >
                <TaskPanel task={t} />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
