import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useTaskStore } from '../../store/taskStore'
import { useUIStore } from '../../store/uiStore'
import { TaskItem } from './TaskItem'
import { NewTaskInput } from './NewTaskInput'
import { FolderPicker } from '../FolderPicker'
import { AlertDialog } from '../AlertDialog'

export const Sidebar = memo(function Sidebar() {
  const tasks = useTaskStore((s) => s.tasks)
  const repoPath = useTaskStore((s) => s.repoPath)
  const repos = useTaskStore((s) => s.repos)
  const switchRepo = useTaskStore((s) => s.switchRepo)
  const openRepo = useTaskStore((s) => s.openRepo)
  const closeRepo = useTaskStore((s) => s.closeRepo)
  const removeRepo = useTaskStore((s) => s.removeRepo)
  const activeTaskId = useUIStore((s) => s.activeTaskId)

  const [showNewInput, setShowNewInput] = useState(false)
  const [showRepoMenu, setShowRepoMenu] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const repoName = repoPath?.split('/').pop() ?? ''
  const [alertMsg, setAlertMsg] = useState<{ title: string; message: string } | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowRepoMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handlePickerSelect = useCallback(async (path: string) => {
    try {
      await openRepo(path)
    } catch (err: any) {
      setAlertMsg({ title: 'Error', message: err.message })
    }
  }, [openRepo])

  return (
    <div className="flex flex-col w-56 min-w-56 border-r border-border-soft bg-surface-1 h-full">
      {showPicker && (
        <FolderPicker
          onSelect={(p) => { setShowPicker(false); setShowRepoMenu(false); handlePickerSelect(p) }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {alertMsg && (
        <AlertDialog title={alertMsg.title} message={alertMsg.message} onClose={() => setAlertMsg(null)} />
      )}

      {/* Repo header */}
      <div className="relative border-b border-border-soft" ref={menuRef}>
        <button
          onClick={() => setShowRepoMenu((v) => !v)}
          className="w-full px-3.5 py-3 text-left hover:bg-surface-2/50 transition-colors duration-150"
        >
          <p className="text-[10px] tracking-[0.12em] text-muted-dim uppercase font-medium mb-1">Repository</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success/80 flex-shrink-0" />
            <p className="text-[13px] text-text-primary font-medium truncate flex-1">{repoName || '—'}</p>
            <svg className={`w-3.5 h-3.5 text-text-secondary transition-transform duration-150 ${showRepoMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {showRepoMenu && (
          <div className="dropdown-enter absolute top-full left-2 right-2 z-20 mt-1 bg-surface-2 border border-border rounded-lg shadow-dropdown overflow-hidden">
            {repos.map((repo) => {
              const isActive = repo.path === repoPath
              return (
                <div key={repo.path} className="flex items-center group">
                  <button
                    onClick={() => { switchRepo(repo.path); setShowRepoMenu(false) }}
                    className={`flex-1 px-3 py-2.5 text-left text-[13px] truncate transition-colors duration-100 ${
                      isActive
                        ? 'text-accent bg-accent-bg'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-3'
                    }`}
                    title={repo.path}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-1 h-1 rounded-full flex-shrink-0 ${isActive ? 'bg-accent' : 'bg-transparent'}`} />
                      {repo.name}
                    </span>
                  </button>
                  <button
                    onClick={() => removeRepo(repo.path)}
                    className="opacity-0 group-hover:opacity-100 px-2.5 py-2.5 text-text-secondary hover:text-error text-sm transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              )
            })}
            <div className="border-t border-border-soft">
              <button
                onClick={() => { closeRepo(); setShowRepoMenu(false) }}
                className="w-full px-3 py-2.5 text-left text-[13px] text-text-secondary hover:text-error hover:bg-surface-3 transition-colors duration-100"
              >
                Close folder
              </button>
              <button
                onClick={() => setShowPicker(true)}
                className="w-full px-3 py-2.5 text-left text-[13px] text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors duration-100"
              >
                + Open another repo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tasks label */}
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <span className="text-[10px] tracking-[0.12em] text-muted-dim uppercase font-medium">Tasks</span>
        <span className="text-[11px] text-muted-dim tabular-nums bg-surface-2 px-1.5 py-0.5 rounded-md">{tasks.length}</span>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} isActive={activeTaskId === task.id} />
        ))}
        {showNewInput && <NewTaskInput onDone={() => setShowNewInput(false)} />}
      </div>

      {/* New task button */}
      <div className="p-2 border-t border-border-soft">
        <button
          onClick={() => setShowNewInput(true)}
          className="w-full h-9 flex items-center justify-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary hover:bg-surface-2/60 rounded-lg transition-colors duration-100"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          New Task
        </button>
      </div>
    </div>
  )
})
