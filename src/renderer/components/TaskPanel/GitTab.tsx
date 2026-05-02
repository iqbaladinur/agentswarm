import { useEffect, useState } from 'react'
import type { Task, Commit } from '@shared/ipc-types'
import { api } from '../../lib/api'

interface Props {
  task: Task
}

export function GitTab({ task }: Props) {
  const [commits, setCommits] = useState<Commit[]>([])
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null)
  const [diff, setDiff] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [merging, setMerging] = useState(false)

  useEffect(() => {
    loadCommits()
  }, [task.id])

  const loadCommits = async () => {
    setLoading(true)
    try {
      const result = await api.git.log(task.worktreePath)
      setCommits(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const selectCommit = async (hash: string) => {
    setSelectedCommit(hash)
    const result = await api.git.diff(task.worktreePath, hash)
    setDiff(result.diff)
  }

  const handleMerge = async () => {
    if (!confirm(`Merge "${task.branch}" to main?`)) return
    setMerging(true)
    try {
      await api.git.merge(task.worktreePath, task.branch)
      alert('Merged successfully')
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
      {/* Commit list */}
      <div className="w-64 min-w-64 border-r border-border overflow-y-auto flex flex-col">
        <div className="flex-1">
          {commits.length === 0 ? (
            <p className="text-muted text-sm p-4">No commits yet</p>
          ) : (
            commits.map((commit) => (
              <div
                key={commit.hash}
                onClick={() => selectCommit(commit.hash)}
                className={`px-3 py-2 cursor-pointer border-b border-border hover:bg-surface-3 transition-colors ${
                  selectedCommit === commit.hash ? 'bg-surface-3' : ''
                }`}
              >
                <p className="text-sm text-white truncate">{commit.message}</p>
                <p className="text-xs text-muted mt-0.5 font-mono">{commit.hash.slice(0, 7)}</p>
                <p className="text-xs text-muted">{new Date(commit.date).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>

        {/* Merge button */}
        <div className="p-2 border-t border-border flex-shrink-0">
          <button
            onClick={loadCommits}
            className="w-full py-1.5 text-sm text-muted hover:text-white hover:bg-surface-3 rounded mb-1 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={handleMerge}
            disabled={merging || commits.length === 0}
            className="w-full py-2 text-sm bg-accent hover:bg-accent-dim text-white rounded transition-colors disabled:opacity-50"
          >
            {merging ? 'Merging...' : 'Merge to main'}
          </button>
        </div>
      </div>

      {/* Diff view */}
      <div className="flex-1 overflow-y-auto">
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
