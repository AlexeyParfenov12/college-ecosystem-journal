import type { AttendanceStatus, MarkValue } from './types'

export type CellPosition = { row: number; column: number }
export type JournalKeyAction =
  | { type: 'move'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'grade'; value: MarkValue }
  | { type: 'attendance'; value: AttendanceStatus }
  | { type: 'details' }
  | { type: 'stop' }

export interface JournalKeyInput {
  key: string
  code?: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  repeat?: boolean
}

export function interpretJournalKey(input: JournalKeyInput): JournalKeyAction | null {
  if (input.ctrlKey || input.metaKey || input.altKey) return null
  if (input.key === 'Escape') return { type: 'stop' }
  if (input.key === 'Enter' && !input.repeat) return { type: 'details' }
  const arrowMap: Record<string, JournalKeyAction['type'] | string> = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  }
  const direction = arrowMap[input.key]
  if (direction) return { type: 'move', direction: direction as 'up' | 'down' | 'left' | 'right' }
  // Do not create repeated grades/attendance when a key is held.
  if (input.repeat || input.shiftKey) return null
  if (/^[2-5]$/.test(input.key)) return { type: 'grade', value: input.key as MarkValue }
  // Physical Latin-letter keys work with both English and Russian keyboard layouts.
  // Cyrillic aliases are accepted for the symbols not conflicting with these keys.
  const codes: Record<string, JournalKeyAction> = {
    KeyN: { type: 'attendance', value: 'absent' },
    KeyP: { type: 'attendance', value: 'present' },
    KeyU: { type: 'attendance', value: 'excused' },
    KeyL: { type: 'attendance', value: 'late' },
    KeyZ: { type: 'grade', value: 'З' },
    KeyX: { type: 'grade', value: 'НЗ' },
  }
  if (input.code && codes[input.code]) return codes[input.code]
  const keys: Record<string, JournalKeyAction> = {
    n: { type: 'attendance', value: 'absent' },
    p: { type: 'attendance', value: 'present' },
    u: { type: 'attendance', value: 'excused' },
    l: { type: 'attendance', value: 'late' },
    z: { type: 'grade', value: 'З' },
    x: { type: 'grade', value: 'НЗ' },
    'н': { type: 'attendance', value: 'absent' },
    'у': { type: 'attendance', value: 'excused' },
    'о': { type: 'attendance', value: 'late' },
  }
  return keys[input.key.toLowerCase()] ?? null
}

/** Move only across visible rows/columns. Bounds never wrap for arrow keys. */
export function moveJournalCell(
  current: CellPosition, direction: 'up' | 'down' | 'left' | 'right',
  rowCount: number, columnCount: number,
): CellPosition {
  if (rowCount <= 0 || columnCount <= 0) return { row: 0, column: 0 }
  const delta = {
    up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1],
  }[direction]
  return {
    row: Math.min(rowCount - 1, Math.max(0, current.row + delta[0])),
    column: Math.min(columnCount - 1, Math.max(0, current.column + delta[1])),
  }
}

/** After quick entry: next student; at row end, top of next lesson. */
export function advanceJournalCell(current: CellPosition, rows: number, cols: number): CellPosition {
  if (rows <= 0 || cols <= 0) return { row: 0, column: 0 }
  if (current.row < rows - 1) return { ...current, row: current.row + 1 }
  if (current.column < cols - 1) return { row: 0, column: current.column + 1 }
  return current
}
