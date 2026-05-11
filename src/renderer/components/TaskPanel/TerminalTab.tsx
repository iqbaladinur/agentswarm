import { useState, useEffect, useCallback, useRef, memo } from 'react'
import type { Task } from '@shared/ipc-types'
import { usePtyStore } from '../../store/ptyStore'
import { useTaskStore } from '../../store/taskStore'
import { useUIStore } from '../../store/uiStore'

interface Props {
  task: Task
  isActive: boolean
}

const AGENT_PRESETS = [
  { label: 'Claude', value: 'claude' },
  { label: 'Copilot', value: 'github-copilot' },
  { label: 'None', value: '' },
  { label: 'Custom…', value: '__custom__' },
]

export const TerminalTab = memo(function TerminalTab({ task, isActive }: Props) {
  const session = usePtyStore((s) => s.sessions[task.id])
  const initTask = usePtyStore((s) => s.initTask)
  const spawnTerminal = usePtyStore((s) => s.spawnTerminal)
  const killTerminal = usePtyStore((s) => s.killTerminal)
  const setActiveTerminal = usePtyStore((s) => s.setActiveTerminal)
  const setAgentCmd = usePtyStore((s) => s.setAgentCmd)
  const terminals = session?.terminals ?? []
  const activeTerm = session?.activeTerminal ?? 0
  const perTaskAgentCmd = session?.agentCmd ?? 'claude'

  const { updateTaskStatus } = useTaskStore()
  const { agentCmd: defaultAgentCmd } = useUIStore()
  const [showAgentMenu, setShowAgentMenu] = useState(false)
  const [customAgent, setCustomAgent] = useState('')
  const [editingCustom, setEditingCustom] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const agentBtnRef = useRef<HTMLButtonElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      updateTaskStatus(task.id, 'running')
      initTask(task.id, task.worktreePath, defaultAgentCmd)
    }
  }, [task.id])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAgentMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
      setCustomAgent(perTaskAgentCmd)
      setEditingCustom(true)
      return
    }
    updateTaskStatus(task.id, 'running')
    setAgentCmd(task.id, task.worktreePath, value)
    setShowAgentMenu(false)
  }

  const saveCustomAgent = () => {
    updateTaskStatus(task.id, 'running')
    setAgentCmd(task.id, task.worktreePath, customAgent)
    setEditingCustom(false)
    setShowAgentMenu(false)
  }

  const addTerminal = useCallback(() => {
    spawnTerminal(task.id, task.worktreePath)
  }, [task.id, task.worktreePath, spawnTerminal])

  const closeTerminal = useCallback((sessionIndex: number) => {
    killTerminal(task.id, sessionIndex)
  }, [task.id, killTerminal])

  const agentLabel = AGENT_PRESETS.find((p) => p.value === perTaskAgentCmd)?.label || perTaskAgentCmd || 'None'

  const activeTerminal = terminals[activeTerm] ?? terminals[0]

  return (
    <div className="flex flex-col h-full">
      {/* Terminal tabs */}
      <div className="flex items-center border-b border-border-soft bg-surface-0 flex-shrink-0 overflow-x-auto h-8">
        {terminals.map((term, i) => (
          <div
            key={term.index}
            className={`group flex items-center gap-1 px-2.5 py-1 text-[12px] cursor-pointer border-r border-border-soft transition-all duration-100 flex-shrink-0 h-full ${
              i === activeTerm ? 'bg-surface-1 text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/40'
            }`}
            onClick={() => setActiveTerminal(task.id, i)}
          >
            <span className="font-medium">Term {i + 1}</span>
            {terminals.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); closeTerminal(term.index) }}
                className="ml-0.5 p-0.5 rounded text-muted-dim hover:text-error hover:bg-surface-3 transition-all opacity-0 group-hover:opacity-100"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addTerminal}
          className="px-2.5 py-1 text-[12px] text-muted-dim hover:text-text-primary hover:bg-surface-2/50 transition-colors flex-shrink-0 h-full"
          title="New terminal"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Agent selector */}
        <div className="ml-auto relative flex-shrink-0" ref={menuRef}>
          {editingCustom ? (
            <div className="flex items-center gap-1 px-2">
              <input
                value={customAgent}
                onChange={(e) => setCustomAgent(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveCustomAgent(); if (e.key === 'Escape') setEditingCustom(false) }}
                className="w-32 bg-surface-1 text-text-primary text-[12px] px-2 py-1 rounded-md border border-border focus:border-accent outline-none font-mono"
                placeholder="command…"
                autoFocus
              />
              <button onClick={saveCustomAgent} className="text-[12px] text-accent hover:text-accent-dim font-medium">Save</button>
              <button onClick={() => setEditingCustom(false)} className="text-[12px] text-muted-dim hover:text-text-secondary">Esc</button>
            </div>
          ) : (
            <button
              ref={agentBtnRef}
              onClick={() => {
                if (!showAgentMenu && agentBtnRef.current) {
                  const rect = agentBtnRef.current.getBoundingClientRect()
                  const right = window.innerWidth - rect.right
                  setMenuPos({ top: rect.bottom + 4, right })
                }
                setShowAgentMenu((v) => !v)
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-[12px] text-muted-dim hover:text-text-primary hover:bg-surface-2/50 transition-colors rounded h-full"
              title="Change agent"
            >
              Agent: <span className="text-accent font-medium">{agentLabel}</span>
              <svg className={`w-3 h-3 transition-transform duration-150 ${showAgentMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}

          {showAgentMenu && !editingCustom && menuPos && (
            <div
              className="dropdown-enter fixed z-50 bg-surface-2 border border-border rounded-lg shadow-dropdown overflow-hidden min-w-36"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              {AGENT_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => selectAgent(preset.value)}
                  className={`block w-full text-left px-3 py-2 text-[12px] transition-colors duration-75 ${
                    perTaskAgentCmd === preset.value
                      ? 'text-accent bg-accent-bg'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-3'
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
      <div className="flex-1 overflow-hidden relative bg-surface-0">
        {terminals.map((term, i) => (
          <div
            key={term.index}
            className={`absolute inset-0 ${activeTerminal?.index === term.index ? '' : 'hidden'}`}
          >
            {term.error ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stroke-error" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
                  </svg>
                </div>
                <p className="text-error text-[13px] font-medium">{term.error}</p>
                <code className="text-[12px] text-muted-dim bg-surface-2 px-3 py-1.5 rounded-md font-mono">
                  sudo apt install ttyd
                </code>
              </div>
            ) : !term.port ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-text-secondary text-[13px]">Starting terminal {i + 1}…</span>
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
})
