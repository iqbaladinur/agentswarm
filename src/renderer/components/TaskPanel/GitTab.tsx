import { useEffect, useState, memo, useCallback } from 'react'
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

export const GitTab = memo(function GitTab({ task }: Props) {
  const [lines, setLines] = useState<GraphLine[]>([])
  const [branch, setBranch] = useState('')
  const [targetBranch, setTargetBranch] = useState('main')
  const [selectedHash, setSelectedHash] = useState<string | null>(null)
  const [diff, setDiff] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [merging, setMerging] = useState(false)
  const [confirmMerge, setConfirmMerge] = useState(false)
  const [alertMsg, setAlertMsg] = useState<{ title: string; message: string } | null>(null)

  const loadAll = useCallback(async () => {
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
  }, [task.worktreePath, task.repoPath])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const selectCommit = useCallback(async (hash: string) => {
    setSelectedHash(hash)
    try {
      const result = await api.git.diff(task.worktreePath, hash)
      setDiff(result.diff)
    } catch {
      setDiff('')
    }
  }, [task.worktreePath])

  const handleMerge = useCallback(async () => {
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
  }, [task.repoPath, task.worktreePath, task.branch, targetBranch, loadAll])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-dim text-[13px]">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
          </svg>
          Loading graph…
        </div>
      </div>
    )
  }

  return (
    <><PanelGroup direction="horizontal" className="h-full overflow-hidden">
      {/* Commit graph */}
      <Panel defaultSize={40} minSize={25}>
        <div className="flex flex-col h-full border-r border-border-soft">
          {/* Branch header */}
          <div className="px-4 py-2.5 border-b border-border-soft flex-shrink-0 flex items-center gap-2.5 bg-surface-1">
            <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="3" cy="3.5" r="0.7" fill="currentColor"/>
              <circle cx="10.5" cy="9" r="0.7" fill="currentColor"/>
            </svg>
            <span className="text-[10px] tracking-[0.12em] text-muted-dim uppercase font-medium">Branch</span>
            <span className="text-[13px] text-accent font-mono font-medium truncate">{branch}</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {lines.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-dim text-[13px]">No commits yet</p>
              </div>
            ) : (
              <div className="font-mono text-[13px]">
                {lines.map((line) => {
                  const isSelected = selectedHash === line.hash
                  return (
                    <div
                      key={line.hash + line.prefix}
                      onClick={() => selectCommit(line.hash)}
                      className={`flex cursor-pointer transition-all duration-75 ${
                        isSelected ? 'bg-accent-bg border-l-[3px] border-l-accent' : 'hover:bg-surface-2/30 border-l-[3px] border-l-transparent'
                      }`}
                    >
                      <span className="text-muted-dim/60 whitespace-pre py-1.5 pl-4 leading-snug select-none">
                        {line.prefix}
                      </span>
                      <span className="flex-1 min-w-0 py-1.5 pr-3 leading-snug">
                        <span className="text-text-primary truncate block font-medium">{line.message}</span>
                        <div className="flex items-center gap-3 text-[11px] mt-0.5">
                          <span className="text-muted-dim">{line.author}</span>
                          {line.refs && (
                            <span className="text-accent bg-accent-bg px-1.5 py-px rounded-md font-medium">{line.refs}</span>
                          )}
                        </div>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-2.5 border-t border-border-soft flex-shrink-0 flex gap-2">
            <button
              onClick={loadAll}
              className="flex-1 h-8 text-[12px] text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors duration-100 font-medium"
            >
              Refresh
            </button>
            <button
              onClick={() => setConfirmMerge(true)}
              disabled={merging || lines.length === 0}
              className="flex-1 h-8 text-[12px] bg-accent hover:bg-accent-dim text-white rounded-lg transition-colors duration-100 disabled:opacity-50 font-medium"
            >
              {merging ? 'Merging…' : `Merge to ${targetBranch}`}
            </button>
          </div>
        </div>
      </Panel>

      <PanelResizeHandle className="group relative w-2.5 flex items-center justify-center hover:bg-accent/5 active:bg-accent/10 transition-colors duration-100 cursor-col-resize">
        <div className="w-[2px] h-8 rounded-full bg-border-soft group-hover:bg-accent/40 group-active:bg-accent transition-colors" />
      </PanelResizeHandle>

      {/* Diff view */}
      <Panel defaultSize={60} minSize={30}>
        <div className="h-full overflow-y-auto bg-surface-0">
        {diff ? (
          <pre className="text-[13px] font-mono p-4 whitespace-pre-wrap leading-relaxed">
            {diff.split('\n').map((line, i) => (
              <span
                key={i}
                className={
                  line.startsWith('+') && !line.startsWith('+++')
                    ? 'text-success bg-success/5 block'
                    : line.startsWith('-') && !line.startsWith('---')
                    ? 'text-error bg-error/5 block'
                    : line.startsWith('@@')
                    ? 'text-accent block'
                    : 'text-muted-dim block'
                }
              >
                {line}
              </span>
            ))}
          </pre>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-dim text-[13px]">Select a commit to view changes</p>
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
})
