import { useState, useEffect, useCallback, useRef } from 'react'
import type { Task } from '@shared/ipc-types'
import { pty } from '../../lib/api'
import { useTaskStore } from '../../store/taskStore'
import { useUIStore } from '../../store/uiStore'

interface Terminal {
  index: number
  port: number | null
  error: string
}

interface Props {
  task: Task
  isActive: boolean
}

const AGENT_PRESETS = [
  { label: 'Claude', value: 'claude' },
  { label: 'Copilot', value: 'github-copilot' },
  { label: 'None', value: '' },
  { label: 'Custom...', value: '__custom__' },
]

let nextTermIndex = 0

export function TerminalTab({ task }: Props) {
  const [terminals, setTerminals] = useState<Terminal[]>([{ index: nextTermIndex++, port: null, error: '' }])
  const [activeTerm, setActiveTerm] = useState(0)
  const { updateTaskStatus } = useTaskStore()
  const { agentCmd, setAgentCmd } = useUIStore()
  const [showAgentMenu, setShowAgentMenu] = useState(false)
  const [customAgent, setCustomAgent] = useState('')
  const [editingCustom, setEditingCustom] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const agentBtnRef = useRef<HTMLButtonElement>(null)
  const taskRef = useRef(task)
  taskRef.current = task

  // Spawn terminal 1 on mount and whenever the agent command changes
  useEffect(() => {
    const t = taskRef.current
    updateTaskStatus(t.id, 'running')

    const idx = nextTermIndex++
    setTerminals([{ index: idx, port: null, error: '' }])
    setActiveTerm(0)

    const cmd = agentCmd || undefined
    ;(async () => {
      try {
        const port = await pty.spawn(t.id, idx, t.worktreePath, cmd)
        setTerminals([{ index: idx, port, error: '' }])
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        setTerminals([{ index: idx, port: null, error: msg }])
      }
    })()

    return () => {
      pty.killAll(t.id)
      updateTaskStatus(t.id, 'idle')
    }
  }, [task.id, agentCmd])

  // Close agent menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAgentMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const spawnTerminal = useCallback(async (index: number) => {
    try {
      const port = await pty.spawn(task.id, index, task.worktreePath)
      setTerminals((prev) => prev.map((t) => t.index === index ? { ...t, port } : t))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setTerminals((prev) => prev.map((t) => t.index === index ? { ...t, error: msg } : t))
    }
  }, [task.id, task.worktreePath])

  const toggleAgentMenu = () => {
    if (agentBtnRef.current) {
      const rect = agentBtnRef.current.getBoundingClientRect()
      const right = window.innerWidth - rect.right
      setMenuPos({ top: rect.bottom + 4, right })
      setShowAgentMenu(true)
    }
  }

  const selectAgent = (value: string) => {
    if (value === '__custom__') {
      setCustomAgent(agentCmd)
      setEditingCustom(true)
      return
    }
    setAgentCmd(value)
    setShowAgentMenu(false)
  }

  const saveCustomAgent = () => {
    setAgentCmd(customAgent)
    setEditingCustom(false)
    setShowAgentMenu(false)
  }

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

  const currentPreset = AGENT_PRESETS.find((p) => p.value === agentCmd)
  const agentLabel = currentPreset ? currentPreset.label : agentCmd || 'None'

  const activeTerminal = terminals[activeTerm] ?? terminals[0]

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

        {/* Agent command selector */}
        <div className="ml-auto relative flex-shrink-0" ref={menuRef}>
          {editingCustom ? (
            <div className="flex items-center gap-1 px-2 py-1">
              <input
                value={customAgent}
                onChange={(e) => setCustomAgent(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveCustomAgent() }}
                className="w-28 bg-surface-3 text-white text-xs px-2 py-1 rounded border border-border outline-none"
                placeholder="command..."
                autoFocus
              />
              <button onClick={saveCustomAgent} className="text-xs text-accent hover:text-white">save</button>
              <button onClick={() => setEditingCustom(false)} className="text-xs text-muted hover:text-white">x</button>
            </div>
          ) : (
            <button
              ref={agentBtnRef}
              onClick={() => {
                if (showAgentMenu) {
                  setShowAgentMenu(false)
                } else {
                  toggleAgentMenu()
                }
              }}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted hover:text-white hover:bg-surface-2 transition-colors"
              title="Agent command for terminal 1"
            >
              <span className="hidden sm:inline">Agent:</span>
              <span className="text-accent font-medium">{agentLabel}</span>
              <span className="text-muted">▾</span>
            </button>
          )}

          {showAgentMenu && !editingCustom && menuPos && (
            <div
              className="fixed z-50 bg-surface-2 border border-border shadow-lg rounded min-w-36"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              {AGENT_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => selectAgent(preset.value)}
                  className={`block w-full text-left px-3 py-2 text-xs transition-colors ${
                    agentCmd === preset.value
                      ? 'text-accent bg-surface-3'
                      : 'text-muted hover:text-white hover:bg-surface-3'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
