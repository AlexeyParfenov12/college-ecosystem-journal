import { markAsNumber, summarizeStudent } from './calculations'
import type {
  AttendanceEntry, GradeCategory, GradeEntry, GradingPolicy, Lesson, MarkValue, Student,
} from './types'

export interface StudentInsight {
  studentId: string
  code: 'few-grades' | 'low-average' | 'missing-attendance' | 'repeated-absence' | 'nonpass'
  severity: 'high' | 'medium'
  label: string
  explanation: string
}

export type Forecast = {
  currentAverage: number | null
  currentScore: number | null
  currentMark: number | null
  projectedAverage: number | null
  projectedScore: number | null
  projectedMark: number | null
  valid: boolean
}

function permittedMark(mark: MarkValue, policy: GradingPolicy): boolean {
  return (mark === 'З' || mark === 'НЗ') ? policy.passEnabled : policy.numericEnabled
}

/**
 * What-if only: adds ephemeral simulated grade records to the existing
 * calculation algorithm. Nothing is saved to GradeEntry or Academic Core.
 * Attendance assumptions and policy weights are EXACTLY those of the journal.
 */
export function simulateGrades(
  studentId: string, lessons: Lesson[], grades: GradeEntry[],
  attendance: AttendanceEntry[], policy: GradingPolicy,
  mark: MarkValue, category: GradeCategory, count: number,
): Forecast {
  const current = summarizeStudent(studentId, lessons, grades, attendance, policy)
  const weight = policy.categoryWeights[category] ?? 0
  const valid = lessons.length > 0 && permittedMark(mark, policy) &&
    markAsNumber(mark, policy) !== null &&
    Number.isFinite(weight) && weight > 0 &&
    Number.isInteger(count) && count >= 0 && count <= 30
  if (!valid) return {
    currentAverage: current.gradeAverage, currentScore: current.finalScore,
    currentMark: current.suggestedMark,
    projectedAverage: null, projectedScore: null, projectedMark: null, valid: false,
  }
  const hypothetical: GradeEntry[] = Array.from({ length: count }, (_,i) => ({
    id: '__scenario__' + i, studentId, lessonId: lessons[0].id,
    value: mark, category, source: 'manual' as const,
  }))
  const projected = summarizeStudent(
    studentId, lessons, [...grades, ...hypothetical], attendance, policy,
  )
  return {
    currentAverage: current.gradeAverage,
    currentScore: current.finalScore, currentMark: current.suggestedMark,
    projectedAverage: projected.gradeAverage,
    projectedScore: projected.finalScore, projectedMark: projected.suggestedMark,
    valid: true,
  }
}

/** Minimum number of hypothetical marks required for a requested suggested mark.
 * Returns null if not attainable within the requested finite horizon.
 */
export function minimumMarksForTarget(
  studentId: string, lessons: Lesson[], grades: GradeEntry[],
  attendance: AttendanceEntry[], policy: GradingPolicy,
  mark: MarkValue, category: GradeCategory, target: 4 | 5, maxCount = 30,
): number | null {
  const limit = Math.max(0, Math.min(30, Math.trunc(maxCount)))
  for (let count = 0; count <= limit; count++) {
    const result = simulateGrades(
      studentId, lessons, grades, attendance, policy, mark, category, count,
    )
    if (!result.valid) return null
    if (result.projectedMark !== null && result.projectedMark >= target) return count
  }
  return null
}

/** Transparent demo heuristics, not an official at-risk or admission decision. */
export function studentInsights(
  studentId: string, lessons: Lesson[], grades: GradeEntry[],
  attendance: AttendanceEntry[], policy: GradingPolicy,
): StudentInsight[] {
  const results: StudentInsight[] = []
  const completed = lessons.filter(l => l.completed)
  const completedIds = new Set(completed.map(l => l.id))
  const relevant = grades.filter(g => g.studentId === studentId && completedIds.has(g.lessonId))
  const attendanceForCompleted = attendance.filter(
    a => a.studentId === studentId && completedIds.has(a.lessonId),
  )
  const presentLessonIds = new Set(attendanceForCompleted.map(a => a.lessonId))
  const summary = summarizeStudent(studentId, completed, grades, attendance, policy)
  function push(
    code: StudentInsight['code'], severity: StudentInsight['severity'],
    label: string, explanation: string,
  ) {
    results.push({studentId,code,severity,label,explanation})
  }
  if (completed.length && summary.gradeCount < 3) push(
    'few-grades','medium','Мало оценок',
    'Учитываемых результатов: ' + summary.gradeCount + '. В демонстрационном правиле порог — 3.',
  )
  if (summary.gradeCount >= 2 && summary.gradeAverage !== null &&
      summary.gradeAverage < 3.5) push(
    'low-average','high','Низкий средний балл',
    'Средний по выполненным занятиям: ' + summary.gradeAverage.toFixed(2) + '. Порог подсказки — 3,50.',
  )
  const unmarked = completed.length - presentLessonIds.size
  if (unmarked > 0) push(
    'missing-attendance','medium','Не заполнена посещаемость',
    'Нет отметки за ' + unmarked + ' проведённых занятий. Будущие занятия не учитываются.',
  )
  const absences = attendanceForCompleted.filter(a => a.status === 'absent').length
  if (absences >= 2) push(
    'repeated-absence','medium','Повторяющиеся пропуски',
    'Неявок без отметки об уважительной причине: ' + absences + '. Проверьте обстоятельства.',
  )
  const nonpasses = relevant.filter(g => g.value === 'НЗ').length
  if (nonpasses > 0) push(
    'nonpass','high','Есть незачёт',
    'Отметок «НЗ» на проведённых занятиях: ' + nonpasses + '. Это не равно задолженности без проверки преподавателем.',
  )
  return results
}

export interface AttentionRow {
  student: Student
  signals: StudentInsight[]
}

export function groupAttention(
  students: Student[], lessons: Lesson[], grades: GradeEntry[],
  attendance: AttendanceEntry[], policy: GradingPolicy,
): AttentionRow[] {
  const order = { high: 0, medium: 1 }
  return students
    .map(student => ({
      student, signals: studentInsights(student.id,lessons,grades,attendance,policy)
        .sort((a,b)=>order[a.severity]-order[b.severity]),
    }))
    .filter(row => row.signals.length > 0)
    .sort((a,b) => {
      const sa = a.signals.some(x=>x.severity==='high') ? 0 : 1
      const sb = b.signals.some(x=>x.severity==='high') ? 0 : 1
      return sa - sb || a.student.name.localeCompare(b.student.name,'ru')
    })
}
