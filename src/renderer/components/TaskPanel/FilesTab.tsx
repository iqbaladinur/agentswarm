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
        <span className="text-xs text-muted">{files.length} changed files</span>
        <button
          onClick={loadFiles}
          className="text-xs text-muted hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted text-xs">
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
                <span className={`text-xs font-mono font-bold w-4 flex-shrink-0 ${style.class}`}>
                  {style.label}
                </span>
                <span className="text-xs text-white font-mono truncate flex-1">{file.path}</span>
                <span className="text-xs text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  open
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
