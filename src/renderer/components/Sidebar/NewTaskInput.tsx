import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useTaskStore } from '../../store/taskStore'
import { useUIStore } from '../../store/uiStore'
import { api } from '../../lib/api'
import { BranchSelect } from '../BranchSelect'

interface Props {
  onDone: () => void
}

export const NewTaskInput = memo(function NewTaskInput({ onDone }: Props) {
  const [branches, setBranches] = useState<string[]>([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const createTask = useTaskStore((s) => s.createTask)
  const repoPath = useTaskStore((s) => s.repoPath)
  const openTask = useUIStore((s) => s.openTask)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!repoPath) return
    api.git.listBranches(repoPath).then((list) => {
      setBranches(list)
      setLoading(false)
      if (list.length > 0) setSelectedBranch(list[0])
    }).catch(() => setLoading(false))
  }, [repoPath])

  useEffect(() => {
    if (!loading) inputRef.current?.focus()
  }, [loading])

  const submit = useCallback(async () => {
    const taskName = name.trim()
    if (!taskName || !selectedBranch) { onDone(); return }
    try {
      const task = await createTask(taskName, selectedBranch)
      openTask(task.id)
    } catch (err) {
      console.error(err)
    }
    onDone()
  }, [name, selectedBranch, createTask, openTask, onDone])

  const handleContainerBlur = useCallback((e: React.FocusEvent) => {
    const related = e.relatedTarget as Node | null
    if (related && containerRef.current?.contains(related)) return
    if (!name.trim()) onDone()
  }, [name, onDone])

  return (
    <div ref={containerRef} className="animate-fade-in-up px-3.5 py-2.5 space-y-2" onBlur={handleContainerBlur}>
      <BranchSelect
        branches={branches}
        value={selectedBranch}
        onChange={setSelectedBranch}
        disabled={loading}
        placeholder={loading ? 'Loading…' : 'Select branch…'}
      />
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') onDone()
        }}
        placeholder="Task name…"
        className="w-full bg-surface-2 text-text-primary text-[13px] px-3 py-2 rounded-lg border border-border focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none placeholder:text-muted-dim transition-all duration-100"
      />
    </div>
  )
})
