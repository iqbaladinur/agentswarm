import { useState } from 'react'
import { useTaskStore } from '../store/taskStore'
import { api } from '../lib/api'

export function WelcomeScreen() {
  const { openRepo } = useTaskStore()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOpen = async (path: string) => {
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
  }

  const handleBrowse = async () => {
    try {
      const path = await api.fs.openFolderDialog()
      if (path) handleOpen(path)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-0">
      <div className="text-center space-y-6 w-96">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AgentSwarm</h1>
          <p className="text-muted text-sm mt-1">Claude Code session manager</p>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleOpen(input)}
              placeholder="/path/to/your/repo"
              className="flex-1 bg-surface-3 text-white text-sm px-3 py-2 rounded border border-border focus:border-accent outline-none font-mono"
            />
            <button
              onClick={handleBrowse}
              title="Browse folders"
              className="px-3 py-2 bg-surface-3 hover:bg-surface-4 text-muted hover:text-white border border-border rounded transition-colors text-sm"
            >
              📁
            </button>
          </div>
          {error && <p className="text-error text-xs text-left">{error}</p>}
          <button
            onClick={() => handleOpen(input)}
            disabled={loading || !input.trim()}
            className="w-full py-2 bg-accent hover:bg-accent-dim text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Opening...' : 'Open Repository'}
          </button>
        </div>

        <p className="text-muted text-xs">Type a path or click 📁 to browse</p>
      </div>
    </div>
  )
}
