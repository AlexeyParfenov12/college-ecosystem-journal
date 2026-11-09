import { CalendarClock, ClipboardCheck, FileCheck2, Paintbrush, UsersRound } from 'lucide-react'
import type { AttendanceEntry, GradeEntry, Journal, Lesson, Student } from './types'

interface Props {
  featured: {lesson: Lesson;relation:'today'|'upcoming'|'past'} | null
  journal: Journal
  students: Student[]
  attendance: AttendanceEntry[]
  grades: GradeEntry[]
  onRollcall: () => void
  onBrush: () => void
  onView: () => void
}
const prettyDate = (iso: string) =>
  new Date(iso+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'})

export function FeaturedLesson({featured,journal,students,attendance,grades,onRollcall,onBrush,onView}:Props) {
  if(!featured)return null
  const {lesson,relation}=featured
  const entries=attendance.filter(a=>a.lessonId===lesson.id && students.some(s=>s.id===a.studentId))
  const lmsCount=grades.filter(g=>g.lessonId===lesson.id && g.source!=='manual').length
  const title=relation==='today'?'Сегодня по демо-расписанию':
    relation==='upcoming'?'Ближайшая пара в демо-расписании':'Последняя пара в демо-расписании'
  return <section className="featured-lesson">
    <div className="featured-top">
      <div className="featured-overline"><CalendarClock size={17}/>{title}</div>
      <span className="featured-demo-label">Не подключено к настоящему расписанию</span>
    </div>
    <div className="featured-content">
      <div className="featured-main">
        <div className="featured-date">{prettyDate(lesson.date)} · {lesson.type}</div>
        <h2>{lesson.topic}</h2>
        <p>Группа {journal.group} · {journal.subject} · {lesson.hours} академ. ч.</p>
      </div>
      <div className="featured-metrics">
        <div><UsersRound size={18}/><strong>{students.length}</strong><span>В группе</span></div>
        <div><ClipboardCheck size={18}/><strong>{entries.length} / {students.length}</strong><span>Отмечены</span></div>
        <div><FileCheck2 size={18}/><strong>{lmsCount}</strong><span>Оценок LMS</span></div>
      </div>
    </div>
    <div className="featured-actions">
      <button className="primary-button" onClick={onRollcall}><UsersRound size={17}/> Открыть перекличку</button>
      <button className="outline-button" onClick={onBrush}><Paintbrush size={17}/> Кисточка</button>
      <button className="featured-link" onClick={onView}>Открыть занятие в журнале</button>
    </div>
  </section>
}
