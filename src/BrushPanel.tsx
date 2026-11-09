import { useEffect, useState } from 'react'
import { CheckCheck, Eraser, Eye, Paintbrush, RotateCcw, X } from 'lucide-react'
import { attendanceOverrides, brushKey } from './brush'
import type { BrushTarget, BrushTool } from './brush'
import type { AttendanceEntry, AttendanceStatus, GradeCategory, GradingPolicy, Lesson, MarkValue, Student } from './types'
import { categoryTitles } from './demo'

const statusNames: Record<AttendanceStatus, string> = {
  present: 'Присутствует', absent: 'Неявка', excused: 'Уважительная причина', late: 'Опоздание',
}
const attendanceOptions: { status: AttendanceStatus; label: string; glyph: string }[] = [
  { status:'absent',label:'Неявка',glyph:'Н' },
  { status:'present',label:'Присутствие',glyph:'✓' },
  { status:'excused',label:'Уваж.',glyph:'У' },
  { status:'late',label:'Опоздание',glyph:'ОП' },
]
const markOptions: MarkValue[] = ['2','3','4','5','З','НЗ']

interface Props {
  tool: BrushTool
  onToolChange: (tool: BrushTool) => void
  cells: BrushTarget[]
  students: Student[]
  lessons: Lesson[]
  attendance: AttendanceEntry[]
  policy: GradingPolicy
  currentLessonId: string
  onCurrentLesson: (lessonId: string) => void
  onSelectAll: () => void
  onClear: () => void
  onApply: () => void
  onUndo: () => void
  canUndo: boolean
  onClose: () => void
}

