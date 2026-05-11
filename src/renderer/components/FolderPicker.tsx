import { useEffect, useState, memo } from 'react'
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

export const FolderPicker = memo(function FolderPicker({ onSelect, onClose }: Props) {
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="animate-fade-in-up w-[500px] max-h-[480px] bg-surface-2 border border-border rounded-xl shadow-modal flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-soft flex-shrink-0">
          <span className="text-[14px] text-text-primary font-semibold">Select Repository</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-dim hover:text-text-primary hover:bg-surface-3 transition-all duration-100"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="px-5 py-2.5 border-b border-border-soft flex-shrink-0 flex items-center gap-2">
          {data?.parent && (
            <button
              onClick={() => navigate(data.parent!)}
              className="text-[12px] text-muted-dim hover:text-text-primary px-2.5 py-1 hover:bg-surface-3 rounded-lg transition-all duration-100 flex-shrink-0 font-medium"
            >
              ← Up
            </button>
          )}
          <span className="text-[12px] text-muted-dim font-mono truncate">{data?.current ?? '…'}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-dim text-[13px]">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
                </svg>
                Loading…
              </div>
            </div>
          )}
          {error && (
            <div className="px-5 py-3 text-error text-[13px]">{error}</div>
          )}
          {!loading && !error && data?.dirs.length === 0 && (
            <div className="flex items-center justify-center py-12 text-muted-dim text-[13px]">
              No subdirectories
            </div>
          )}
          {!loading && data?.dirs.map((dir) => (
            <div
              key={dir.path}
              className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-3/50 cursor-pointer transition-colors duration-75 group"
              onDoubleClick={() => navigate(dir.path)}
            >
              <svg className="w-4 h-4 text-accent/60 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3.75 3A1.75 1.75 0 0 0 2 4.75v10.5c0 .966.784 1.75 1.75 1.75h12.5A1.75 1.75 0 0 0 18 15.25v-8.5A1.75 1.75 0 0 0 16.25 5h-4.836a.25.25 0 0 1-.177-.073L9.823 3.513A1.75 1.75 0 0 0 8.586 3H3.75Z" />
              </svg>
              <span className="flex-1 text-[13px] text-text-primary font-mono truncate">{dir.name}</span>
              <button
                onClick={() => navigate(dir.path)}
                className="text-[12px] text-muted-dim opacity-0 group-hover:opacity-100 hover:text-text-primary transition-all duration-100 font-medium"
              >
                Browse
              </button>
            </div>
          ))}
        </div>

        <div className="px-5 py-3.5 border-t border-border-soft flex items-center justify-between flex-shrink-0">
          <span className="text-[12px] text-muted-dim truncate max-w-xs font-mono">{data?.current ?? ''}</span>
          <button
            onClick={() => data && onSelect(data.current)}
            disabled={!data}
            className="h-9 px-5 text-[13px] bg-accent hover:bg-accent-dim text-white rounded-lg transition-all duration-100 disabled:opacity-50 font-medium shadow-btn-accent"
          >
            Select This Folder
          </button>
        </div>
      </div>
    </div>
  )
})
