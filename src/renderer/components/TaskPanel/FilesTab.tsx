import { useEffect, useState, memo, useCallback } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import type { Task, FileStatus } from '@shared/ipc-types'
import { api } from '../../lib/api'
import { AlertDialog } from '../AlertDialog'

interface Props {
  task: Task
  isActive: boolean
}

const STATUS_STYLE: Record<FileStatus['status'], { label: string; badge: string }> = {
  M: { label: 'M', badge: 'bg-warning/10 text-warning border-warning/20' },
  A: { label: 'A', badge: 'bg-success/10 text-success border-success/20' },
  D: { label: 'D', badge: 'bg-error/10 text-error border-error/20' },
  R: { label: 'R', badge: 'bg-accent/10 text-accent border-accent/20' },
  '?': { label: '?', badge: 'bg-surface-2 text-muted-dim border-border-soft' },
}

const DiffViewer = memo(function DiffViewer({ diff, filePath, onOpenInVscode }: { diff: string; filePath: string | null; onOpenInVscode: (path: string) => void }) {
  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-dim text-[13px]">Select a file to view changes</p>
      </div>
    )
  }

  if (!diff) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-dim text-[13px]">No diff available</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-soft bg-surface-1 flex-shrink-0">
        <span className="text-[13px] text-text-primary font-mono truncate">{filePath}</span>
        <button
          onClick={() => onOpenInVscode(filePath)}
          className="text-[12px] text-muted-dim hover:text-text-primary transition-colors duration-100 flex-shrink-0 font-medium"
        >
          Open in VS Code
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
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
      </div>
    </div>
  )
})

export const FilesTab = memo(function FilesTab({ task, isActive }: Props) {
  const [files, setFiles] = useState<FileStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [diff, setDiff] = useState<string>('')
  const [diffLoading, setDiffLoading] = useState(false)
  const [commitMsg, setCommitMsg] = useState('')
  const [committing, setCommitting] = useState(false)
  const [alertMsg, setAlertMsg] = useState<{ title: string; message: string } | null>(null)

  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.git.files(task.worktreePath)
      setFiles(result)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [task.worktreePath])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  useEffect(() => {
    if (isActive) loadFiles()
  }, [isActive, loadFiles])

  const loadDiff = useCallback(async (filePath: string) => {
    setSelectedFile(filePath)
    setDiffLoading(true)
    try {
      const result = await api.git.fileDiff(task.worktreePath, filePath)
      setDiff(result)
    } catch (err) {
      console.error(err)
      setDiff('')
    } finally {
      setDiffLoading(false)
    }
  }, [task.worktreePath])

  const handleCommit = useCallback(async () => {
    const msg = commitMsg.trim()
    if (!msg) return
    setCommitting(true)
    try {
      await api.git.commit(task.worktreePath, msg)
      setCommitMsg('')
      setSelectedFile(null)
      setDiff('')
      await loadFiles()
    } catch (err: any) {
      setAlertMsg({ title: 'Commit Failed', message: err.message })
    } finally {
      setCommitting(false)
    }
  }, [commitMsg, task.worktreePath, loadFiles])

  const handleOpenVscode = useCallback((filePath: string) => {
    api.shell.openVscode(`${task.worktreePath}/${filePath}`)
  }, [task.worktreePath])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-dim text-[13px]">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
          </svg>
          Loading files…
        </div>
      </div>
    )
  }

  return (
    <><div className="flex flex-col h-full overflow-hidden bg-surface-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-border-soft flex-shrink-0">
        <span className="text-[13px] text-text-secondary tabular-nums">
          {files.length} changed file{files.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={loadFiles}
          className="text-[12px] text-muted-dim hover:text-text-primary transition-colors duration-100 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Main split panel */}
      <div className="flex-1 overflow-hidden">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <svg className="w-6 h-6 text-muted-dim/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" d="M5 13l4 4L19 7"/>
            </svg>
            <p className="text-muted-dim text-[13px]">No uncommitted changes</p>
          </div>
        ) : (
          <PanelGroup direction="horizontal" className="h-full">
            {/* File list */}
            <Panel defaultSize={35} minSize={20}>
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  {files.map((file) => {
                    const style = STATUS_STYLE[file.status]
                    const isSelected = selectedFile === file.path
                    return (
                      <div
                        key={file.path}
                        className={`flex items-center gap-2.5 px-3.5 py-2 cursor-pointer transition-all duration-75 ${
                          isSelected ? 'bg-accent-bg border-l-[3px] border-l-accent' : 'hover:bg-surface-2/20 border-l-[3px] border-l-transparent'
                        }`}
                        onClick={() => loadDiff(file.path)}
                      >
                        <span className={`text-[10px] font-bold w-6 h-5 flex items-center justify-center rounded border ${style.badge}`}>
                          {style.label}
                        </span>
                        <span className="text-[13px] text-text-primary font-mono truncate flex-1">{file.path}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="group w-2.5 bg-transparent hover:bg-accent/5 active:bg-accent/10 transition-colors duration-100 cursor-col-resize flex items-center justify-center">
              <div className="w-[2px] h-8 rounded-full bg-border-soft group-hover:bg-accent/40 group-active:bg-accent transition-all" />
            </PanelResizeHandle>

            {/* Diff view */}
            <Panel defaultSize={65} minSize={30} className="bg-surface-0">
              {diffLoading ? (
                <div className="flex items-center justify-center h-full">
                  <span className="text-muted-dim text-[13px]">Loading diff…</span>
                </div>
              ) : (
                <DiffViewer diff={diff} filePath={selectedFile} onOpenInVscode={handleOpenVscode} />
              )}
            </Panel>
          </PanelGroup>
        )}
      </div>

      {/* Commit section */}
      {files.length > 0 && (
        <div className="border-t border-border-soft p-3 flex-shrink-0 flex flex-col gap-2 bg-surface-1">
          <input
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommit() } }}
            placeholder="Commit message…"
            className="w-full bg-surface-0 text-text-primary text-[13px] px-3 py-2 rounded-lg border border-border-soft focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none placeholder:text-muted-dim transition-all duration-100"
          />
          <button
            onClick={handleCommit}
            disabled={committing || !commitMsg.trim()}
            className="w-full h-9 text-[13px] bg-accent hover:bg-accent-dim text-white rounded-lg transition-colors duration-100 disabled:opacity-50 font-medium"
          >
            {committing ? 'Committing…' : 'Commit'}
          </button>
        </div>
      )}
    </div>

      {alertMsg && (
        <AlertDialog title={alertMsg.title} message={alertMsg.message} onClose={() => setAlertMsg(null)} />
      )}
    </>
  )
})
