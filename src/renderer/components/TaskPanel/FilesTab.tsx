import { useEffect, useState } from 'react'
import type { Task, FileStatus } from '@shared/ipc-types'
import { api } from '../../lib/api'

interface Props {
  task: Task
}

const STATUS_STYLE: Record<FileStatus['status'], { label: string; class: string }> = {
  M: { label: 'M', class: 'text-warning' },
  A: { label: 'A', class: 'text-success' },
  D: { label: 'D', class: 'text-error' },
  R: { label: 'R', class: 'text-accent' },
  '?': { label: '?', class: 'text-muted' },
}

export function FilesTab({ task }: Props) {
  const [files, setFiles] = useState<FileStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [commitMsg, setCommitMsg] = useState('')
  const [committing, setCommitting] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [task.id])

  const loadFiles = async () => {
    setLoading(true)
    try {
      const result = await api.git.files(task.worktreePath)
      setFiles(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCommit = async () => {
    const msg = commitMsg.trim()
    if (!msg) return
    setCommitting(true)
    try {
      await api.git.commit(task.worktreePath, msg)
      setCommitMsg('')
      await loadFiles()
    } catch (err: any) {
      alert(`Commit failed: ${err.message}`)
    } finally {
      setCommitting(false)
    }
  }

  const handleOpenVscode = (filePath: string) => {
    api.shell.openVscode(`${task.worktreePath}/${filePath}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-xs">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <span className="text-sm text-muted">{files.length} changed files</span>
        <button
          onClick={loadFiles}
          className="text-sm text-muted hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            No changes
          </div>
        ) : (
          files.map((file) => {
            const style = STATUS_STYLE[file.status]
            return (
              <div
                key={file.path}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-3 cursor-pointer group border-b border-border transition-colors"
                onClick={() => handleOpenVscode(file.path)}
                title="Open in VS Code"
              >
                <span className={`text-sm font-mono font-bold w-5 flex-shrink-0 ${style.class}`}>
                  {style.label}
                </span>
                <span className="text-sm text-white font-mono truncate flex-1">{file.path}</span>
                <span className="text-xs text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  open
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Commit section */}
      {files.length > 0 && (
        <div className="border-t border-border p-3 flex-shrink-0 flex flex-col gap-2">
          <input
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommit() } }}
            placeholder="Commit message"
            className="w-full bg-surface-3 text-white text-sm px-3 py-2 rounded border border-border focus:border-accent outline-none"
          />
          <button
            onClick={handleCommit}
            disabled={committing || !commitMsg.trim()}
            className="w-full py-2 text-sm bg-accent hover:bg-accent-dim text-white rounded transition-colors disabled:opacity-50"
          >
            {committing ? 'Committing...' : 'Commit'}
          </button>
        </div>
      )}
    </div>
  )
}
