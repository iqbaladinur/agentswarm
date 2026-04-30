import { useState, useRef, useEffect } from 'react'
import { useTaskStore } from '../../store/taskStore'
import { useUIStore } from '../../store/uiStore'

interface Props {
  onDone: () => void
}

export function NewTaskInput({ onDone }: Props) {
  const [value, setValue] = useState('')
  const { createTask } = useTaskStore()
  const { openTask } = useUIStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = async () => {
    const name = value.trim()
    if (!name) { onDone(); return }
    try {
      const task = await createTask(name)
      openTask(task.id)
    } catch (err) {
      console.error(err)
    }
    onDone()
  }

  return (
    <div className="px-3 py-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') onDone()
        }}
        onBlur={submit}
        placeholder="Task name..."
        className="w-full bg-surface-3 text-white text-xs px-2 py-1.5 rounded border border-border focus:border-accent outline-none"
      />
    </div>
  )
}
