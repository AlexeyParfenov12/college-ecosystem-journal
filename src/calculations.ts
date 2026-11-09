import type { AttendanceEntry, GradeEntry, GradingPolicy, Lesson } from './types'

export interface StudentSummary {
  gradeAverage: number | null
  attendancePercent: number | null
  attendanceGrade: number | null
  finalScore: number | null
  suggestedMark: number | null
  gradeCount: number
  absences: number
  lateness: number
}

export function markAsNumber(value: GradeEntry['value'], policy: GradingPolicy): number | null {
  if (value === 'З') return policy.passEnabled ? 5 : null
  if (value === 'НЗ') return policy.passEnabled ? 2 : null
  return policy.numericEnabled ? Number(value) : null
}

export function suggestedMark(score: number | null): number | null {
  if (score === null) return null
  if (score >= 4.5) return 5
  if (score >= 3.5) return 4
  if (score >= 2.5) return 3
  return 2
}

export function summarizeStudent(
  studentId: string, journalLessons: Lesson[], grades: GradeEntry[],
  attendance: AttendanceEntry[], policy: GradingPolicy,
): StudentSummary {
  const ids = new Set(journalLessons.map(l => l.id))
  const studentGrades = grades.filter(g => g.studentId === studentId && ids.has(g.lessonId))
  let weightedTotal = 0
  let totalWeight = 0
  let gradeCount = 0
  for (const g of studentGrades) {
    const number = markAsNumber(g.value, policy)
    if (number === null) continue
    const weight = Math.max(0, policy.categoryWeights[g.category] ?? 1)
    if (weight <= 0) continue
    weightedTotal += number * weight
    totalWeight += weight
    gradeCount++
  }
  const gradeAverage = totalWeight > 0 ? weightedTotal / totalWeight : null
  const entries = attendance.filter(a => a.studentId === studentId && ids.has(a.lessonId))
  // Excused absences are excluded from the attendance denominator in this demo.
  // Real institutions must adopt their own documented rule.
  const measured = entries.filter(a => a.status !== 'excused')
  const attended = measured.filter(a => a.status === 'present' || a.status === 'late').length
  const attendancePercent = measured.length ? 100 * attended / measured.length : null
  const attendanceGrade = attendancePercent === null ? null :
    attendancePercent >= 90 ? 5 : attendancePercent >= 75 ? 4 : attendancePercent >= 60 ? 3 : 2
  const allowedAttendanceWeight = policy.attendanceEnabled
    ? Math.min(30, Math.max(0, policy.attendanceWeight)) / 100 : 0
  const finalScore = gradeAverage === null ? null :
    attendanceGrade === null ? gradeAverage :
    gradeAverage * (1 - allowedAttendanceWeight) + attendanceGrade * allowedAttendanceWeight
  return {
    gradeAverage, attendancePercent, attendanceGrade, finalScore,
    suggestedMark: suggestedMark(finalScore), gradeCount,
    absences: entries.filter(a => a.status === 'absent').length,
    lateness: entries.filter(a => a.status === 'late').length,
  }
}
