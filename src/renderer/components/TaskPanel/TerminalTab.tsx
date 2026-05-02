import { useState, useEffect, useCallback } from 'react'
import type { Task } from '@shared/ipc-types'
import { pty } from '../../lib/api'
import { useTaskStore } from '../../store/taskStore'

interface Terminal {
  index: number
  port: number | null
  error: string
}

interface Props {
  task: Task
  isActive: boolean
}

let nextTermIndex = 0

export function TerminalTab({ task }: Props) {
  const [terminals, setTerminals] = useState<Terminal[]>([{ index: nextTermIndex++, port: null, error: '' }])
  const [activeTerm, setActiveTerm] = useState(0)
  const { updateTaskStatus } = useTaskStore()

  useEffect(() => {
    updateTaskStatus(task.id, 'running')
    spawnTerminal(terminals[0].index)

    return () => {
      pty.killAll(task.id)
      updateTaskStatus(task.id, 'idle')
    }
  }, [task.id])

  const spawnTerminal = useCallback(async (index: number) => {
    try {
      // Only first terminal auto-launches claude
      const cmd = index === 0 ? 'claude' : undefined
      const port = await pty.spawn(task.id, index, task.worktreePath, cmd)
      setTerminals((prev) => prev.map((t) => t.index === index ? { ...t, port } : t))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setTerminals((prev) => prev.map((t) => t.index === index ? { ...t, error: msg } : t))
    }
  }, [task.id, task.worktreePath])

  const addTerminal = () => {
    const index = nextTermIndex++
    setTerminals((prev) => [...prev, { index, port: null, error: '' }])
    setActiveTerm(terminals.length)
    spawnTerminal(index)
  }

  const closeTerminal = (sessionIndex: number) => {
    pty.kill(task.id, sessionIndex)
    setTerminals((prev) => {
      const pos = prev.findIndex((t) => t.index === sessionIndex)
      setActiveTerm((a) => {
        if (a > pos) return a - 1
        if (a === pos && pos === prev.length - 1) return Math.max(0, a - 1)
        return a
      })
      const next = prev.filter((t) => t.index !== sessionIndex)
      if (next.length > 0) return next
      const idx = nextTermIndex++
      return [{ index: idx, port: null, error: '' }]
    })
  }

  const activeTerminal = terminals[activeTerm] ?? terminals[0]
  const activeTermData = activeTerminal

  return (
    <div className="flex flex-col h-full">
      {/* Terminal tabs */}
      <div className="flex items-center border-b border-border bg-surface-1 flex-shrink-0 overflow-x-auto">
        {terminals.map((term, i) => (
          <div
            key={term.index}
            className={`group flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer border-r border-border transition-colors flex-shrink-0 ${
              i === activeTerm ? 'bg-surface-3 text-white' : 'text-muted hover:text-white hover:bg-surface-2'
            }`}
            onClick={() => setActiveTerm(i)}
          >
            <span>Terminal {i + 1}</span>
            {terminals.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); closeTerminal(term.index) }}
                className="ml-1 text-muted hover:text-error transition-colors leading-none"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addTerminal}
          className="px-2 py-1.5 text-xs text-muted hover:text-white hover:bg-surface-2 transition-colors flex-shrink-0"
          title="New terminal"
        >
          +
        </button>
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-hidden relative">
        {terminals.map((term, i) => (
          <div
            key={term.index}
            className={`absolute inset-0 ${activeTerminal?.index === term.index ? '' : 'hidden'}`}
          >
            {term.error ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                <p className="text-error text-sm">{term.error}</p>
                <code className="text-xs text-muted bg-surface-3 px-3 py-1 rounded">
                  sudo apt install ttyd
                </code>
              </div>
            ) : !term.port ? (
              <div className="flex items-center justify-center h-full text-muted text-sm">
                Starting terminal {i + 1}…
              </div>
            ) : (
              <iframe
                src={`http://127.0.0.1:${term.port}`}
                className="h-full w-full border-0"
                title={`terminal-${task.id}-${term.index}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
