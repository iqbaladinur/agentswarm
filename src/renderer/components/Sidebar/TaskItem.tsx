import { useState } from 'react'
import type { Task } from '@shared/ipc-types'
import { useUIStore } from '../../store/uiStore'
import { useTaskStore } from '../../store/taskStore'
import { ConfirmDialog } from '../ConfirmDialog'

interface Props {
  task: Task
  isActive: boolean
}

const STATUS_COLORS: Record<Task['status'], string> = {
  idle: 'bg-muted',
  running: 'bg-success animate-pulse',
  done: 'bg-accent',
  failed: 'bg-error',
}

export function TaskItem({ task, isActive }: Props) {
  const { openTask } = useUIStore()
  const { deleteTask } = useTaskStore()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleClick = () => {
    openTask(task.id)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowConfirm(true)
  }

  const confirmDelete = async () => {
    setShowConfirm(false)
    await deleteTask(task.id)
  }

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
      className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
        isActive ? 'bg-surface-3 text-white' : 'text-muted hover:bg-surface-2 hover:text-white'
      }`}
      onClick={handleClick}
    >
      {/* Status dot */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[task.status]}`} />

      {/* Name */}
      <span className="flex-1 text-sm truncate">{task.name}</span>

      {/* Delete button - visible on hover */}
      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 text-muted hover:text-error text-xs px-1 transition-opacity"
        title="Delete task"
      >
        ×
      </button>
    </div>
    </>
  )
}
