import { useEffect, useState } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import type { Task, GraphLine } from '@shared/ipc-types'
import { api } from '../../lib/api'
import { ConfirmDialog } from '../ConfirmDialog'
import { AlertDialog } from '../AlertDialog'

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
  const [targetBranch, setTargetBranch] = useState('main')
  const [selectedHash, setSelectedHash] = useState<string | null>(null)
  const [diff, setDiff] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [merging, setMerging] = useState(false)
  const [confirmMerge, setConfirmMerge] = useState(false)
  const [alertMsg, setAlertMsg] = useState<{ title: string; message: string } | null>(null)

  useEffect(() => {
    loadAll()
  }, [task.id])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [graph, currentBranch, defBranch] = await Promise.all([
        api.git.graph(task.worktreePath),
        api.git.currentBranch(task.worktreePath),
        api.git.defaultBranch(task.repoPath),
      ])
      setLines(graph)
      setBranch(currentBranch)
      setTargetBranch(defBranch)
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
    setMerging(true)
    try {
      await api.git.merge(task.repoPath, task.worktreePath, task.branch, targetBranch)
      setAlertMsg({ title: 'Merge Successful', message: `"${task.branch}" merged to ${targetBranch}` })
      loadAll()
    } catch (err: any) {
      setAlertMsg({ title: 'Merge Failed', message: err.message })
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
    <><PanelGroup direction="horizontal" className="h-full overflow-hidden">
      {/* Commit graph */}
      <Panel defaultSize={40} minSize={25}>
        <div className="flex flex-col h-full border-r border-border">
          {/* Branch header */}
          <div className="px-4 py-2 border-b border-border flex-shrink-0 flex items-center gap-2 bg-surface-1">
            <span className="text-xs text-muted uppercase tracking-wider">Branch</span>
            <span className="text-sm text-accent font-mono font-medium truncate">{branch}</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {lines.length === 0 ? (
              <p className="text-muted text-sm p-4">No commits yet</p>
            ) : (
              <div className="font-mono text-sm">
                {lines.map((line) => {
                  const isSelected = selectedHash === line.hash
                  return (
                    <div
                      key={line.hash + line.prefix}
                      onClick={() => selectCommit(line.hash)}
                      className={`flex cursor-pointer transition-colors ${
                        isSelected ? 'bg-surface-3/80' : 'hover:bg-surface-2'
                      }`}
                    >
                      {/* Graph prefix */}
                      <span className="text-muted/60 whitespace-pre py-1.5 pl-3 leading-relaxed select-none">
                        {line.prefix}
                      </span>
                      {/* Commit data — stacked vertically */}
                      <span className="flex-1 min-w-0 py-1.5 pr-3 leading-relaxed">
                        <span className="text-white truncate block">{line.message}</span>
                        <div className="flex items-center gap-3 text-xs mt-0.5">
                          <span className="text-muted">by {line.author}</span>
                          {line.refs && (
                            <span className="text-accent">{line.refs}</span>
                          )}
                        </div>
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
              onClick={() => setConfirmMerge(true)}
              disabled={merging || lines.length === 0}
              className="flex-1 py-2 text-sm bg-accent hover:bg-accent-dim text-white rounded transition-colors disabled:opacity-50"
            >
              {merging ? 'Merging...' : `Merge to ${targetBranch}`}
            </button>
          </div>
        </div>
      </Panel>

      <PanelResizeHandle className="group relative w-2 flex items-center justify-center hover:bg-accent/10 transition-colors cursor-col-resize">
        <div className="w-0.5 h-8 rounded-full bg-border group-hover:bg-accent transition-colors" />
      </PanelResizeHandle>

      {/* Diff view */}
      <Panel defaultSize={60} minSize={30}>
        <div className="h-full overflow-y-auto bg-surface-0">
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
      </Panel>
    </PanelGroup>

      {confirmMerge && (
        <ConfirmDialog
          title="Merge branch"
          message={`Merge "${task.branch}" to ${targetBranch}?`}
          confirmLabel="Merge"
          cancelLabel="Cancel"
          danger={false}
          onConfirm={() => { setConfirmMerge(false); handleMerge() }}
          onCancel={() => setConfirmMerge(false)}
        />
      )}

      {alertMsg && (
        <AlertDialog title={alertMsg.title} message={alertMsg.message} onClose={() => setAlertMsg(null)} />
      )}
    </>
  )
}
