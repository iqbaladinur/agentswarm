import { useState, useRef, useEffect, useCallback } from 'react'
import { useTaskStore } from '../../store/taskStore'
import { useUIStore } from '../../store/uiStore'
import { api } from '../../lib/api'
import { BranchSelect } from '../BranchSelect'

interface Props {
  onDone: () => void
}

export function NewTaskInput({ onDone }: Props) {
  const [branches, setBranches] = useState<string[]>([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const { createTask, repoPath } = useTaskStore()
  const { openTask } = useUIStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (repoPath) {
      api.git.listBranches(repoPath).then((b) => {
        setBranches(b)
        setLoading(false)
        if (b.length > 0) {
          setSelectedBranch(b[0])
        }
      }).catch(() => {
        setLoading(false)
      })
    }
  }, [repoPath])

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus()
    }
  }, [loading])

  const submit = async () => {
    const taskName = name.trim()
    if (!taskName || !selectedBranch) { onDone(); return }
    try {
      const task = await createTask(taskName, selectedBranch)
      openTask(task.id)
    } catch (err) {
      console.error(err)
    }
    onDone()
  }

  const handleContainerBlur = useCallback((e: React.FocusEvent) => {
    const related = e.relatedTarget as Node | null
    if (related && containerRef.current?.contains(related)) return
    if (!name.trim()) onDone()
  }, [name, onDone])

  return (
    <div ref={containerRef} className="px-3 py-1.5 space-y-1.5" onBlur={handleContainerBlur}>
      <BranchSelect
        branches={branches}
        value={selectedBranch}
        onChange={setSelectedBranch}
        disabled={loading}
        placeholder={loading ? 'Loading branches...' : 'Select branch...'}
      />
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') onDone()
        }}
        placeholder="Task name..."
        className="w-full bg-surface-3 text-white text-sm px-2 py-1.5 rounded border border-border focus:border-accent outline-none"
      />
    </div>
  )
}
