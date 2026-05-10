import { useEffect } from 'react'
import { Sidebar } from './components/Sidebar/Sidebar'
import { WorkspaceArea } from './components/WorkspaceArea'
import { useTaskStore } from './store/taskStore'
import { useUIStore } from './store/uiStore'
import { WelcomeScreen } from './components/WelcomeScreen'
import { TitleBar } from './components/TitleBar'

export default function App() {
  const repoPath = useTaskStore((s) => s.repoPath)
  const initialized = useTaskStore((s) => s.initialized)
  const init = useTaskStore((s) => s.init)
  const activeTaskId = useUIStore((s) => s.activeTaskId)

  useEffect(() => {
    init()
  }, [])

  if (!initialized) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-0">
        <span className="text-muted text-xs">Loading...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-surface-0">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {repoPath ? (
          <>
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeTaskId ? <WorkspaceArea /> : <EmptyState />}
            </div>
          </>
        ) : (
          <WelcomeScreen />
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-muted">
      <p className="text-base">Click a task to open it, or create a new one</p>
    </div>
  )
}
