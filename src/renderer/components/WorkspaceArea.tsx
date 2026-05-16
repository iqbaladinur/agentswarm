import { useRef, useEffect, startTransition, useCallback, memo, useMemo, useState } from 'react'
import { useUIStore } from '../store/uiStore'
import { useTaskStore } from '../store/taskStore'
import { usePtyStore } from '../store/ptyStore'
import { TaskPanel } from './TaskPanel/TaskPanel'

const MAX_MOUNTED_PANELS = 3

export const WorkspaceArea = memo(function WorkspaceArea() {
  const openTaskIds = useUIStore((s) => s.openTaskIds)
  const activeTaskId = useUIStore((s) => s.activeTaskId)
  const setActiveTask = useUIStore((s) => s.setActiveTask)
  const closeTask = useUIStore((s) => s.closeTask)
  const setPtyCleanup = useUIStore((s) => s.setPtyCleanup)

  const tasks = useTaskStore((s) => s.tasks)
  const repos = useTaskStore((s) => s.repos)
  const taskCache = useTaskStore((s) => s.taskCache)
  const updateTaskStatus = useTaskStore((s) => s.updateTaskStatus)
  const killAll = usePtyStore((s) => s.killAll)

  const prevIdsRef = useRef(openTaskIds)
  const [enteringPanel, setEnteringPanel] = useState<string | null>(null)

  // PTY cleanup when tasks are removed from openTaskIds
  useEffect(() => {
    const prevIds = prevIdsRef.current
    const removed = prevIds.filter((id) => !openTaskIds.includes(id))
    for (const id of removed) {
      killAll(id)
      updateTaskStatus(id, 'idle')
    }
    prevIdsRef.current = openTaskIds
  }, [openTaskIds, killAll, updateTaskStatus])

  // Register PTY cleanup callback for closeTask in uiStore
  useEffect(() => {
    setPtyCleanup((taskId: string) => {
      killAll(taskId)
    })
    return () => setPtyCleanup(null)
  }, [killAll, setPtyCleanup])

  const findTask = useCallback(
    (id: string) => tasks.find((t) => t.id === id) ?? taskCache[id],
    [tasks, taskCache],
  )

  const repoNames = useMemo(() => new Map(repos.map((repo) => [repo.path, repo.name])), [repos])

  const getRepoName = useCallback(
    (repoPath: string) => {
      const knownName = repoNames.get(repoPath)
      if (knownName) return knownName
      return repoPath.split(/[\\/]/).filter(Boolean).pop() ?? repoPath
    },
    [repoNames],
  )

  const handleSelectTask = useCallback(
    (id: string) => {
      if (id !== activeTaskId) {
        setEnteringPanel(id)
        startTransition(() => setActiveTask(id))
      }
    },
    [activeTaskId, setActiveTask],
  )

  const handleCloseTask = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      closeTask(id)
    },
    [closeTask],
  )

  // Determine which panels to mount
  const activeIdx = activeTaskId ? openTaskIds.indexOf(activeTaskId) : -1
  const mountedIds = new Set<string>()
  if (activeIdx >= 0) mountedIds.add(openTaskIds[activeIdx])
  const prevIdx = activeIdx - 1
  if (prevIdx >= 0) mountedIds.add(openTaskIds[prevIdx])
  const nextIdx = activeIdx + 1
  if (nextIdx < openTaskIds.length) mountedIds.add(openTaskIds[nextIdx])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Task tabs */}
      <div className="flex items-center bg-surface-1 border-b border-border-soft flex-shrink-0 overflow-x-auto">
        {openTaskIds.map((id) => {
          const t = findTask(id)
          const isActive = id === activeTaskId
          return (
            <div
              key={id}
              className={`group relative flex items-center gap-1.5 pl-3 pr-1.5 py-2.5 text-[13px] cursor-pointer border-r border-border-soft transition-all duration-100 flex-shrink-0 ${
                isActive
                  ? 'bg-surface-0 text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/30'
              }`}
              onClick={() => handleSelectTask(id)}
            >
              {/* Status dot */}
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                t
                  ? t.status === 'running'
                    ? 'bg-success shadow-dot-success'
                    : t.status === 'failed'
                    ? 'bg-error'
                    : 'bg-muted-dim'
                  : 'bg-muted-dim'
              }`} />
              {/* Name */}
              <span className="flex items-center min-w-0 max-w-[220px] font-medium">
                {t ? (
                  <>
                    <span className="truncate text-muted-dim max-w-[82px]">{getRepoName(t.repoPath)}</span>
                    <span className="px-1.5 text-muted-dim/70 flex-shrink-0">/</span>
                    <span className="truncate text-inherit max-w-[120px]">{t.name}</span>
                  </>
                ) : (
                  <span className="truncate max-w-[140px]">{id}</span>
                )}
              </span>
              {/* Close */}
              <button
                onClick={(e) => handleCloseTask(id, e)}
                className="p-0.5 rounded text-text-secondary hover:text-error hover:bg-surface-3 transition-all duration-100 opacity-0 group-hover:opacity-100 flex-shrink-0"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              {/* Active indicator line */}
              {isActive && (
                <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-accent rounded-full" />
              )}
            </div>
          )
        })}
      </div>

      {/* Task panels */}
      <div className="flex-1 overflow-hidden relative bg-surface-0">
        {openTaskIds.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-text-secondary text-sm">No active task</p>
              <p className="text-muted-dim text-xs">Select a task from the sidebar to get started</p>
            </div>
          </div>
        ) : (
          openTaskIds.map((id) => {
            const t = findTask(id)
            if (!t) return null
            if (!mountedIds.has(id)) return null
            const isActive = id === activeTaskId
            return (
              <div
                key={id}
                className={`absolute inset-0 ${isActive ? `panel-enter` : 'invisible pointer-events-none'}`}
              >
                <TaskPanel task={t} />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
})
