import { useEffect, useState, memo, useCallback, useMemo } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import type { Task, GraphLine } from '@shared/ipc-types'
import { api } from '../../lib/api'
import { parseGraph, maxGraphColumns } from '../../lib/graphParser'
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

  // ── SVG graph layout ────────────────────────────────────────────
  const LANE_W = 14
  const GUTTER = 10
  const ROW_H = 38
  const DOT_R = 3
  const DOT_R_SEL = 5.5

  const parsedRows = useMemo(() => parseGraph(lines), [lines])
  const graphCols = useMemo(() => Math.max(maxGraphColumns(lines), 1), [lines])
  const graphWidth = graphCols * LANE_W + LANE_W + GUTTER + 12
  const x = (col: number) => GUTTER + col * LANE_W + LANE_W / 2
  const midY = ROW_H / 2

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
              <div className="font-mono text-[13px] relative" style={{ minHeight: parsedRows.length * ROW_H }}>
                {/* Single SVG overlay — z-0, spans all rows so lines connect seamlessly */}
                <svg
                  className="absolute top-0 left-0 z-0 pointer-events-none"
                  style={{ width: graphWidth }}
                  height={parsedRows.length * ROW_H}
                  viewBox={`0 0 ${graphWidth} ${parsedRows.length * ROW_H}`}
                  shapeRendering="geometricPrecision"
                >
                  {parsedRows.map((row, ri) => {
                    const isSelected = selectedHash === row.commit.hash
                    const rowTop = ri * ROW_H
                    const rowBottom = (ri + 1) * ROW_H
                    return (
                      <g key={ri}>
                        {/* Lines */}
                        {row.segments.map((seg, si) => {
                          if (seg.type === 'dot') return null
                          const cx = x(seg.col)
                          if (seg.type === 'vline') {
                            return (
                              <line
                                key={si}
                                x1={cx} y1={rowTop}
                                x2={cx} y2={rowBottom}
                                stroke={seg.color}
                                strokeWidth={1.5}
                                strokeLinecap="round"
                              />
                            )
                          }
                          if (seg.type === 'upleft') {
                            const cx = x(seg.col)
                            const xFrom = cx + LANE_W
                            const xTo = cx - LANE_W
                            return (
                              <path
                                key={si}
                                d={`M ${xFrom} ${rowTop} C ${xFrom} ${rowTop + ROW_H * 0.45} ${xTo} ${rowTop + ROW_H * 0.55} ${xTo} ${rowBottom}`}
                                stroke={seg.color}
                                strokeWidth={1.5}
                                strokeLinecap="round"
                                fill="none"
                              />
                            )
                          }
                          if (seg.type === 'upright') {
                            const cx = x(seg.col)
                            const xFrom = cx - LANE_W
                            const xTo = cx + LANE_W
                            return (
                              <path
                                key={si}
                                d={`M ${xFrom} ${rowTop} C ${xFrom} ${rowTop + ROW_H * 0.45} ${xTo} ${rowTop + ROW_H * 0.55} ${xTo} ${rowBottom}`}
                                stroke={seg.color}
                                strokeWidth={1.5}
                                strokeLinecap="round"
                                fill="none"
                              />
                            )
                          }
                          return null
                        })}
                        {/* Dots — drawn on top of lines */}
                        {row.segments.map((seg, si) => {
                          if (seg.type !== 'dot') return null
                          const r = isSelected ? DOT_R_SEL : DOT_R
                          return (
                            <circle
                              key={`dot-${si}`}
                              cx={x(seg.col)}
                              cy={rowTop + midY}
                              r={r}
                              fill={seg.color}
                              stroke={seg.color}
                              strokeWidth={1.5}
                              filter={isSelected ? `drop-shadow(0 0 5px ${seg.color})` : undefined}
                            />
                          )
                        })}
                      </g>
                    )
                  })}
                </svg>

                {/* Commit text rows — z-10 sits above SVG; graph column is transparent so lines show through */}
                {parsedRows.map((row) => {
                  const hasCommit = row.commit.hash !== ''
                  const isSelected = hasCommit && selectedHash === row.commit.hash
                  // Per-row graph column width — tight to this row's actual content
                  const maxSegCol = row.segments.reduce((m, s) => {
                    const r = s.type === 'upleft' || s.type === 'upright' ? s.col + 1 : s.col
                    return r > m ? r : m
                  }, 0)
                  const rowGraphW = x(maxSegCol) + LANE_W + 4
                  return (
                    <div
                      key={(row.commit.hash || 'g') + row.commit.prefix}
                      onClick={() => hasCommit && selectCommit(row.commit.hash)}
                      className="flex items-center z-10"
                      style={{ height: ROW_H }}
                    >
                      {/* Transparent graph column — SVG lines show through */}
                      <div style={{ width: rowGraphW, height: ROW_H }} className="flex-shrink-0" />

                      {/* Text area — solid bg blocks SVG lines behind it */}
                      <div
                        className={`flex items-center flex-1 min-w-0 h-full pr-3 transition-all duration-75 ${
                          isSelected ? 'bg-accent-bg border-l-[3px] border-l-accent'
                          : hasCommit ? 'bg-surface-0 hover:bg-surface-2/30 border-l-[3px] border-l-transparent cursor-pointer'
                          : 'bg-surface-0 border-l-[3px] border-l-transparent'
                        }`}
                      >
                        {hasCommit ? (
                          <>
                            <span className="text-[13px] text-text-primary truncate font-medium">{row.commit.message}</span>
                            <span className="text-[11px] text-muted-dim ml-2 flex-shrink-0">{row.commit.author}</span>
                            <span className="flex-1 min-w-[8px]" />
                            {row.commit.refs && (
                              <span className="text-[11px] text-accent bg-accent-bg px-1.5 py-px rounded-md font-medium max-w-[40%] truncate flex-shrink-0">
                                {row.commit.refs}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="flex-1" />
                        )}
                      </div>
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
