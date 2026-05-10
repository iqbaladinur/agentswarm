import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useTaskStore } from '../../store/taskStore'
import { useUIStore } from '../../store/uiStore'

interface Props {
  onDone: () => void
}

export const NewTaskInput = memo(function NewTaskInput({ onDone }: Props) {
  const [value, setValue] = useState('')
  const createTask = useTaskStore((s) => s.createTask)
  const openTask = useUIStore((s) => s.openTask)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = useCallback(async () => {
    const name = value.trim()
    if (!name) { onDone(); return }
    try {
      const task = await createTask(name)
      openTask(task.id)
    } catch (err) {
      console.error(err)
    }
    onDone()
  }, [value, createTask, openTask, onDone])

  return (
    <div className="animate-fade-in-up px-3.5 py-2">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') onDone()
        }}
        onBlur={submit}
        placeholder="Task name…"
        className="w-full bg-surface-2 text-text-primary text-[13px] px-3 py-2 rounded-lg border border-border focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none placeholder:text-muted-dim transition-all duration-100"
      />
    </div>
  )
})
