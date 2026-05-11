import type { GraphLine } from '@shared/ipc-types'

export interface GraphSegment {
  col: number
  type: 'vline' | 'upleft' | 'upright' | 'dot'
  color: string
}

export interface ParsedRow {
  commit: GraphLine
  commitCol: number
  segments: GraphSegment[]
}

const LANE_COLORS = [
  '#5b9bd5',
  '#6aaf50',
  '#e06c75',
  '#d4a03c',
  '#c678dd',
  '#56b6c2',
]

export function parseGraph(lines: GraphLine[]): ParsedRow[] {
  const colColors: Record<number, string> = {}
  let nextColor = 0

  // Pre-assign colors to all columns that have content, left-to-right
  for (const line of lines) {
    for (let col = 0; col < line.prefix.length; col++) {
      if (line.prefix[col] !== ' ' && !colColors[col]) {
        colColors[col] = LANE_COLORS[nextColor % LANE_COLORS.length]
        nextColor++
      }
    }
  }

  return lines.map((line) => {
    const segments: GraphSegment[] = []
    let commitCol = -1

    for (let col = 0; col < line.prefix.length; col++) {
      const ch = line.prefix[col]
      if (ch === ' ') continue

      const color = colColors[col] ?? LANE_COLORS[0]

      if (ch === '*') {
        commitCol = col
        segments.push({ col, type: 'vline', color })
        segments.push({ col, type: 'dot', color })
      } else if (ch === '|') {
        segments.push({ col, type: 'vline', color })
      } else if (ch === '/') {
        segments.push({ col, type: 'upleft', color })
      } else if (ch === '\\') {
        segments.push({ col, type: 'upright', color })
      }
    }

    return { commit: line, commitCol, segments }
  })
}

export function maxGraphColumns(lines: GraphLine[]): number {
  return lines.reduce((m, l) => Math.max(m, l.prefix.length), 0)
}
