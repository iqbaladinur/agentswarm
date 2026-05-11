import { useState, useCallback, memo } from 'react'
import type { Task } from '@shared/ipc-types'
import { useUIStore } from '../../store/uiStore'
import { useTaskStore } from '../../store/taskStore'
import { ConfirmDialog } from '../ConfirmDialog'

interface Props {
  task: Task
  isActive: boolean
}

const STATUS_STYLE: Record<Task['status'], { dot: string; pulse: boolean }> = {
  idle: { dot: 'bg-muted-dim', pulse: false },
  running: { dot: 'bg-success shadow-dot-success', pulse: true },
  done: { dot: 'bg-accent', pulse: false },
  failed: { dot: 'bg-error', pulse: false },
}

export const TaskItem = memo(function TaskItem({ task, isActive }: Props) {
  const openTask = useUIStore((s) => s.openTask)
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleClick = useCallback(() => {
    openTask(task.id)
  }, [openTask, task.id])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowConfirm(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    setShowConfirm(false)
    await deleteTask(task.id)
  }, [deleteTask, task.id])

  const status = STATUS_STYLE[task.status]
  const branchName = task.branch

  return (
    <>
      {showConfirm && (
        <ConfirmDialog
          title="Delete task"
          message={`Are you sure you want to delete "${task.name}"? This will remove the worktree and all uncommitted changes.`}
          onConfirm={confirmDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <div
        className={`group relative flex items-center gap-3 pl-3.5 pr-2 py-2 cursor-pointer transition-all duration-100 ${
          isActive
            ? 'bg-accent-bg text-text-primary border-l-[3px] border-l-accent pl-[11px]'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/40 border-l-[3px] border-l-transparent'
        }`}
        onClick={handleClick}
      >
        {/* Status dot */}
        <span className={`relative flex h-2 w-2 flex-shrink-0 ${status.pulse ? 'animate-pulse-dot' : ''}`}>
          <span className={`inline-flex h-full w-full rounded-full ${status.dot}`} />
        </span>

        {/* Name + branch */}
        <span className="flex-1 min-w-0 flex flex-col">
          <span className="text-[13px] truncate leading-tight">{task.name}</span>
          <span className="text-[10px] text-muted-dim truncate leading-tight mt-0.5 font-mono">{branchName}</span>
        </span>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 text-muted-dim hover:text-error p-0.5 rounded transition-all duration-100 flex-shrink-0"
          title="Delete task"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </>
  )
})
