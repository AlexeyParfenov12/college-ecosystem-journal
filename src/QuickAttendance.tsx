import { useState } from 'react'
import { CheckCircle2, ClipboardCheck, Pencil, RotateCcw, UsersRound, X } from 'lucide-react'
import type { AttendanceEntry, AttendanceStatus, GradeEntry, Lesson, Student } from './types'

const statuses: { value: AttendanceStatus; code: string; text: string }[] = [
  { value: 'absent', code: 'Н', text: 'Нет' },
  { value: 'late', code: 'ОП', text: 'Опоздал' },
  { value: 'excused', code: 'У', text: 'Уваж.' },
  { value: 'present', code: '✓', text: 'Есть' },
]
const dateLabel=(iso: string) => new Date(iso+'T12:00:00').toLocaleDateString('ru-RU',{day:'2-digit',month:'long'})

export interface QuickAttendanceProps {
  lesson: Lesson
  students: Student[]
  attendance: AttendanceEntry[]
  grades: GradeEntry[]
  lessonOptions?: Lesson[]
  onSelectLesson?: (lessonId:string)=>void
  onSet: (studentId: string, status: AttendanceStatus, minutes?: number)=>void
  onFill: ()=>void
  onUndo?: ()=>void
  canUndo?: boolean
  onEdit: (studentId: string)=>void
  onClose?: ()=>void
}
export function QuickAttendance({
  lesson, students, attendance, grades, lessonOptions, onSelectLesson, onSet,
  onFill, onUndo, canUndo, onEdit, onClose,
}: QuickAttendanceProps) {
  const [tool,setTool] = useState<AttendanceStatus>('absent')
  const [minutes,setMinutes] = useState(10)
  const byStudent = new Map(attendance.filter(a=>a.lessonId===lesson.id).map(a=>[a.studentId,a]))
  const marked = students.filter(s=>byStudent.has(s.id)).length
  const missing = students.length-marked
  const absent = students.filter(s=>byStudent.get(s.id)?.status==='absent').length
  const late = students.filter(s=>byStudent.get(s.id)?.status==='late').length

  return <div className="quick-attendance">
    <div className="rollcall-heading">
      <div><div className="eyebrow">БЫСТРАЯ ПЕРЕКЛИЧКА</div><h3>{dateLabel(lesson.date)} · {lesson.type}</h3><p>{lesson.topic}</p></div>
      {onClose && <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть перекличку"><X size={19}/></button>}
    </div>
    {lessonOptions && onSelectLesson && <label className="rollcall-date-control"><span>Занятие</span><select value={lesson.id} onChange={e=>onSelectLesson(e.target.value)}>{lessonOptions.map(l=><option value={l.id} key={l.id}>{dateLabel(l.date)} · {l.type}</option>)}</select></label>}
    <div className="rollcall-summary" aria-live="polite"><span><UsersRound size={15}/> {marked} из {students.length} отмечены</span><span>Н: {absent}</span><span>ОП: {late}</span></div>
    <div className="rollcall-progress" role="progressbar" aria-label="Заполненность посещаемости" aria-valuemin={0} aria-valuemax={students.length} aria-valuenow={marked}><span style={{width:students.length ? (marked/students.length*100)+'%' : '0%'}}/></div>
    <div className="rollcall-bulk">
      <button className="primary-button" onClick={onFill} disabled={!missing}><CheckCircle2 size={17}/>{missing ? 'Остальных отметить ✓ ('+missing+')' : 'Все отмечены'}</button>
      {canUndo && onUndo && <button className="outline-button" onClick={onUndo}><RotateCcw size={16}/> Отменить массовое</button>}
    </div>
    <p className="rollcall-safe"><ClipboardCheck size={14}/> Уже отмеченных студентов команда не изменяет.</p>
    <div className="rollcall-tool-heading"><strong>Касание студента ставит:</strong><span>Выберите отметку</span></div>
    <div className="rollcall-tools" role="group" aria-label="Отметка, которую ставим касанием">
      {statuses.map(s=><button key={s.value} type="button" className={tool===s.value?'active tool-'+tool:''} aria-pressed={tool===s.value} onClick={()=>setTool(s.value)}><strong>{s.code}</strong>{s.text}</button>)}
    </div>
    {tool==='late' && <label className="rollcall-minutes">Опоздание, минут <input type="number" min={1} max={120} inputMode="numeric" value={minutes} onChange={e=>setMinutes(Math.max(1,Math.min(120,Number(e.target.value)||1)))}/></label>}
    <div className="rollcall-student-list">
      {students.map((student,index)=>{
        const entry=byStudent.get(student.id)
        const count=grades.filter(g=>g.lessonId===lesson.id && g.studentId===student.id).length
        return <div className={'rollcall-student-row'+(entry?' marked':'')} key={student.id}>
          <button type="button" className="rollcall-person" onClick={()=>onSet(student.id,tool,minutes)} aria-label={'Отметить: '+student.name+', '+statuses.find(s=>s.value===tool)?.text}>
            <span className="rollcall-number">{index+1}</span>
            <span className="rollcall-student-name">{student.name}<small>{entry ? entry.status==='late'?'Опоздал на '+(entry.lateMinutes||10)+' мин': entry.status==='excused'?'Уважительная причина':entry.status==='absent'?'Отсутствует':'Присутствует':'Ещё не отмечен'}</small></span>
            <span className={'rollcall-state state-'+(entry?.status||'empty')}>{entry ? statuses.find(s=>s.value===entry.status)?.code : '·'}</span>
          </button>
          <button className="rollcall-grade-edit" onClick={()=>onEdit(student.id)} aria-label={'Открыть оценки: '+student.name}><Pencil size={15}/>{count ? count : '+'}</button>
        </div>
      })}
    </div>
    <p className="field-help">Изменения в этом демо сохраняются только в браузере. Официальный учёт будет подключён к Academic Core.</p>
  </div>
}
