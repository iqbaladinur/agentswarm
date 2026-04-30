import { useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import type { Task } from '@shared/ipc-types'
import { pty, onPtyOutput, onPtyExit } from '../../lib/api'
import { useTaskStore } from '../../store/taskStore'

interface Props {
  task: Task
  isActive: boolean
}

export function TerminalTab({ task, isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const { updateTaskStatus } = useTaskStore()

  useEffect(() => {
    if (isActive && fitAddonRef.current) {
      const t = setTimeout(() => fitAddonRef.current?.fit(), 50)
      return () => clearTimeout(t)
    }
  }, [isActive])

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      theme: {
        background: '#141414',
        foreground: '#e5e5e5',
        cursor: '#7c6af7',
        selectionBackground: '#7c6af740',
        black: '#0d0d0d',
        brightBlack: '#3e3e3e',
      },
      fontFamily: 'JetBrains Mono, Fira Code, Cascadia Code, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    termRef.current = term
    fitAddonRef.current = fitAddon

    pty.spawn(task.id, task.worktreePath)
    updateTaskStatus(task.id, 'running')

    let unlistenOutput: (() => void) | null = null
    let unlistenExit: (() => void) | null = null

    onPtyOutput((e) => {
      if (e.taskId === task.id) term.write(e.data)
    }).then((fn) => { unlistenOutput = fn })

    onPtyExit((e) => {
      if (e.taskId === task.id) {
        updateTaskStatus(task.id, 'idle')
        term.write('\r\n\x1b[33m[session ended — press any key to restart]\x1b[0m\r\n')
      }
    }).then((fn) => { unlistenExit = fn })

    term.onData((data) => {
      pty.write(task.id, data)
    })

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      pty.resize(task.id, term.cols, term.rows)
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      unlistenOutput?.()
      unlistenExit?.()
      resizeObserver.disconnect()
      pty.kill(task.id)
      term.dispose()
    }
  }, [task.id])

  return (
    <div
      ref={containerRef}
      className="h-full w-full p-1"
      style={{ background: '#141414' }}
    />
  )
}
