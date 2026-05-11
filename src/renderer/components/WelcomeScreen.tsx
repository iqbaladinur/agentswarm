import { useState, useCallback, memo } from 'react'
import { useTaskStore } from '../store/taskStore'
import { FolderPicker } from './FolderPicker'

export const WelcomeScreen = memo(function WelcomeScreen() {
  const openRepo = useTaskStore((s) => s.openRepo)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

  const handleOpen = useCallback(async (path: string) => {
    if (!path.trim()) return
    setLoading(true)
    setError('')
    try {
      await openRepo(path.trim())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [openRepo])

  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-0">
      {showPicker && (
        <FolderPicker
          onSelect={(p) => { setShowPicker(false); handleOpen(p) }}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="text-center space-y-6 w-[380px] animate-fade-in">
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-1 shadow-glow">
            <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">AgentSwarm</h1>
          <p className="text-text-secondary text-[13px]">Claude Code session manager</p>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleOpen(input)}
              placeholder="/path/to/your/repo"
              className="flex-1 bg-surface-2 text-text-primary text-[13px] px-3.5 py-2.5 rounded-lg border border-border focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none placeholder:text-muted-dim font-mono transition-all duration-100"
            />
            <button
              onClick={() => setShowPicker(true)}
              title="Browse folders"
              className="p-2.5 bg-surface-2 hover:bg-surface-3 text-muted-dim hover:text-text-primary border border-border rounded-lg transition-all duration-100"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3.75 3A1.75 1.75 0 0 0 2 4.75v10.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0 0 18 15.25v-8.5A1.75 1.75 0 0 0 16.25 5h-4.836a.25.25 0 0 1-.177-.073L9.823 3.513A1.75 1.75 0 0 0 8.586 3H3.75Z" />
              </svg>
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-error text-[13px] text-left px-1">
              <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
              </svg>
              {error}
            </div>
          )}
          <button
            onClick={() => handleOpen(input)}
            disabled={loading || !input.trim()}
            className="w-full h-11 bg-accent hover:bg-accent-dim text-white rounded-lg text-[14px] font-semibold transition-all duration-100 disabled:opacity-50 shadow-btn-accent"
          >
            {loading ? 'Opening…' : 'Open Repository'}
          </button>
        </div>

        <p className="text-muted-dim text-[12px]">Enter a path or browse to select a git repository</p>
      </div>
    </div>
  )
})
