import { useEffect, useState } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'

export function TitleBar() {
  const [maximized, setMaximized] = useState(false)
  const appWindow = getCurrentWindow()

  useEffect(() => {
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setMaximized)
    })
    appWindow.isMaximized().then(setMaximized)
    return () => { unlisten.then((fn) => fn()) }
  }, [])

  const handleDoubleClick = () => {
    appWindow.toggleMaximize()
  }

  return (
    <div className="flex items-center h-9 bg-surface-1 border-b border-border select-none flex-shrink-0">
      {/* Drag region — title only, no buttons inside */}
      <div
        data-tauri-drag-region
        onDoubleClick={handleDoubleClick}
        className="flex items-center px-3 text-xs text-muted flex-1 h-full"
      >
        <span className="text-accent font-medium">AgentSwarm</span>
      </div>

      {/* Window controls — outside drag region */}
      <div className="flex h-full">
        <button
          onClick={() => appWindow.minimize()}
          className="px-4 h-full text-muted hover:text-white hover:bg-surface-3 transition-colors text-xs"
        >
          ─
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="px-4 h-full text-muted hover:text-white hover:bg-surface-3 transition-colors text-xs"
        >
          {maximized ? '❐' : '□'}
        </button>
        <button
          onClick={() => appWindow.close()}
          className="px-4 h-full text-muted hover:text-white hover:bg-error/80 transition-colors text-xs"
        >
          ×
        </button>
      </div>
    </div>
  )
}
