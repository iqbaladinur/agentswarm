import { useState, useEffect } from 'react'
import type { Task } from '@shared/ipc-types'
import { pty } from '../../lib/api'
import { useTaskStore } from '../../store/taskStore'

interface Props {
  task: Task
  isActive: boolean
}

export function TerminalTab({ task }: Props) {
  const [port, setPort] = useState<number | null>(null)
  const [error, setError] = useState('')
  const { updateTaskStatus } = useTaskStore()

  useEffect(() => {
    updateTaskStatus(task.id, 'running')

    pty.spawn(task.id, task.worktreePath)
      .then((p) => setPort(p))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
        updateTaskStatus(task.id, 'idle')
      })

    return () => {
      pty.kill(task.id)
      updateTaskStatus(task.id, 'idle')
    }
  }, [task.id])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
        <p className="text-error text-sm">{error}</p>
        <code className="text-xs text-muted bg-surface-3 px-3 py-1 rounded">
          sudo apt install ttyd
        </code>
      </div>
    )
  }

  if (!port) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-xs">
        Starting terminal…
      </div>
    )
  }

  return (
    <iframe
      src={`http://127.0.0.1:${port}`}
      className="h-full w-full border-0"
      title={`terminal-${task.id}`}
    />
  )
}
