import { useEffect, useState, memo } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'

interface Props {
  onOpenSettings?: () => void
}

export const TitleBar = memo(function TitleBar({ onOpenSettings }: Props) {
  const [maximized, setMaximized] = useState(false)
  const appWindow = getCurrentWindow()

  useEffect(() => {
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setMaximized)
    })
    appWindow.isMaximized().then(setMaximized)
    return () => { unlisten.then((fn) => fn()) }
  }, [])

  return (
    <div className="flex items-center h-9 bg-surface-1 border-b border-border-soft select-none flex-shrink-0">
      <div
        data-tauri-drag-region
        onDoubleClick={() => appWindow.toggleMaximize()}
        className="flex items-center gap-2.5 px-3 text-xs flex-1 h-full"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-glow" />
        <span className="text-text-secondary font-medium tracking-wide">AgentSwarm</span>
      </div>

      <div className="flex h-full">
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="px-3 h-full text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
            aria-label="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}
        <button
          onClick={() => appWindow.minimize()}
          className="px-3.5 h-full text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors text-sm"
          aria-label="Minimize"
        >
          <svg width="12" height="2" viewBox="0 0 12 2" fill="none">
            <rect width="12" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="px-3.5 h-full text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors text-sm"
          aria-label={maximized ? 'Restore' : 'Maximize'}
        >
          {maximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="2" y="0" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="0" y="3" width="9" height="9" rx="1.5" fill="#111114" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          )}
        </button>
        <button
          onClick={() => appWindow.close()}
          className="px-3.5 h-full text-text-secondary hover:text-white hover:bg-error/90 transition-colors text-sm rounded-tr-lg"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
})
