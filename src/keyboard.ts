import type { AttendanceStatus, MarkValue } from './types'

export type CellPosition = { row: number; column: number }
export type JournalKeyAction =
  | { type: 'move'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'grade'; value: MarkValue }
  | { type: 'attendance'; value: AttendanceStatus }
  | { type: 'details' }
  | { type: 'delete' }
  | { type: 'undo' }
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

/** Russian semantic shortcuts: based on the entered character, not its physical US keyboard position. */
export function interpretJournalKey(input: JournalKeyInput): JournalKeyAction | null {
  const lower = input.key.toLocaleLowerCase('ru-RU')
  if ((input.ctrlKey || input.metaKey) && !input.altKey && !input.shiftKey &&
      (lower === 'z' || input.code === 'KeyZ') && !input.repeat) return { type: 'undo' }
  if (input.ctrlKey || input.metaKey || input.altKey) return null
  if (input.key === 'Escape') return { type: 'stop' }
  if (input.key === 'Enter' && !input.repeat) return { type: 'details' }
  if (input.key === 'ArrowUp') return { type:'move', direction:'up' }
  if (input.key === 'ArrowDown') return { type:'move', direction:'down' }
  if (input.key === 'ArrowLeft') return { type:'move', direction:'left' }
  if (input.key === 'ArrowRight') return { type:'move', direction:'right' }
  // No auto-repeated mutation on long key presses.
  if (input.repeat) return null
  if ((input.key === 'Backspace' || input.key === 'Delete') && !input.shiftKey)
    return { type:'delete' }
  if (input.shiftKey && (lower === 'з' || lower === 'z'))
    return { type:'grade', value:'НЗ' }
  if (input.shiftKey) return null
  if (/^[2-5]$/.test(input.key)) return { type:'grade', value:input.key as MarkValue }
  const keys: Record<string, JournalKeyAction> = {
    'н': {type:'attendance',value:'absent'},
    'п': {type:'attendance',value:'present'},
    'у': {type:'attendance',value:'excused'},
    'о': {type:'attendance',value:'late'},
    'з': {type:'grade',value:'З'},
    'б': {type:'grade',value:'НЗ'},
    // Optional transliterated aliases for users with English keyboard layout.
    'n': {type:'attendance',value:'absent'},
    'p': {type:'attendance',value:'present'},
    'u': {type:'attendance',value:'excused'},
    'o': {type:'attendance',value:'late'},
    'z': {type:'grade',value:'З'},
    'b': {type:'grade',value:'НЗ'},
  }
  return keys[lower] ?? null
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
