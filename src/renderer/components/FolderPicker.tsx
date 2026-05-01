import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Dir {
  name: string
  path: string
}

interface BrowseResult {
  current: string
  parent: string | null
  dirs: Dir[]
}

interface Props {
  onSelect: (path: string) => void
  onClose: () => void
}

export function FolderPicker({ onSelect, onClose }: Props) {
  const [data, setData] = useState<BrowseResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    navigate(undefined)
  }, [])

  const navigate = async (dir?: string) => {
    setLoading(true)
    setError('')
    try {
      const result = await api.fs.browse(dir)
      setData(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface-1 border border-border rounded-lg w-[480px] max-h-[500px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <span className="text-sm text-white font-medium">Select Repository</span>
          <button onClick={onClose} className="text-muted hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="px-4 py-2 border-b border-border flex-shrink-0 flex items-center gap-2">
          {data?.parent && (
            <button
              onClick={() => navigate(data.parent!)}
              className="text-muted hover:text-white text-xs px-2 py-1 hover:bg-surface-3 rounded transition-colors flex-shrink-0"
            >
              ↑ Up
            </button>
          )}
          <span className="text-xs text-muted font-mono truncate">{data?.current ?? '…'}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8 text-muted text-xs">Loading…</div>
          )}
          {error && <div className="px-4 py-3 text-error text-xs">{error}</div>}
          {!loading && !error && data?.dirs.length === 0 && (
            <div className="flex items-center justify-center py-8 text-muted text-xs">No subdirectories</div>
          )}
          {!loading && data?.dirs.map((dir) => (
            <div
              key={dir.path}
              className="flex items-center gap-2 px-4 py-2 hover:bg-surface-3 cursor-pointer border-b border-border group transition-colors"
              onDoubleClick={() => navigate(dir.path)}
            >
              <span className="text-accent text-xs">📁</span>
              <span className="flex-1 text-xs text-white font-mono truncate">{dir.name}</span>
              <button
                onClick={() => navigate(dir.path)}
                className="text-xs text-muted opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
              >
                open
              </button>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-border flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-muted truncate max-w-xs font-mono">{data?.current ?? ''}</span>
          <button
            onClick={() => data && onSelect(data.current)}
            disabled={!data}
            className="px-4 py-1.5 bg-accent hover:bg-accent-dim text-white text-xs rounded transition-colors disabled:opacity-50"
          >
            Select This Folder
          </button>
        </div>
      </div>
    </div>
  )
}
