import type { GradeEntry } from './types'

/** Remove only the most recently added manual mark for one student and lesson. */
export function removeLastManualGrade(
  grades: GradeEntry[], studentId: string, lessonId: string,
): { grades: GradeEntry[]; removed: GradeEntry | null } {
  for (let i=grades.length-1;i>=0;i--) {
    const grade=grades[i]
    if (grade.studentId===studentId && grade.lessonId===lessonId && grade.source==='manual') {
      return { grades: grades.filter((_,index)=>index!==i), removed:grade }
    }
  }
  return { grades, removed:null }
}
