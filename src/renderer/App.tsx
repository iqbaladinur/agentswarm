import { useEffect } from 'react'
import { Sidebar } from './components/Sidebar/Sidebar'
import { WorkspaceArea } from './components/WorkspaceArea'
import { useTaskStore } from './store/taskStore'
import { useUIStore } from './store/uiStore'
import { WelcomeScreen } from './components/WelcomeScreen'

export default function App() {
  const { repoPath, initialized, init } = useTaskStore()
  const { panelTaskIds } = useUIStore()

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
    <div className="flex h-full w-full overflow-hidden bg-surface-0">
      {repoPath ? (
        <>
          <Sidebar />
          <div className="flex-1 overflow-hidden">
            {panelTaskIds.length === 0 ? <EmptyState /> : <WorkspaceArea />}
          </div>
        </>
      ) : (
        <WelcomeScreen />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-muted">
      <p className="text-sm">Click a task to open it, or create a new one</p>
    </div>
  )
}
