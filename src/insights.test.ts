import { describe, expect, it } from 'vitest'
import { groupAttention, minimumMarksForTarget, simulateGrades, studentInsights } from './insights'
import { defaultPolicy } from './demo'
import { summarizeStudent } from './calculations'
import type { AttendanceEntry, GradeEntry, Lesson, Student } from './types'

const lessons: Lesson[] = [0,1,2].map(i=>({
  id:'l'+i,journalId:'j',date:'2026-11-0'+(i+1),
  topic:'Тема',hours:2,type:'Лекция',completed:i!==2,
}))
const grades: GradeEntry[] = [
  {id:'g1',studentId:'a',lessonId:'l0',value:'3',category:'classwork',source:'manual'},
  {id:'g2',studentId:'a',lessonId:'l1',value:'4',category:'control',source:'lms-auto'},
]
const attendance: AttendanceEntry[] = [
  {studentId:'a',lessonId:'l0',status:'present'},
  {studentId:'a',lessonId:'l1',status:'absent'},
]
const students: Student[] = [
  {id:'a',journalId:'j',name:'Иванов И.'},
  {id:'b',journalId:'j',name:'Петров П.'},
]
describe('Прогноз итогов',()=>{
  it('uses exactly the existing grade weights and attendance rules without mutating real data',()=>{
    const policy={...defaultPolicy,attendanceEnabled:true,attendanceWeight:20}
    const original=JSON.stringify(grades)
    const p=simulateGrades('a',lessons,grades,attendance,policy,'З','practice',2)
    const mockGrades: GradeEntry[]=[
      ...grades,
      {id:'test1',studentId:'a',lessonId:'l0',value:'З',category:'practice',source:'manual'},
      {id:'test2',studentId:'a',lessonId:'l0',value:'З',category:'practice',source:'manual'},
    ]
    const expected=summarizeStudent('a',lessons,mockGrades,attendance,policy)
    expect(p.valid).toBe(true)
    expect(p.projectedAverage).toBeCloseTo(expected.gradeAverage!)
    expect(p.projectedScore).toBeCloseTo(expected.finalScore!)
    expect(JSON.stringify(grades)).toBe(original)
  })
  it('returns null for unattainable target due to attendance weight',()=>{
    const policy={...defaultPolicy,attendanceEnabled:true,attendanceWeight:30}
    const a:AttendanceEntry[]=[
      {studentId:'a',lessonId:'l0',status:'absent'},
      {studentId:'a',lessonId:'l1',status:'absent'},
    ]
    expect(minimumMarksForTarget('a',lessons,grades,a,policy,'5','control',5,30)).toBeNull()
  })
  it('properly returns zero if already at target, and a positive count when achievable',()=>{
    const five: GradeEntry[]=[{id:'5',studentId:'a',lessonId:'l0',value:'5',category:'classwork',source:'manual'}]
    expect(minimumMarksForTarget('a',lessons,five,[],defaultPolicy,'5','classwork',5)).toBe(0)
    expect(minimumMarksForTarget('a',lessons,grades,[],defaultPolicy,'5','control',5)).toBeGreaterThan(0)
  })
  it('disabled categories, scales and zero weight cannot improve forecast',()=>{
    const p={...defaultPolicy,categoryWeights:{...defaultPolicy.categoryWeights,practice:0}}
    expect(simulateGrades('a',lessons,grades,attendance,p,'5','practice',2).valid).toBe(false)
    expect(simulateGrades('a',lessons,grades,attendance,{...defaultPolicy,passEnabled:false},'З','control',3).valid).toBe(false)
    expect(minimumMarksForTarget('a',lessons,grades,attendance,p,'5','practice',5)).toBeNull()
  })
  it('handles students with no grades and finite limits',()=>{
    expect(simulateGrades('b',lessons,grades,attendance,defaultPolicy,'5','control',0).projectedScore).toBeNull()
    expect(simulateGrades('b',lessons,grades,attendance,defaultPolicy,'5','control',1).projectedScore).toBe(5)
    expect(simulateGrades('b',lessons,grades,attendance,defaultPolicy,'5','control',50).valid).toBe(false)
  })
})
describe('Прозрачные подсказки',()=>{
  it('only considers completed lessons, absence and nonpasses on past lessons',()=>{
    const a=[...attendance,{studentId:'a',lessonId:'l2',status:'absent' as const}]
    const g=[...grades,{id:'future',studentId:'a',lessonId:'l2',value:'НЗ' as const,source:'manual' as const,category:'practice' as const}]
    const alerts=studentInsights('a',lessons,g,a,defaultPolicy)
    expect(alerts.some(x=>x.code==='nonpass')).toBe(false)
    expect(alerts.some(x=>x.code==='repeated-absence')).toBe(false)
    expect(alerts.some(x=>x.code==='few-grades')).toBe(true)
  })
  it('reports missing attendance without treating it as absence',()=>{
    const list=studentInsights('a',lessons,grades,[],defaultPolicy)
    expect(list.find(x=>x.code==='missing-attendance')?.explanation).toContain('2')
    expect(list.some(x=>x.code==='repeated-absence')).toBe(false)
  })
  it('does not turn nonpass into automatic debt; groups unique students',()=>{
    const g=[...grades,{id:'np',studentId:'a',lessonId:'l1',value:'НЗ' as const,source:'manual' as const,category:'practice' as const}]
    const rows=groupAttention(students,lessons,g,attendance,defaultPolicy)
    expect(rows.find(x=>x.student.id==='a')?.signals.some(x=>x.code==='nonpass')).toBe(true)
    expect(rows.filter(x=>x.student.id==='a')).toHaveLength(1)
  })
})
