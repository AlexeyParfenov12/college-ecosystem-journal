import { describe, expect, it } from 'vitest'
import { removeLastManualGrade } from './gradeActions'
import type { GradeEntry } from './types'

const row: GradeEntry[] = [
  {id:'manual-1',studentId:'s1',lessonId:'l1',value:'4',category:'classwork',source:'manual'},
  {id:'system',studentId:'s1',lessonId:'l1',value:'5',category:'lms',source:'lms-auto'},
  {id:'other',studentId:'s2',lessonId:'l1',value:'2',category:'classwork',source:'manual'},
  {id:'manual-2',studentId:'s1',lessonId:'l1',value:'3',category:'practice',source:'manual'},
]
describe('Удаление оценки',()=>{
  it('удаляет только последнюю вручную добавленную оценку из указанной ячейки',()=>{
    const r=removeLastManualGrade(row,'s1','l1')
    expect(r.removed?.id).toBe('manual-2')
    expect(r.grades.map(g=>g.id)).toEqual(['manual-1','system','other'])
  })
  it('никогда не удаляет LMS-оценку или оценку другого студента',()=>{
    const r=removeLastManualGrade([row[1],row[2]],'s1','l1')
    expect(r.removed).toBeNull()
    expect(r.grades).toHaveLength(2)
  })
  it('пустая ячейка не меняет исходные данные',()=>{
    const r=removeLastManualGrade(row,'s3','l1')
    expect(r.removed).toBeNull()
    expect(r.grades).toBe(row)
  })
})
