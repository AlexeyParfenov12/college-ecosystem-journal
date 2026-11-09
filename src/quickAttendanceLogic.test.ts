import { describe, expect, it } from 'vitest'
import { fillMissingPresent } from './quickAttendanceLogic'
import type { AttendanceEntry, Student } from './types'

const students: Student[] = [
  { id: 'a', journalId: 'j', name: 'А' },
  { id: 'b', journalId: 'j', name: 'Б' },
  { id: 'c', journalId: 'j', name: 'В' },
]
describe('Быстрая перекличка', () => {
  it('отмечает только отсутствующие записи и не стирает пропуски, опоздания, уважительные причины', () => {
    const input: AttendanceEntry[] = [
      {studentId:'a',lessonId:'l1',status:'absent'},
      {studentId:'b',lessonId:'l1',status:'late',lateMinutes:15},
      {studentId:'c',lessonId:'l2',status:'excused'},
    ]
    const out=fillMissingPresent(input,students,'l1')
    expect(out.added).toBe(1)
    expect(out.attendance).toEqual([...input,{studentId:'c',lessonId:'l1',status:'present'}])
  })
  it('повторный запуск не добавляет дубли', () => {
    const first=fillMissingPresent([],students,'l1')
    const second=fillMissingPresent(first.attendance,students,'l1')
    expect(second.added).toBe(0)
    expect(second.attendance).toHaveLength(3)
  })
  it('не затрагивает записи другого занятия', () => {
    const other: AttendanceEntry={studentId:'a',lessonId:'l2',status:'absent'}
    const out=fillMissingPresent([other],students,'l1')
    expect(out.attendance[0]).toEqual(other)
    expect(out.attendance.filter(x=>x.lessonId==='l1')).toHaveLength(3)
  })
})
