import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Calculator, CheckCircle2, ClipboardList, Info, ShieldCheck, Target, UsersRound } from 'lucide-react'
import { categoryTitles } from './demo'
import { groupAttention, minimumMarksForTarget, simulateGrades, studentInsights } from './insights'
import { summarizeStudent } from './calculations'
import type { AttendanceEntry, GradeCategory, GradeEntry, GradingPolicy, Journal, Lesson, MarkValue, Student } from './types'

interface Props {
  journal: Journal
  students: Student[]
  lessons: Lesson[]
  grades: GradeEntry[]
  attendance: AttendanceEntry[]
  policy: GradingPolicy
  focusStudentId?: string
  onOpenStudent: (studentId: string) => void
}
const fmt=(n:number|null)=> n===null?'—':n.toFixed(2).replace('.',',')
const kinds: MarkValue[]=['2','3','4','5','З','НЗ']
const categories:GradeCategory[]=['classwork','practice','control','lms']

export function AnalyticsPanel({journal,students,lessons,grades,attendance,policy,focusStudentId,onOpenStudent}:Props) {
  const [studentId,setStudentId]=useState(focusStudentId??students[0]?.id??'')
  const [target,setTarget]=useState<4|5>(5)
  const [mark,setMark]=useState<MarkValue>('5')
  const [category,setCategory]=useState<GradeCategory>('control')
  const [count,setCount]=useState(2)
  const [filter,setFilter]=useState<'all'|'high'>('all')
  useEffect(()=>{
    if(focusStudentId && students.some(s=>s.id===focusStudentId))setStudentId(focusStudentId)
  },[focusStudentId,students])

  const attention=useMemo(()=>groupAttention(students,lessons,grades,attendance,policy),
    [students,lessons,grades,attendance,policy])
  const high=attention.filter(row=>row.signals.some(s=>s.severity==='high'))
  const shown=filter==='high'?high:attention
  const student=students.find(s=>s.id===studentId)??students[0]
  const studentGrades=student?grades.filter(g=>g.studentId===student.id):[]
  const summary=student?summarizeStudent(student.id,lessons,grades,attendance,policy):null
  const scenario=student?simulateGrades(student.id,lessons,grades,attendance,policy,mark,category,count):null
  const required=student?minimumMarksForTarget(student.id,lessons,grades,attendance,policy,mark,category,target):null
  const signals=student?studentInsights(student.id,lessons,grades,attendance,policy):[]
  const selectedMarkDisabled=(mark==='З'||mark==='НЗ')?!policy.passEnabled:!policy.numericEnabled
  const selectedWeight=policy.categoryWeights[category]
  const useful=students.length-attention.length

  return <div className="analytics-workspace">
    <section className="analytics-intro">
      <div>
        <div className="eyebrow">COLLEGE JOURNAL · АНАЛИТИКА</div>
        <h2>Прогноз оценок и внимание к группе</h2>
        <p>{journal.group} · {journal.subject}. Подсказки основаны только на заполненных данных и понятных демонстрационных правилах.</p>
      </div>
      <span><ShieldCheck size={17}/> Без автоматических решений об аттестации</span>
    </section>
    <div className="analytics-stats">
      <div><UsersRound size={19}/><span>В группе</span><strong>{students.length}</strong></div>
      <div><AlertTriangle size={19}/><span>Есть сигналы</span><strong>{attention.length}</strong></div>
      <div><Target size={19}/><span>Высокий приоритет</span><strong>{high.length}</strong></div>
      <div><CheckCircle2 size={19}/><span>Без сигналов</span><strong>{useful}</strong></div>
    </div>
    <div className="analytics-layout">
      <section className="content-card analytics-attention">
        <div className="card-header">
          <div><h2>Требует внимания</h2>
            <p>Подсказки, а не заключения об успеваемости.</p></div>
          <ClipboardList size={20} className="muted-icon"/>
        </div>
        <div className="analytics-tabs" role="group" aria-label="Фильтр по важности">
          <button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>Все сигналы ({attention.length})</button>
          <button className={filter==='high'?'active':''} onClick={()=>setFilter('high')}>Высокий приоритет ({high.length})</button>
        </div>
        <div className="analytics-attention-list">
          {shown.length===0 && <div className="analytics-no-alerts"><CheckCircle2 size={22}/> По этому фильтру сигналов нет.</div>}
          {shown.map(row=><button key={row.student.id}
            className={'analytics-attention-row'+(student?.id===row.student.id?' selected':'')}
            onClick={()=>setStudentId(row.student.id)}>
            <strong>{row.student.name}</strong>
            <div>{row.signals.slice(0,3).map(x=><span key={x.code}
              className={'attention-tag severity-'+x.severity}>{x.label}</span>)}
              {row.signals.length>3&&<span className="attention-tag">+{row.signals.length-3}</span>}
            </div>
            <ArrowRight size={16}/>
          </button>)}
        </div>
        <p className="field-help">«Мало оценок» означает меньше трёх учтённых результатов, «низкий средний» — ниже 3,50 при двух или более результатах. Это пример правил, не регламент колледжа.</p>
      </section>
      <section className="content-card analytics-forecast">
        <div className="card-header">
          <div><h2>Калькулятор предварительного итога</h2>
            <p>Проверка сценария без изменения оценок.</p></div>
          <Calculator size={21} className="muted-icon"/>
        </div>
        <label className="analytics-label" htmlFor="forecast-student">Студент
          <select id="forecast-student" value={student?.id??''} onChange={e=>setStudentId(e.target.value)}>
            {students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <div className="analytics-score-line">
          <div><span>Текущий средний</span><strong>{fmt(summary?.gradeAverage??null)}</strong></div>
          <div><span>Текущий расчёт</span><strong>{fmt(summary?.finalScore??null)}</strong></div>
          <div><span>Предложение</span><strong>{summary?.suggestedMark??'—'}</strong></div>
        </div>
        <div className="analytics-scenario">
          <div className="analytics-scenario-title">Если студент получит…</div>
          <div className="analytics-scenario-fields">
            <label>Оценка
              <select value={mark} onChange={e=>setMark(e.target.value as MarkValue)}>
                {kinds.map(m=><option key={m} value={m}
                  disabled={(m==='З'||m==='НЗ')?!policy.passEnabled:!policy.numericEnabled}>{m}</option>)}
              </select>
            </label>
            <label>Количество
              <input type="number" value={count} min={0} max={30}
                onChange={e=>setCount(Math.max(0,Math.min(30,Math.trunc(Number(e.target.value)||0))))}/>
            </label>
            <label>Вид работы
              <select value={category} onChange={e=>setCategory(e.target.value as GradeCategory)}>
                {categories.map(c=><option key={c} value={c}>{categoryTitles[c]}</option>)}
              </select>
            </label>
          </div>
          <div className="analytics-scenario-result" aria-live="polite">
            <div><span>Прогнозируемый расчёт</span><strong>{scenario?.valid?fmt(scenario.projectedScore):'—'}</strong></div>
            <div><span>Предварительная оценка</span><strong>{scenario?.valid?scenario.projectedMark??'—':'—'}</strong></div>
          </div>
          {(!scenario?.valid||selectedMarkDisabled||selectedWeight<=0)
            ? <p className="analytics-remark">Выбранная шкала или категория недоступна для расчёта. Проверьте настройки журнала.</p>
            : <p className="analytics-remark">Расчёт использует веса работ, З = 5 и НЗ = 2 (если разрешены), а также настройку учёта посещаемости. Новые оценки не сохраняются.</p>}
        </div>
        <div className="analytics-target">
          <label htmlFor="forecast-target">Сколько таких оценок нужно для предварительной
            <select id="forecast-target" value={target}
              onChange={e=>setTarget(Number(e.target.value) as 4|5)}>
              <option value={4}>«4»</option><option value={5}>«5»</option>
            </select>?
          </label>
          <div className="analytics-target-answer"><Target size={21}/>
            <strong>{required===null?'Не достигается в пределах 30 оценок':
              required===0?'Результат уже достигнут':
              required+' дополнительных '+(mark==='З'||mark==='НЗ'?'результатов':'оценок')+' «'+mark+'»'}</strong>
          </div>
          <p className="field-help">Это математический сценарий, не обещание итоговой отметки. Обязательные работы, сроки пересдач и решение об аттестации здесь не моделируются.</p>
        </div>
        <div className="analytics-student-alerts">
          <h3>Почему стоит обратить внимание</h3>
          {signals.length?signals.map(s=><div className="analytics-alert" key={s.code}>
            <span className={'attention-tag severity-'+s.severity}>{s.label}</span>
            <p>{s.explanation}</p>
          </div>):<p className="field-help">По демонстрационным правилам сигналов нет.</p>}
        </div>
        {student && <button className="outline-button analytics-open" onClick={()=>onOpenStudent(student.id)}>
          Открыть студента в журнале <ArrowRight size={16}/>
        </button>}
      </section>
    </div>
    <div className="analytics-disclaimer"><Info size={17}/>
      <span>В интерфейсе только демонстрационные данные. Нет AI-оценивания, настоящих учебных задолженностей, приказов, официальных заключений или подключённого LMS. Рассчитанные рекомендации не являются решением преподавателя.</span>
    </div>
    <p className="analytics-footnote">Учтено текущих результатов студента: {studentGrades.length}. Неучитываемые оценки могут отличаться от количества в среднем балле из-за персональных настроек.</p>
  </div>
}
