import { useState, useRef, useEffect } from 'react'
import { useUIStore, type ThemeId, THEME_LABELS } from '../store/uiStore'

const THEMES: ThemeId[] = ['default', 'high-contrast', 'warm', 'dracula']

const THEME_PREVIEW: Record<ThemeId, { accent: string; bg: string; fg: string }> = {
  'default':         { accent: '#8b7cf7', bg: '#1a1a1f', fg: '#e4e4ed' },
  'high-contrast':   { accent: '#a88dfa', bg: '#12121c', fg: '#ffffff' },
  'warm':            { accent: '#f0b746', bg: '#1d1a15', fg: '#e8e4dc' },
  'dracula':         { accent: '#ff79c6', bg: '#1a1a36', fg: '#f8f8f2' },
}

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props) {
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const agentCmd = useUIStore((s) => s.agentCmd)
  const setAgentCmd = useUIStore((s) => s.setAgentCmd)
  const [agentInput, setAgentInput] = useState(agentCmd)
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const saveAgent = () => {
    setAgentCmd(agentInput.trim() || 'claude')
    setSaved(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="animate-fade-in-up w-[440px] bg-surface-2 border border-border rounded-xl p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] text-text-primary font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-dim hover:text-text-primary hover:bg-surface-3 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Theme */}
        <div className="mb-5">
          <h3 className="text-[12px] text-muted-dim font-medium mb-2.5">Color Theme</h3>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((t) => {
              const prev = THEME_PREVIEW[t]
              const active = t === theme
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`relative text-left p-3 rounded-lg border transition-all duration-100 ${
                    active
                      ? 'border-accent bg-accent-bg'
                      : 'border-border-soft hover:border-border bg-surface-1'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: prev.accent, boxShadow: `0 0 8px ${prev.accent}44` }}
                    />
                    <span className="text-[12px] text-text-primary font-medium">{THEME_LABELS[t]}</span>
                    {active && (
                      <svg className="ml-auto w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-6 h-3 rounded-sm" style={{ background: prev.bg }} />
                    <div className="w-6 h-3 rounded-sm" style={{ background: prev.accent, opacity: 0.4 }} />
                    <div className="w-6 h-3 rounded-sm" style={{ background: prev.fg, opacity: 0.2 }} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Default Agent */}
        <div>
          <h3 className="text-[12px] text-muted-dim font-medium mb-2.5">Default Agent Command</h3>
          <div className="flex gap-2">
            <input
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveAgent() }}
              className="flex-1 bg-surface-1 text-text-primary text-[13px] px-3 py-2 rounded-lg border border-border focus:border-accent outline-none font-mono transition-colors"
              placeholder="e.g. claude, codex, gemini"
            />
            <button
              onClick={saveAgent}
              disabled={saved}
              className={`px-4 py-2 text-[13px] rounded-lg font-medium transition-all duration-100 ${
                saved
                  ? 'bg-success text-white shadow-dot-success'
                  : 'text-white bg-accent hover:bg-accent-dim shadow-btn-accent'
              }`}
            >
              {saved ? (
                <span className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Saved
                </span>
              ) : 'Save'}
            </button>
          </div>
          <p className="text-[11px] text-muted-dim mt-1.5">
            Used as the default agent for new task terminals.
          </p>
        </div>
      </div>
    </div>
  )
}
