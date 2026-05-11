import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useTaskStore } from '../../store/taskStore'
import { useUIStore } from '../../store/uiStore'
import { api } from '../../lib/api'

interface Props {
  onDone: () => void
}

export const NewTaskInput = memo(function NewTaskInput({ onDone }: Props) {
  const [value, setValue] = useState('')
  const [baseBranch, setBaseBranch] = useState('')
  const [branches, setBranches] = useState<string[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [showBranchPicker, setShowBranchPicker] = useState(false)
  const createTask = useTaskStore((s) => s.createTask)
  const repoPath = useTaskStore((s) => s.repoPath)
  const openTask = useUIStore((s) => s.openTask)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Fetch available branches + default branch
  useEffect(() => {
    if (!repoPath) return
    setLoadingBranches(true)
    Promise.all([
      api.git.listBranches(repoPath),
      api.git.defaultBranch(repoPath),
    ]).then(([list, defBranch]) => {
      setBranches(list)
      if (!baseBranch) setBaseBranch(defBranch || list[0] || 'main')
    }).catch(() => {}).finally(() => setLoadingBranches(false))
  }, [repoPath])

  // Close branch picker on outside click
  useEffect(() => {
    if (!showBranchPicker) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowBranchPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showBranchPicker])

  // Dismiss form on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onDone()
      }
    }
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 100)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', handler)
    }
  }, [onDone])

  const submit = useCallback(async () => {
    const name = value.trim()
    if (!name) { onDone(); return }
    try {
      const task = await createTask(name, baseBranch || undefined)
      openTask(task.id)
    } catch (err) {
      console.error(err)
    }
    onDone()
  }, [value, baseBranch, createTask, openTask, onDone])

  return (
    <div ref={containerRef} className="animate-fade-in-up px-3.5 py-2.5 space-y-2">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') onDone()
        }}
        placeholder="Task name…"
        className="w-full bg-surface-2 text-text-primary text-[13px] px-3 py-2 rounded-lg border border-border focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none placeholder:text-muted-dim transition-all duration-100"
      />
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowBranchPicker((v) => !v)}
          className="flex items-center gap-1.5 w-full h-[30px] px-2.5 text-[12px] bg-surface-2 text-text-secondary hover:text-text-primary border border-border rounded-md font-mono transition-colors duration-100"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent/70 flex-shrink-0" />
          <span className="truncate flex-1 text-left">{baseBranch || 'main'}</span>
          <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

          {showBranchPicker && (
            <div className="dropdown-enter absolute top-full left-0 right-0 mt-1 z-30 bg-surface-2 border border-border rounded-lg shadow-dropdown overflow-hidden max-h-48 overflow-y-auto">
              {loadingBranches ? (
                <div className="px-3 py-2 text-[12px] text-muted-dim">Loading…</div>
              ) : (
                branches.map((b) => (
                  <button
                    key={b}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setBaseBranch(b); setShowBranchPicker(false); inputRef.current?.focus() }}
                    className={`block w-full text-left px-3 py-1.5 text-[12px] font-mono transition-colors duration-75 ${
                      b === baseBranch
                        ? 'text-accent bg-accent-bg'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-3'
                    }`}
                  >
                    {b}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
  )
})