export function BrushPanel({
  tool, onToolChange, cells, students, lessons, attendance, policy, currentLessonId,
  onCurrentLesson, onSelectAll, onClear, onApply, onUndo, canUndo, onClose,
}: Props) {
  const [review, setReview] = useState(false)
  useEffect(() => setReview(false), [cells, tool])
  const studentById = new Map(students.map(s => [s.id,s.name]))
  const lessonById = new Map(lessons.map(l => [l.id,l.date.slice(8)+'.'+l.date.slice(5,7)]))
  const presentOverrides = tool.kind==='attendance'
    ? attendanceOverrides(attendance,cells,tool.status,tool.lateMinutes ?? 10):0
  const disabled = tool.kind==='grade' &&
    ((tool.value==='З'||tool.value==='НЗ') ? !policy.passEnabled : !policy.numericEnabled)

  function changeTool(t: BrushTool) { onToolChange(t) }
  return <section className="brush-panel" aria-label="Кисточка для группового ввода">
    <div className="brush-panel-head">
      <div className="brush-title"><span className="brush-symbol"><Paintbrush size={19}/></span>
        <div><strong>Кисточка · групповой ввод</strong><small>Выбирайте ячейки в таблице. Изменения применяются только после проверки.</small></div>
      </div>
      <button className="icon-button" onClick={onClose} aria-label="Закрыть кисточку"><X size={19}/></button>
    </div>
    <div className="brush-mode-selector" role="group" aria-label="Тип кисточки">
      <button className={tool.kind==='attendance'?'selected':''}
        onClick={()=>changeTool({kind:'attendance',status:'absent'})}>Посещаемость</button>
      <button className={tool.kind==='grade'?'selected':''}
        onClick={()=>changeTool({kind:'grade',value:'5',category:'classwork'})}>Оценки</button>
    </div>
    <div className="brush-tool-row">
      {tool.kind==='attendance' ? <>
        <div className="brush-options" role="group" aria-label="Отметка посещаемости">
          {attendanceOptions.map(v=><button key={v.status}
            className={tool.status===v.status?'active':''}
            aria-pressed={tool.status===v.status}
            onClick={()=>changeTool({...tool,status:v.status})}>
            <strong>{v.glyph}</strong><span>{v.label}</span>
          </button>)}
        </div>
        {tool.status==='late' && <label className="brush-late">Минут
          <input type="number" min={1} max={120} value={tool.lateMinutes ?? 10}
            onChange={e=>changeTool({...tool,lateMinutes:Math.min(120,Math.max(1,Number(e.target.value)||10))})}/>
        </label>}
      </> : <>
        <div className="brush-options" role="group" aria-label="Быстрые оценки">
          {markOptions.map(value=><button key={value} className={tool.value===value?'active':''}
            disabled={value==='З'||value==='НЗ'?!policy.passEnabled:!policy.numericEnabled}
            aria-pressed={tool.value===value}
            onClick={()=>changeTool({...tool,value})}><strong>{value}</strong></button>)}
        </div>
        <label className="brush-category">Вид работы
          <select value={tool.category} onChange={e=>changeTool({...tool,category:e.target.value as GradeCategory})}>
            {(Object.keys(categoryTitles) as GradeCategory[]).map(v=>
              <option key={v} value={v}>{categoryTitles[v]}</option>)}
          </select>
        </label>
      </>}
    </div>
    <div className="brush-selection-row">
      <label>Дата для выбора всех
        <select value={currentLessonId} onChange={e=>onCurrentLesson(e.target.value)}>
          {lessons.map(l=><option key={l.id} value={l.id}>
            {l.date.slice(8)+'.'+l.date.slice(5,7)} · {l.type}</option>)}
        </select>
      </label>
      <button className="outline-button" onClick={onSelectAll}><CheckCheck size={16}/> Выделить группу</button>
      <button className="brush-clear" onClick={onClear} disabled={!cells.length}><Eraser size={15}/> Снять выделение</button>
    </div>
    <div className="brush-bottom">
      <div className="brush-count"><strong>{cells.length}</strong><span>ячеек выделено</span>
        {presentOverrides>0 && <em>{presentOverrides} существующих отметок изменится</em>}
      </div>
      <div className="brush-actions">
        {canUndo && <button className="outline-button" onClick={onUndo}><RotateCcw size={16}/> Отменить операцию</button>}
        <button className="primary-button" disabled={!cells.length || disabled} onClick={()=>setReview(true)}>
          <Eye size={16}/> Предпросмотр изменений
        </button>
      </div>
    </div>
    {review && <div className="brush-review" role="group" aria-label="Подтверждение массового ввода">
      <div className="brush-review-head">
        <strong>Проверьте перед применением</strong>
        <button className="icon-button" onClick={()=>setReview(false)} aria-label="Закрыть предпросмотр"><X size={16}/></button>
      </div>
      <p>Будет обработано {cells.length} ячеек. {tool.kind==='grade'
        ? 'К каждой ячейке добавится ручная оценка '+tool.value+'. Результаты LMS сохранятся.'
        : 'Отметка «'+statusNames[tool.status]+'» заменит прежнюю посещаемость выбранных ячеек, если она отличается.'}</p>
      <div className="brush-preview-list">
        {cells.map(cell=>{
          const before=attendance.find(a=>brushKey(a)===brushKey(cell))
          return <div key={brushKey(cell)}>
            <span>{studentById.get(cell.studentId) ?? cell.studentId}</span>
            <small>{lessonById.get(cell.lessonId) ?? cell.lessonId}</small>
            <strong>{tool.kind==='grade' ? '+ '+tool.value :
              (before ? statusNames[before.status]+' → ' : 'Не отмечен → ')+statusNames[tool.status]}</strong>
          </div>
        })}
      </div>
      <div className="brush-review-actions">
        <button className="outline-button" onClick={()=>setReview(false)}>Назад к выделению</button>
        <button className="primary-button" onClick={()=>{onApply();setReview(false)}}>
          <CheckCheck size={17}/> Применить {cells.length} ячеек
        </button>
      </div>
    </div>}
    <p className="brush-explain">Клик или касание по ячейке выделяет её. На компьютере можно вести мышью с зажатой левой кнопкой. Результат сохраняется локально в демо после подтверждения.</p>
  </section>
}
