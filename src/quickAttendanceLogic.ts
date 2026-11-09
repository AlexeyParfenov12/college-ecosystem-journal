import type { AttendanceEntry, Student } from './types'

/** Не изменяет посещаемость других занятий и не перезаписывает существующие отметки. */
export function fillMissingPresent(
  entries: AttendanceEntry[], students: Student[], lessonId: string,
): { attendance: AttendanceEntry[]; added: number } {
  const existing = new Set(entries.filter(a => a.lessonId === lessonId).map(a => a.studentId))
  const missing = students.filter(s => !existing.has(s.id))
  return {
    attendance: [...entries, ...missing.map(s => ({ studentId: s.id, lessonId, status: 'present' as const }))],
    added: missing.length,
  }
}
