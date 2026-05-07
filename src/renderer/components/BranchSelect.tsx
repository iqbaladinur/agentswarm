import { useState, useRef, useEffect } from 'react'

interface Props {
  branches: string[]
  value: string
  onChange: (branch: string) => void
  disabled?: boolean
  placeholder?: string
  position?: 'above' | 'below'
}

export function BranchSelect({ branches, value, onChange, disabled, placeholder, position = 'below' }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className="w-full bg-surface-3 text-white text-sm px-2 py-1.5 rounded border border-border focus:border-accent outline-none text-left flex items-center justify-between disabled:opacity-50"
      >
        <span className={`truncate flex-1 ${value ? 'text-white' : 'text-muted'}`}>
          {value || placeholder || 'Select branch...'}
        </span>
        <span className="text-muted text-xs ml-1">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className={`absolute left-0 right-0 z-30 bg-surface-2 border border-border shadow-lg max-h-48 overflow-y-auto ${
          position === 'above' ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}>
          {branches.map((b) => (
            <button
              key={b}
              onClick={() => { onChange(b); setOpen(false) }}
              className={`w-full px-2 py-1.5 text-left text-sm truncate transition-colors ${
                b === value ? 'text-accent bg-surface-3' : 'text-muted hover:text-white hover:bg-surface-3'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
