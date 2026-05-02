import { useState, useRef, useEffect } from 'react'
import { useTaskStore } from '../../store/taskStore'
import { useUIStore } from '../../store/uiStore'
import { TaskItem } from './TaskItem'
import { NewTaskInput } from './NewTaskInput'
import { FolderPicker } from '../FolderPicker'
import { AlertDialog } from '../AlertDialog'

export function Sidebar() {
  const { tasks, repoPath, repos, switchRepo, openRepo, closeRepo, removeRepo } = useTaskStore()
  const { activeTaskId } = useUIStore()
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

  const handlePickerSelect = async (path: string) => {
    try {
      await openRepo(path)
    } catch (err: any) {
      setAlertMsg({ title: 'Error', message: err.message })
    }
  }

  return (
    <div className="flex flex-col w-56 min-w-56 border-r border-border bg-surface-1 h-full">
      {showPicker && (
        <FolderPicker
          onSelect={(p) => { setShowPicker(false); setShowRepoMenu(false); handlePickerSelect(p) }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {alertMsg && (
        <AlertDialog title={alertMsg.title} message={alertMsg.message} onClose={() => setAlertMsg(null)} />
      )}

      {/* Repo header with switcher */}
      <div className="relative border-b border-border" ref={menuRef}>
        <button
          onClick={() => setShowRepoMenu((v) => !v)}
          className="w-full px-3 py-3 text-left hover:bg-surface-2 transition-colors"
        >
          <p className="text-xs text-muted uppercase tracking-wider">Repository</p>
          <div className="flex items-center gap-1 mt-0.5">
            <p className="text-sm text-white font-medium truncate flex-1">{repoName || '—'}</p>
            <span className="text-muted text-xs">▾</span>
          </div>
        </button>

        {showRepoMenu && (
          <div className="absolute top-full left-0 right-0 z-20 bg-surface-2 border border-border shadow-lg">
            {repos.map((repo) => {
              const isActive = repo.path === repoPath
              return (
                <div key={repo.path} className="flex items-center group">
                  <button
                    onClick={() => { switchRepo(repo.path); setShowRepoMenu(false) }}
                    className={`flex-1 px-3 py-2.5 text-left text-sm truncate transition-colors ${
                      isActive ? 'text-accent' : 'text-muted hover:text-white hover:bg-surface-3'
                    }`}
                    title={repo.path}
                  >
                    {isActive && <span className="mr-1">✓</span>}
                    {repo.name}
                  </button>
                  <button
                      onClick={() => removeRepo(repo.path)}
                      className="opacity-0 group-hover:opacity-100 px-2 py-2 text-muted hover:text-error text-sm transition-opacity"
                    >
                      ×
                    </button>
                </div>
              )
            })}
            <div className="border-t border-border">
              <button
                onClick={() => { closeRepo(); setShowRepoMenu(false) }}
                className="w-full px-3 py-2.5 text-left text-sm text-muted hover:text-error hover:bg-surface-3 transition-colors"
              >
                × Close folder
              </button>
              <button
                onClick={() => setShowPicker(true)}
                className="w-full px-3 py-2.5 text-left text-sm text-muted hover:text-white hover:bg-surface-3 transition-colors"
              >
                + Open another repo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tasks label + count */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs text-muted uppercase tracking-wider">Tasks</span>
        <span className="text-xs text-muted">{tasks.length}</span>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto">
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} isActive={activeTaskId === task.id} />
        ))}
        {showNewInput && <NewTaskInput onDone={() => setShowNewInput(false)} />}
      </div>

      {/* New task button */}
      <div className="p-2 border-t border-border">
        <button
          onClick={() => setShowNewInput(true)}
          className="w-full py-2 text-sm text-muted hover:text-white hover:bg-surface-3 rounded transition-colors"
        >
          + New Task
        </button>
      </div>
    </div>
  )
}
