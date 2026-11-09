import type { AttendanceEntry, AttendanceStatus, DemoState, GradeCategory, MarkValue, Lesson } from './types'

export type BrushTool =
  | { kind: 'grade'; value: MarkValue; category: GradeCategory }
  | { kind: 'attendance'; status: AttendanceStatus; lateMinutes?: number }

export type BrushTarget = { studentId: string; lessonId: string }
type GradeChange = { kind: 'grade'; id: string }
type AttendanceChange = { kind: 'attendance'; before: AttendanceEntry | null; after: AttendanceEntry }
export type BrushChange = GradeChange | AttendanceChange
export type BrushResult = {
  next: DemoState
  changes: BrushChange[]
  addedGrades: number
  changedAttendance: number
  overwrittenAttendance: number
  skipped: number
}

export const brushKey = (cell: BrushTarget) => cell.studentId + '|' + cell.lessonId

export function uniqueTargets(cells: BrushTarget[]): BrushTarget[] {
  return [...new Map(cells.map(cell => [brushKey(cell), cell])).values()]
}

function sameAttendance(a: AttendanceEntry, b: AttendanceEntry) {
  return a.studentId === b.studentId &&
    a.lessonId === b.lessonId &&
    a.status === b.status &&
    (a.status !== 'late' || a.lateMinutes === b.lateMinutes)
}

/**
 * Apply one explicitly previewed operation. Attendance is upserted only for selected
 * cells; grades append MANUAL entries and never replace LMS grades.
 */
export function applyBrush(
  state: DemoState, cells: BrushTarget[], tool: BrushTool, makeId: () => string,
): BrushResult {
  const grades = [...state.grades]
  const attendance = [...state.attendance]
  const changes: BrushChange[] = []
  let addedGrades = 0
  let changedAttendance = 0
  let overwrittenAttendance = 0
  let skipped = 0

  for (const cell of uniqueTargets(cells)) {
    if (tool.kind === 'grade') {
      const id = makeId()
      grades.push({
        id, studentId: cell.studentId, lessonId: cell.lessonId,
        value: tool.value, category: tool.category, source: 'manual',
      })
      changes.push({ kind: 'grade', id })
      addedGrades++
    } else {
      const after: AttendanceEntry = {
        ...cell, status: tool.status,
        ...(tool.status === 'late' ? { lateMinutes: Math.min(120, Math.max(1, tool.lateMinutes ?? 10)) } : {}),
      }
      const index = attendance.findIndex(a => a.studentId === cell.studentId && a.lessonId === cell.lessonId)
      const before = index < 0 ? null : attendance[index]
      if (before && sameAttendance(before, after)) { skipped++; continue }
      if (before) { attendance.splice(index, 1); overwrittenAttendance++ }
      attendance.push(after)
      changes.push({ kind: 'attendance', before, after })
      changedAttendance++
    }
  }
  return {
    next: { ...state, grades, attendance }, changes,
    addedGrades, changedAttendance, overwrittenAttendance, skipped,
  }
}

/**
 * Undo only records that are still identical to those written by the brush.
 * Other marks and unrelated edits survive. This is demo-only local undo; the
 * official journal must implement event/audit-based reversal on the server.
 */
export function undoBrush(state: DemoState, changes: BrushChange[]): DemoState {
  const ids = new Set(changes.filter((x): x is GradeChange => x.kind === 'grade').map(x => x.id))
  const grades = state.grades.filter(g => !ids.has(g.id))
  let attendance = [...state.attendance]
  for (const change of changes) {
    if (change.kind !== 'attendance') continue
    const index = attendance.findIndex(a => a.studentId === change.after.studentId && a.lessonId === change.after.lessonId)
    if (index < 0 || !sameAttendance(attendance[index], change.after)) continue
    attendance.splice(index, 1)
    if (change.before) attendance.push(change.before)
  }
  return { ...state, grades, attendance }
}

export function attendanceOverrides(
  records: AttendanceEntry[], cells: BrushTarget[], status: AttendanceStatus, minutes = 10,
): number {
  const byKey = new Map(records.map(record => [brushKey(record), record]))
  return uniqueTargets(cells).filter(cell => {
    const previous = byKey.get(brushKey(cell))
    if (!previous) return false
    return previous.status !== status ||
      (status === 'late' && previous.lateMinutes !== minutes)
  }).length
}

export function pickFeaturedLesson(lessons: Lesson[], todayIso: string):
  { lesson: Lesson; relation: 'today' | 'upcoming' | 'past' } | null {
  if (!lessons.length) return null
  const sorted = [...lessons].sort((a,b) => a.date.localeCompare(b.date))
  const today = sorted.find(l => l.date === todayIso)
  if (today) return {lesson:today,relation:'today'}
  const upcoming = sorted.find(l => l.date > todayIso)
  if (upcoming) return {lesson:upcoming,relation:'upcoming'}
  return {lesson:sorted[sorted.length-1],relation:'past'}
}
