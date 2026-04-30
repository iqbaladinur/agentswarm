import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { useUIStore } from '../store/uiStore'
import { useTaskStore } from '../store/taskStore'
import { TaskPanel } from './TaskPanel/TaskPanel'

export function WorkspaceArea() {
  const { panelTaskIds } = useUIStore()
  const { tasks } = useTaskStore()

  const panelTasks = panelTaskIds
    .map((id) => tasks.find((t) => t.id === id))
    .filter(Boolean) as typeof tasks

  if (panelTasks.length === 0) return null

  return (
    <PanelGroup direction="horizontal" className="h-full">
      {panelTasks.map((task, i) => (
        <>
          <Panel key={task.id} minSize={20}>
            <TaskPanel task={task} />
          </Panel>
          {i < panelTasks.length - 1 && (
            <PanelResizeHandle
              key={`handle-${i}`}
              className="w-1 bg-border hover:bg-accent transition-colors cursor-col-resize"
            />
          )}
        </>
      ))}
    </PanelGroup>
  )
}
