import { useEffect, useState, useRef } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import type { Task, FileStatus } from '@shared/ipc-types'
import { api } from '../../lib/api'
import { AlertDialog } from '../AlertDialog'

interface Props {
  task: Task
  isActive: boolean
}

const STATUS_STYLE: Record<FileStatus['status'], { label: string; class: string }> = {
  M: { label: 'M', class: 'text-warning' },
  A: { label: 'A', class: 'text-success' },
  D: { label: 'D', class: 'text-error' },
  R: { label: 'R', class: 'text-accent' },
  '?': { label: '?', class: 'text-muted' },
}

function DiffViewer({ diff, filePath, onOpenInVscode }: { diff: string; filePath: string | null; onOpenInVscode: (path: string) => void }) {
  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        Select a file to view changes
      </div>
    )
  }

  if (!diff) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        No diff available
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Diff header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-1 flex-shrink-0">
        <span className="text-sm text-white font-mono truncate">{filePath}</span>
        <button
          onClick={() => onOpenInVscode(filePath)}
          className="text-xs text-muted hover:text-white transition-colors flex-shrink-0"
        >
          Open in VS Code
        </button>
      </div>
      {/* Diff content */}
      <div className="flex-1 overflow-y-auto">
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
      </div>
    </div>
  )
}

export function FilesTab({ task, isActive }: Props) {
  const [files, setFiles] = useState<FileStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [diff, setDiff] = useState<string>('')
  const [diffLoading, setDiffLoading] = useState(false)
  const [commitMsg, setCommitMsg] = useState('')
  const [committing, setCommitting] = useState(false)
  const [alertMsg, setAlertMsg] = useState<{ title: string; message: string } | null>(null)
  const [agentCmd, setAgentCmd] = useState('claude')
  const [agentArgs, setAgentArgs] = useState<string[]>(['-p'])
  const [agentLabel, setAgentLabel] = useState('Claude')
  const [generating, setGenerating] = useState(false)
  const [showAgentMenu, setShowAgentMenu] = useState(false)
  const agentMenuRef = useRef<HTMLDivElement>(null)

  const AGENT_PRESETS = [
    { label: 'Claude', cmd: 'claude', args: ['-p'] },
    { label: 'OpenCode', cmd: 'opencode', args: ['run'] },
    { label: 'Gemini', cmd: 'gemini', args: [] },
    { label: 'Copilot', cmd: 'github-copilot', args: ['-p'] },
  ]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (agentMenuRef.current && !agentMenuRef.current.contains(e.target as Node)) {
        setShowAgentMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    loadFiles()
  }, [task.id])

  // Auto-refresh when this tab becomes active
  useEffect(() => {
    if (isActive) loadFiles()
  }, [isActive])

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

  const loadDiff = async (filePath: string) => {
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
  }

  const handleGenerateMessage = async () => {
    setGenerating(true)
    try {
      const msg = await api.git.generateCommitMessage(task.worktreePath, agentCmd, agentArgs)
      setCommitMsg(msg)
    } catch (err: any) {
      setAlertMsg({ title: 'Generation Failed', message: err.message || String(err) })
    } finally {
      setGenerating(false)
    }
  }

  const handleCommit = async () => {
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
    <><div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <span className="text-sm text-muted">{files.length} changed file{files.length !== 1 ? 's' : ''}</span>
        <button
          onClick={loadFiles}
          className="text-sm text-muted hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Main split panel */}
      <div className="flex-1 overflow-hidden">
        {files.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            No changes
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
                        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer border-b border-border transition-colors ${
                          isSelected ? 'bg-surface-3' : 'hover:bg-surface-2'
                        }`}
                        onClick={() => loadDiff(file.path)}
                      >
                        <span className={`text-sm font-mono font-bold w-5 flex-shrink-0 ${style.class}`}>
                          {style.label}
                        </span>
                        <span className="text-sm text-white font-mono truncate flex-1">{file.path}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="group w-[7px] bg-transparent hover:bg-accent/20 active:bg-accent/30 transition-colors cursor-col-resize relative flex items-center justify-center">
              <div className="w-px h-full bg-border/60 group-hover:bg-accent/50 transition-colors" />
            </PanelResizeHandle>

            {/* Diff view */}
            <Panel defaultSize={65} minSize={30} className="bg-surface-0">
              {diffLoading ? (
                <div className="flex items-center justify-center h-full text-muted text-xs">
                  Loading diff...
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
        <div className="border-t border-border p-3 flex-shrink-0 flex flex-col gap-2">
          <input
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommit() } }}
            placeholder="Commit message"
            className="w-full bg-surface-3 text-white text-sm px-3 py-2 rounded border border-border focus:border-accent outline-none"
          />
          <div className="flex gap-2">
            <div className="relative flex-shrink-0" ref={agentMenuRef}>
              <button
                onClick={() => setShowAgentMenu((v) => !v)}
                className="h-full px-2.5 py-1.5 text-sm bg-surface-3 text-white border border-border rounded hover:border-accent transition-colors flex items-center gap-1"
              >
                <span className="text-muted">{generating ? '...' : 'AI'}</span>
                <span className="text-xs text-muted">{showAgentMenu ? '▴' : '▾'}</span>
              </button>
              {showAgentMenu && (
                <div className="absolute bottom-full mb-1 left-0 z-30 bg-surface-2 border border-border shadow-lg min-w-[140px]">
                  {AGENT_PRESETS.map((a) => (
                    <button
                      key={a.cmd}
                      onClick={() => { setAgentCmd(a.cmd); setAgentArgs(a.args); setAgentLabel(a.label); setShowAgentMenu(false) }}
                      className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                        a.cmd === agentCmd ? 'text-accent bg-surface-3' : 'text-muted hover:text-white hover:bg-surface-3'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleGenerateMessage}
              disabled={generating}
              className="flex-1 py-2 text-sm bg-surface-3 hover:bg-surface-2 text-white rounded border border-border transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                'Generate'
              )}
            </button>
            <button
              onClick={handleCommit}
              disabled={committing || !commitMsg.trim()}
              className="flex-1 py-2 text-sm bg-accent hover:bg-accent-dim text-white rounded transition-colors disabled:opacity-50"
            >
              {committing ? 'Committing...' : 'Commit'}
            </button>
          </div>
        </div>
      )}
    </div>

      {alertMsg && (
        <AlertDialog title={alertMsg.title} message={alertMsg.message} onClose={() => setAlertMsg(null)} />
      )}
    </>
  )
}
