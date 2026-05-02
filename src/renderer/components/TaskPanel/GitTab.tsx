import { useEffect, useState } from 'react'
import type { Task, GraphLine } from '@shared/ipc-types'
import { api } from '../../lib/api'

interface Props {
  task: Task
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}

export function GitTab({ task }: Props) {
  const [lines, setLines] = useState<GraphLine[]>([])
  const [branch, setBranch] = useState('')
  const [selectedHash, setSelectedHash] = useState<string | null>(null)
  const [diff, setDiff] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [merging, setMerging] = useState(false)

  useEffect(() => {
    loadAll()
  }, [task.id])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [graph, currentBranch] = await Promise.all([
        api.git.graph(task.worktreePath),
        api.git.currentBranch(task.worktreePath),
      ])
      setLines(graph)
      setBranch(currentBranch)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const selectCommit = async (hash: string) => {
    setSelectedHash(hash)
    try {
      const result = await api.git.diff(task.worktreePath, hash)
      setDiff(result.diff)
    } catch {
      setDiff('')
    }
  }

  const handleMerge = async () => {
    if (!confirm(`Merge "${task.branch}" to main?`)) return
    setMerging(true)
    try {
      await api.git.merge(task.worktreePath, task.branch)
      alert('Merged successfully')
      loadAll()
    } catch (err: any) {
      alert(`Merge failed: ${err.message}`)
    } finally {
      setMerging(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Commit graph */}
      <div className="w-80 min-w-80 border-r border-border overflow-y-auto flex flex-col">
        {/* Branch header */}
        <div className="px-3 py-2 border-b border-border flex-shrink-0 flex items-center gap-2">
          <span className="text-xs text-muted">Branch:</span>
          <span className="text-sm text-accent font-mono font-medium truncate">{branch}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {lines.length === 0 ? (
            <p className="text-muted text-sm p-4">No commits yet</p>
          ) : (
            <div className="font-mono text-xs leading-relaxed">
              {lines.map((line) => {
                const isSelected = selectedHash === line.hash
                return (
                  <div
                    key={line.hash + line.prefix}
                    onClick={() => selectCommit(line.hash)}
                    className={`flex cursor-pointer border-b border-border/50 transition-colors ${
                      isSelected ? 'bg-surface-3' : 'hover:bg-surface-2'
                    }`}
                  >
                    {/* Graph prefix */}
                    <span
                      className="text-muted whitespace-pre flex-shrink-0 py-1 pl-2"
                      dangerouslySetInnerHTML={{
                        __html: line.prefix
                          .replace(/\*/g, '<span class="text-accent">*</span>')
                          .replace(/\|/g, '<span class="text-muted">|</span>')
                          .replace(/\//g, '<span class="text-muted">/</span>')
                          .replace(/\\/g, '<span class="text-muted">\\</span>')
                          .replace(/-/g, '<span class="text-muted">-</span>'),
                      }}
                    />
                    {/* Commit data */}
                    <span className="flex-1 min-w-0 py-1 pr-2">
                      <span className="text-warning">{line.shortHash} </span>
                      <span className="text-white">{line.message}</span>
                      {line.refs && (
                        <span className="text-accent ml-1">{line.refs}</span>
                      )}
                      <span className="text-muted ml-1">— {line.author}, {formatDate(line.date)}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Merge button */}
        <div className="p-2 border-t border-border flex-shrink-0 flex gap-2">
          <button
            onClick={loadAll}
            className="flex-1 py-2 text-sm text-muted hover:text-white hover:bg-surface-3 rounded transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={handleMerge}
            disabled={merging || lines.length === 0}
            className="flex-1 py-2 text-sm bg-accent hover:bg-accent-dim text-white rounded transition-colors disabled:opacity-50"
          >
            {merging ? 'Merging...' : 'Merge to main'}
          </button>
        </div>
      </div>

      {/* Diff view */}
      <div className="flex-1 overflow-y-auto bg-surface-0">
        {diff ? (
          <pre className="text-sm font-mono p-4 whitespace-pre-wrap leading-relaxed">
            {diff.split('\n').map((line, i) => (
              <span
                key={i}
                className={
                  line.startsWith('+') && !line.startsWith('+++')
                    ? 'text-success block'
                    : line.startsWith('-') && !line.startsWith('---')
                    ? 'text-error block'
                    : line.startsWith('@@')
                    ? 'text-accent block'
                    : 'text-muted block'
                }
              >
                {line}
              </span>
            ))}
          </pre>
        ) : (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            Select a commit to view diff
          </div>
        )}
      </div>
    </div>
  )
}
