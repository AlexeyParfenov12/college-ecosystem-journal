import { describe, expect, it } from 'vitest'
import { markAsNumber, summarizeStudent, suggestedMark } from './calculations'
import { defaultPolicy } from './demo'
import type { GradeEntry, Lesson } from './types'

const lesson: Lesson = { id:'l1',journalId:'j1',date:'2026-11-01',topic:'Тест',type:'Лекция',hours:2,completed:true }
const grades: GradeEntry[] = [
  { id:'a',studentId:'s1',lessonId:'l1',value:'З',category:'classwork',source:'manual' },
  { id:'b',studentId:'s1',lessonId:'l1',value:'НЗ',category:'classwork',source:'manual' },
]
describe('Расчёт журнала', () => {
  it('переводит зачёт в 5, незачёт в 2 только при включённой шкале', () => {
    expect(markAsNumber('З',defaultPolicy)).toBe(5)
    expect(markAsNumber('НЗ',defaultPolicy)).toBe(2)
    expect(markAsNumber('НЗ',{...defaultPolicy,passEnabled:false})).toBeNull()
  })
  it('не смешивает посещаемость и оценку без разрешённого веса', () => {
    const summary=summarizeStudent('s1',[lesson],grades,[{studentId:'s1',lessonId:'l1',status:'absent'}],defaultPolicy)
    expect(summary.gradeAverage).toBe(3.5)
    expect(summary.finalScore).toBe(3.5)
    expect(summary.absences).toBe(1)
  })
  it('учитывает посещаемость по настройке', () => {
    const summary=summarizeStudent('s1',[lesson],grades,[{studentId:'s1',lessonId:'l1',status:'absent'}],{...defaultPolicy,attendanceEnabled:true,attendanceWeight:20})
    expect(summary.finalScore).toBeCloseTo(3.2)
  })
  it('исключает уважительную причину из знаменателя', () => {
    const summary=summarizeStudent('s1',[lesson],grades,[{studentId:'s1',lessonId:'l1',status:'excused'}],defaultPolicy)
    expect(summary.attendancePercent).toBeNull()
  })
  it('не выставляет итог без оценок', () => {
    expect(summarizeStudent('s1',[lesson],[],[],defaultPolicy).suggestedMark).toBeNull()
  })
  it('использует предустановленные пороги предварительной оценки', () => {
    expect(suggestedMark(4.5)).toBe(5)
    expect(suggestedMark(3.5)).toBe(4)
    expect(suggestedMark(2.5)).toBe(3)
    expect(suggestedMark(null)).toBeNull()
  })
})
