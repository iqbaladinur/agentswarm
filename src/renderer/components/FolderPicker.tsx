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
          <span className="text-base text-white font-medium">Select Repository</span>
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
              <span className="text-accent text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M3.75 3A1.75 1.75 0 0 0 2 4.75v10.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0 0 18 15.25v-8.5A1.75 1.75 0 0 0 16.25 5h-4.836a.25.25 0 0 1-.177-.073L9.823 3.513A1.75 1.75 0 0 0 8.586 3H3.75Z" />
                </svg>
              </span>
              <span className="flex-1 text-sm text-white font-mono truncate">{dir.name}</span>
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
            className="px-5 py-2 bg-accent hover:bg-accent-dim text-white text-sm rounded transition-colors disabled:opacity-50"
          >
            Select This Folder
          </button>
        </div>
      </div>
    </div>
  )
}
