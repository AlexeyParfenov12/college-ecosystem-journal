import { describe, expect, it } from 'vitest'
import { applyBrush, attendanceOverrides, pickFeaturedLesson, undoBrush, uniqueTargets } from './brush'
import type { DemoState, Lesson } from './types'

const initial: DemoState = {
  grades: [
    { id:'lms',studentId:'s1',lessonId:'l1',value:'5',category:'lms',source:'lms-auto',sourceRef:'external-test' },
  ],
  attendance: [
    { studentId:'s1',lessonId:'l1',status:'absent' },
    { studentId:'s2',lessonId:'l2',status:'excused' },
  ],
  policies: {},
}
describe('Кисточка журнала', () => {
  it('one selected cell only, no duplicate selections', () => {
    expect(uniqueTargets([{studentId:'s1',lessonId:'l1'},{studentId:'s1',lessonId:'l1'}])).toHaveLength(1)
  })
  it('adds manual grades without overwriting LMS, multiple selected students', () => {
    let i=0
    const result=applyBrush(initial,[
      {studentId:'s1',lessonId:'l1'},{studentId:'s2',lessonId:'l1'},{studentId:'s1',lessonId:'l1'},
    ],{kind:'grade',value:'З',category:'practice'},()=> 'new-'+(++i))
    expect(result.addedGrades).toBe(2)
    expect(result.next.grades).toHaveLength(3)
    expect(result.next.grades[0].source).toBe('lms-auto')
    expect(result.next.grades.filter(g=>g.source==='manual').every(g=>g.value==='З')).toBe(true)
    expect(undoBrush(result.next,result.changes)).toEqual(initial)
  })
  it('explicit replacement of attendance, no accidental changes to other sessions', () => {
    const cells=[{studentId:'s1',lessonId:'l1'},{studentId:'s2',lessonId:'l1'}]
    expect(attendanceOverrides(initial.attendance,cells,'present')).toBe(1)
    const result=applyBrush(initial,cells,{kind:'attendance',status:'present'},()=> 'unused')
    expect(result.overwrittenAttendance).toBe(1)
    expect(result.changedAttendance).toBe(2)
    expect(result.next.attendance.find(a=>a.lessonId==='l2')?.status).toBe('excused')
    expect(undoBrush(result.next,result.changes)).toEqual(initial)
  })
  it('skips same attendance and avoids unnecessary history changes', () => {
    const result=applyBrush(initial,[{studentId:'s1',lessonId:'l1'}],{kind:'attendance',status:'absent'},()=> 'id')
    expect(result.skipped).toBe(1)
    expect(result.changes).toHaveLength(0)
  })
  it('undo preserves later edits made by other controls', () => {
    const result=applyBrush(initial,[{studentId:'s1',lessonId:'l1'}],{kind:'attendance',status:'present'},()=> 'id')
    const changed={...result.next,attendance:result.next.attendance.map(a=>a.studentId==='s1'&&a.lessonId==='l1'?{...a,status:'late' as const,lateMinutes:5}:a)}
    const reverted=undoBrush(changed,result.changes)
    expect(reverted.attendance.find(a=>a.studentId==='s1'&&a.lessonId==='l1')?.status).toBe('late')
  })
  it('selects a real demo lesson, not a fabricated live schedule', () => {
    const lessons: Lesson[]=['2026-11-03','2026-11-10'].map((date,i)=>({
      id:'l'+i,journalId:'j1',date,topic:'Демо тема',hours:2,type:'Лекция',completed:i===0,
    }))
    expect(pickFeaturedLesson(lessons,'2026-11-09')?.relation).toBe('upcoming')
    expect(pickFeaturedLesson(lessons,'2026-11-10')?.relation).toBe('today')
    expect(pickFeaturedLesson(lessons,'2026-11-30')?.relation).toBe('past')
    expect(pickFeaturedLesson([],'2026-11-10')).toBeNull()
  })
})
