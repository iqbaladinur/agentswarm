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
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className="flex items-center gap-1.5 w-full h-[30px] px-2.5 text-[12px] bg-surface-2 text-text-secondary hover:text-text-primary border border-border rounded-md font-mono transition-colors duration-100 disabled:opacity-50"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-accent/70 flex-shrink-0" />
        <span className={`truncate flex-1 text-left ${value ? 'text-text-primary' : 'text-muted-dim'}`}>
          {value || placeholder || 'Select branch…'}
        </span>
        <svg className="w-3 h-3 flex-shrink-0 text-muted-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d={position === 'above' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
        </svg>
      </button>

      {open && (
        <div className={`dropdown-enter absolute left-0 right-0 z-30 bg-surface-2 border border-border rounded-lg shadow-dropdown overflow-hidden max-h-48 overflow-y-auto ${
          position === 'above' ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}>
          {branches.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-muted-dim">No branches</div>
          ) : (
            branches.map((b) => (
              <button
                key={b}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(b); setOpen(false) }}
                className={`block w-full text-left px-3 py-1.5 text-[12px] font-mono transition-colors duration-75 ${
                  b === value ? 'text-accent bg-accent-bg' : 'text-text-secondary hover:text-text-primary hover:bg-surface-3'
                }`}
              >
                {b}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
