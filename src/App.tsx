import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertCircle, ArrowDownToLine, BookOpenCheck, BookText, CalendarDays,
  Check, CheckCircle2, ChevronDown, ClipboardList, CloudDownload, FileSpreadsheet,
  GraduationCap, Info, LayoutDashboard, MonitorCheck, Pencil, Plus, Printer,
  RotateCcw, Search, Settings2, ShieldCheck, SlidersHorizontal, Trash2, X,
} from 'lucide-react'
import { categoryTitles, createDemoState, defaultPolicy, journals, lessons, students } from './demo'
import { summarizeStudent } from './calculations'
import { clearDemoState, loadDemoState, saveDemoState } from './storage'
import type {
  AttendanceStatus, DemoState, GradeCategory, GradeEntry, GradingPolicy, JournalView,
  MarkValue, ReportKind, Section,
} from './types'

type SelectedCell = { studentId: string; lessonId: string }
const marks: MarkValue[] = ['2', '3', '4', '5', 'З', 'НЗ']
const menu: { id: Section; title: string; subtitle: string; icon: ReactNode }[] = [
  { id: 'journal', title: 'Журнал', subtitle: 'Оценки и посещаемость', icon: <BookOpenCheck size={18} /> },
  { id: 'plan', title: 'Программа и КТП', subtitle: 'Темы и учебные часы', icon: <BookText size={18} /> },
  { id: 'attestation', title: 'Аттестация', subtitle: 'Предварительные итоги', icon: <GraduationCap size={18} /> },
  { id: 'reports', title: 'Ведомости и экспорт', subtitle: 'CSV, печать, PDF', icon: <FileSpreadsheet size={18} /> },
  { id: 'settings', title: 'Настройки журнала', subtitle: 'Конструктор оценивания', icon: <Settings2 size={18} /> },
]
const sourceInfo: Record<GradeEntry['source'], { label: string; icon: ReactNode }> = {
  manual: { label: 'Выставлено преподавателем в журнале', icon: <Pencil size={12} /> },
  'lms-auto': { label: 'Автоматически проверено в LMS (демо)', icon: <MonitorCheck size={12} /> },
  'lms-reviewed': { label: 'Проверено преподавателем через LMS (демо)', icon: <CheckCircle2 size={12} /> },
}
const attendanceInfo: Record<AttendanceStatus, { short: string; label: string }> = {
  present: { short: '✓', label: 'Присутствовал' },
  absent: { short: 'Н', label: 'Отсутствовал' },
  excused: { short: 'У', label: 'Уважительная причина' },
  late: { short: 'ОП', label: 'Опоздал' },
}
const reportTitles: Record<ReportKind, string> = {
  full: 'Полный журнал', grades: 'Ведомость текущей успеваемости',
  attendance: 'Отчёт по посещаемости', attestation: 'Предварительная аттестационная ведомость',
  plan: 'Выполнение учебной программы',
}
const two = (n: number) => n.toFixed(2).replace('.', ',')
const formatDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
const csvCell = (v: string) => {
  const safe = /^[=+\-@\t\r]/.test(v) ? "'" + v : v
  return '"' + safe.replaceAll('"', '""') + '"'
}
const escapeFileName = (s: string) => s.replace(/[^a-zA-Z0-9а-яА-Я_-]+/g, '_')

function IconChip({ source }: { source: GradeEntry['source'] }) {
  return <span className={'source-icon source-' + source} title={sourceInfo[source].label} aria-label={sourceInfo[source].label}>{sourceInfo[source].icon}</span>
}

function App() {
  const [data, setData] = useState<DemoState>(() => loadDemoState())
  const [journalId, setJournalId] = useState(journals[0].id)
  const [section, setSection] = useState<Section>('journal')
  const [period, setPeriod] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<SelectedCell | null>(null)
  const [draftMark, setDraftMark] = useState<MarkValue>('5')
  const [draftCategory, setDraftCategory] = useState<GradeCategory>('classwork')
  const [draftNote, setDraftNote] = useState('')
  const [lateMinutes, setLateMinutes] = useState(10)
  const [reportKind, setReportKind] = useState<ReportKind>('full')
  const [notice, setNotice] = useState('')

  useEffect(() => { saveDemoState(data) }, [data])

  const journal = journals.find(j => j.id === journalId) ?? journals[0]
  const policy = data.policies[journalId] ?? defaultPolicy
  const groupStudents = useMemo(() => students.filter(s => s.journalId === journalId), [journalId])
  const visibleStudents = groupStudents.filter(s => s.name.toLowerCase().includes(search.trim().toLowerCase()))
  const journalLessons = useMemo(() => lessons.filter(l => l.journalId === journalId), [journalId])
  const visibleLessons = journalLessons.filter(l => period === 'all' || l.date.slice(0, 7) === period)
  const completedHours = journalLessons.filter(l => l.completed).reduce((sum, l) => sum + l.hours, 0)
  const allSummaries = useMemo(() => Object.fromEntries(groupStudents.map(s => [
    s.id, summarizeStudent(s.id, journalLessons, data.grades, data.attendance, policy),
  ])), [groupStudents, journalLessons, data.grades, data.attendance, policy])
  const attentionCount = groupStudents.filter(s => allSummaries[s.id].gradeCount < 3).length
  const getGrades = (studentId: string, lessonId: string) =>
    data.grades.filter(g => g.studentId === studentId && g.lessonId === lessonId)
  const getAttendance = (studentId: string, lessonId: string) =>
    data.attendance.find(a => a.studentId === studentId && a.lessonId === lessonId)
  const activeStudent = selected ? groupStudents.find(s => s.id === selected.studentId) : undefined
  const activeLesson = selected ? journalLessons.find(l => l.id === selected.lessonId) : undefined

  function updatePolicy(patch: Partial<GradingPolicy>) {
    setData(old => ({
      ...old, policies: { ...old.policies, [journalId]: { ...old.policies[journalId], ...patch } },
    }))
  }
  function updateCategoryWeight(category: GradeCategory, weight: number) {
    updatePolicy({ categoryWeights: { ...policy.categoryWeights, [category]: weight } })
  }
  function setAttendance(studentId: string, lessonId: string, status: AttendanceStatus) {
    setData(old => ({
      ...old,
      attendance: [
        ...old.attendance.filter(a => !(a.studentId === studentId && a.lessonId === lessonId)),
        { studentId, lessonId, status, ...(status === 'late' ? { lateMinutes: Math.max(1, lateMinutes) } : {}) },
      ],
    }))
    setNotice('Отметка посещаемости сохранена в демонстрации.')
  }
  function addGrade() {
    if (!selected) return
    if ((draftMark === 'З' || draftMark === 'НЗ') ? !policy.passEnabled : !policy.numericEnabled) {
      setNotice('Этот тип оценки отключён в настройках журнала.')
      return
    }
    const entry: GradeEntry = {
      id: 'manual-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      studentId: selected.studentId, lessonId: selected.lessonId,
      value: draftMark, category: draftCategory, source: 'manual', note: draftNote.trim() || undefined,
    }
    setData(old => ({ ...old, grades: [...old.grades, entry] }))
    setDraftNote('')
    setNotice('Оценка добавлена. Данные сохранены только в этом браузере.')
  }
  function removeGrade(id: string) {
    setData(old => ({ ...old, grades: old.grades.filter(g => g.id !== id) }))
    setNotice('Демонстрационная оценка удалена.')
  }
  function importLms() {
    const destinationLesson = journalLessons.find(l => l.completed && l.date === '2026-11-05')
      ?? journalLessons.find(l => l.completed)
    if (!destinationLesson) return
    let added = 0
    setData(old => {
      const known = new Set(old.grades.map(g => g.sourceRef).filter(Boolean))
      const incoming: GradeEntry[] = []
      groupStudents.slice(0, 6).forEach((student, i) => {
        const ref = 'lms-sync-demo:' + student.id + ':' + destinationLesson.id
        if (known.has(ref)) return
        incoming.push({
          id: 'import-' + student.id + '-' + destinationLesson.id,
          studentId: student.id, lessonId: destinationLesson.id, value: i % 3 === 0 ? 'З' : i % 2 === 0 ? '5' : '4',
          category: 'lms', source: i % 2 === 0 ? 'lms-auto' : 'lms-reviewed', sourceRef: ref,
          note: 'Демонстрационная синхронизация LMS',
        })
      })
      added = incoming.length
      return incoming.length ? { ...old, grades: [...old.grades, ...incoming] } : old
    })
    setNotice(added ? 'Импортировано ' + added + ' демонстрационных результатов из LMS.' : 'Повторная синхронизация: новых результатов нет.')
  }
  function resetDemo() {
    if (!window.confirm('Сбросить все демонстрационные изменения и настройки этого браузера?')) return
    clearDemoState()
    setData(createDemoState())
    setSelected(null)
    setNotice('Демонстрационные данные восстановлены.')
  }
  function rowsForReport(): { headers: string[]; rows: string[][] } {
    if (reportKind === 'plan') return {
      headers: ['Дата', 'Тема', 'Вид занятия', 'Часы', 'Состояние'],
      rows: journalLessons.map(l => [formatDate(l.date), l.topic, l.type, String(l.hours), l.completed ? 'Проведено (демо)' : 'Запланировано']),
    }
    if (reportKind === 'attestation') return {
      headers: ['Студент', 'Средний балл', 'Посещаемость, %', 'Рекомендуемый итог', 'Статус'],
      rows: groupStudents.map(s => {
        const x = allSummaries[s.id]
        return [s.name, x.gradeAverage === null ? '—' : two(x.gradeAverage), x.attendancePercent === null ? '—' : String(Math.round(x.attendancePercent)), x.suggestedMark === null ? '—' : String(x.suggestedMark), 'Не утверждено']
      }),
    }
    if (reportKind === 'attendance') return {
      headers: ['Студент', 'Пропуски', 'Опоздания', 'Посещаемость, %'],
      rows: groupStudents.map(s => {
        const x = allSummaries[s.id]
        return [s.name, String(x.absences), String(x.lateness), x.attendancePercent === null ? '—' : String(Math.round(x.attendancePercent))]
      }),
    }
    if (reportKind === 'grades') return {
      headers: ['Студент', 'Оценки', 'Средний балл', 'Рекомендуемый итог'],
      rows: groupStudents.map(s => {
        const x = allSummaries[s.id]
        return [s.name, data.grades.filter(g => g.studentId === s.id && journalLessons.some(l => l.id === g.lessonId)).map(g => g.value).join(', '), x.gradeAverage === null ? '—' : two(x.gradeAverage), x.suggestedMark === null ? '—' : String(x.suggestedMark)]
      }),
    }
    return {
      headers: ['Студент', ...journalLessons.map(l => formatDate(l.date)), 'Средний', 'Итог*'],
      rows: groupStudents.map(s => {
        const x = allSummaries[s.id]
        return [s.name, ...journalLessons.map(l => {
          const a = getAttendance(s.id, l.id)
          const g = getGrades(s.id, l.id)
          return (a ? attendanceInfo[a.status].short : '—') + ' / ' + (g.length ? g.map(v => v.value).join(', ') : '—')
        }), x.gradeAverage === null ? '—' : two(x.gradeAverage), x.suggestedMark === null ? '—' : String(x.suggestedMark)]
      }),
    }
  }
  const reportData = rowsForReport()
  function downloadCsv() {
    const rows = [reportData.headers, ...reportData.rows]
    const csv = '\uFEFF' + rows.map(row => row.map(cell => csvCell(String(cell))).join(';')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = escapeFileName(journal.group + '_' + reportKind) + '.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice('Скачана CSV-таблица для Excel. Это не официальная ведомость.')
  }
  function changeJournal(id: string) {
    setJournalId(id)
    setSelected(null)
    setSearch('')
    setNotice('')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-symbol"><BookOpenCheck size={24} /></div>
          <div><div className="brand-name">College <strong>Ecosystem</strong></div><div className="brand-caption">Цифровая среда колледжа</div></div>
        </div>
        <div className="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <div className="nav-list">
          {menu.map(item => <button key={item.id} className={'nav-item ' + (section === item.id ? 'active' : '')} onClick={() => { setSection(item.id); setSelected(null) }}>
            <span className="nav-icon">{item.icon}</span><span className="nav-body"><strong>{item.title}</strong><small>{item.subtitle}</small></span>
            {section === item.id && <span className="nav-accent" />}
          </button>)}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-badge"><ShieldCheck size={16}/><span>Самостоятельный демо-модуль</span></div>
          <p>Для интеграции с Academic Core и College Space. Без реальной авторизации и базы данных.</p>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>College Ecosystem</span><span className="breadcrumb-separator">/</span><strong>Электронный журнал</strong></div>
          <div className="topbar-actions"><span className="year-pill"><CalendarDays size={15}/> 2026/2027</span><span className="demo-pill">Демо-стенд</span><div className="avatar" title="Демонстрационный преподаватель">П</div></div>
        </header>
        <main className="content">
          <div className="page-heading">
            <div><div className="eyebrow">COLLEGE JOURNAL · СПО</div><h1>Электронный журнал</h1><p>Оценки, посещаемость, учебная программа и аттестации — в одном пространстве.</p></div>
            <button className="ghost-button" onClick={resetDemo}><RotateCcw size={15}/> Сбросить демо</button>
          </div>
          <div className="demo-banner"><Info size={18}/><span><strong>Демонстрационная версия.</strong> Только вымышленные студенты. Изменения сохраняются локально в этом браузере. Нет подключения к серверу и официальным ведомостям.</span></div>
          {notice && <div className="notice" role="status"><CheckCircle2 size={16}/><span>{notice}</span><button title="Закрыть сообщение" onClick={() => setNotice('')}><X size={16}/></button></div>}
          <section className="journal-selector">
            <div className="select-wrap"><label htmlFor="journal-select">Учебный журнал</label><div className="select-shell"><select id="journal-select" value={journalId} onChange={e => changeJournal(e.target.value)}>{journals.map(j => <option key={j.id} value={j.id}>{j.group} · {j.subject}</option>)}</select><ChevronDown size={16}/></div></div>
            <div className="selected-meta"><span>Группа <strong>{journal.group}</strong></span><span>Курс <strong>{journal.course}</strong></span><span><strong>{journal.semester}</strong></span><span>Преподаватель: <strong>{journal.teacher}</strong></span></div>
          </section>
          <section className="kpi-grid">
            <div className="kpi"><span className="kpi-icon green"><ClipboardList size={18}/></span><div><span>Проведено часов</span><strong>{completedHours} <em>/ {journal.plannedHours}</em></strong><div className="micro-progress"><i style={{width: Math.min(100, completedHours / journal.plannedHours * 100) + '%'}}/></div></div></div>
            <div className="kpi"><span className="kpi-icon aqua"><CalendarDays size={18}/></span><div><span>Учебных занятий</span><strong>{journalLessons.filter(l => l.completed).length} <em>/ {journalLessons.length}</em></strong><small>В демонстрационном расписании</small></div></div>
            <div className="kpi"><span className="kpi-icon blue"><GraduationCap size={18}/></span><div><span>Обучающихся</span><strong>{groupStudents.length}</strong><small>Вымышленный состав группы</small></div></div>
            <div className="kpi"><span className="kpi-icon amber"><AlertCircle size={18}/></span><div><span>Мало оценок</span><strong>{attentionCount}</strong><small>Менее трёх учтённых оценок</small></div></div>
          </section>

          {section === 'journal' && <>
            <div className="content-card">
              <div className="card-header">
                <div><h2>Журнал группы <span>{journal.group}</span></h2><p>Единая таблица оценок и посещаемости. Нажмите на ячейку для ввода данных.</p></div>
                <button className="outline-button" onClick={importLms}><CloudDownload size={16}/> Демо-импорт из LMS</button>
              </div>
              <div className="toolbar">
                <div className="filter-inline">
                  <label htmlFor="month-filter">Период</label>
                  <select id="month-filter" value={period} onChange={e => setPeriod(e.target.value)}><option value="all">Все занятия</option><option value="2026-10">Октябрь 2026</option><option value="2026-11">Ноябрь 2026</option></select>
                </div>
                <label className="search-box"><Search size={16}/><input aria-label="Поиск студента" value={search} onChange={e => setSearch(e.target.value)} placeholder="Найти студента..." /></label>
                <div className="segmented" role="group" aria-label="Режим таблицы">
                  {([{value:'combined',label:'Всё вместе'},{value:'grades',label:'Оценки'},{value:'attendance',label:'Посещаемость'}] as {value:JournalView,label:string}[]).map(v =>
                    <button key={v.value} className={policy.personalView === v.value ? 'selected' : ''} onClick={() => updatePolicy({personalView:v.value})}>{v.label}</button>)}
                </div>
              </div>
              <div className="table-scroll" tabIndex={0} aria-label="Таблица журнала, прокручивается горизонтально">
                <table className="journal-table">
                  <thead><tr><th className="fixed-name">Фамилия и имя</th>{visibleLessons.map(l => <th key={l.id} className={'lesson-column ' + (l.completed ? '' : 'future')} title={l.topic}><div className="lesson-date">{formatDate(l.date)}</div><div className="lesson-type">{l.type === 'Практика' ? 'ПР' : l.type === 'Лабораторная' ? 'ЛР' : l.type === 'Контрольная' ? 'КР' : 'ЛК'}</div></th>)}<th className="summary-column">Ср. балл</th><th className="summary-column">Итог*</th></tr></thead>
                  <tbody>
                    {visibleStudents.map((student, index) => {
                      const summary = allSummaries[student.id]
                      return <tr key={student.id}><th className="fixed-name row-name"><span className="student-number">{String(index + 1).padStart(2,'0')}</span>{student.name}</th>
                        {visibleLessons.map(l => {
                          const cellGrades=getGrades(student.id,l.id)
                          const attendance=getAttendance(student.id,l.id)
                          return <td key={l.id} className="grid-cell"><button className={'cell-button ' + (selected?.studentId===student.id && selected?.lessonId===l.id?'cell-active':'')} onClick={() => setSelected({studentId:student.id,lessonId:l.id})} aria-label={'Изменить данные ' + student.name + ' за ' + formatDate(l.date)}>
                            {policy.personalView !== 'grades' && <span className={'attendance-mini ' + (attendance ? 'att-' + attendance.status : 'att-empty')} title={attendance ? attendanceInfo[attendance.status].label + (attendance.lateMinutes ? ' ' + attendance.lateMinutes + ' мин' : '') : 'Не отмечено'}>{attendance ? attendanceInfo[attendance.status].short : '·'}</span>}
                            {policy.personalView !== 'attendance' && <span className="cell-marks">{cellGrades.length ? cellGrades.map(g => <span key={g.id} className={'mark-badge mark-' + g.source} title={sourceInfo[g.source].label + ' · ' + categoryTitles[g.category]}>{g.value}</span>) : <span className="empty-mark">—</span>}</span>}
                          </button></td>
                        })}
                        <td className="summary-cell">{summary.gradeAverage === null ? '—' : two(summary.gradeAverage)}</td><td className="summary-cell"><span className={'result-pill ' + (summary.suggestedMark===2?'result-risk':'')}>{summary.suggestedMark ?? '—'}</span></td>
                      </tr>
                    })}
                  </tbody>
                </table>
                {!visibleStudents.length && <p className="empty-state">По вашему запросу студенты не найдены.</p>}
              </div>
              <div className="table-foot">
                <div className="legend"><span><i className="legend-dot manual"/>Ручная</span><span><i className="legend-dot auto"/>Автопроверка LMS</span><span><i className="legend-dot reviewed"/>Проверено в LMS</span><span className="legend-att">Н — отсутствие · У — уважительная причина · ОП — опоздание</span></div>
                <span>* Предварительный расчёт, не аттестация</span>
              </div>
            </div>
            <div className="bottom-hint"><SlidersHorizontal size={18}/><span>Нужно изменить правила выставления итогов? Настройте шкалы, веса работ и посещаемость.</span><button onClick={() => setSection('settings')}>Настроить журнал</button></div>
          </>}

          {section === 'plan' && <section className="content-card">
            <div className="card-header"><div><h2>Календарно-тематический план</h2><p>Темы и факт проведения. Данные демонстрационные, здесь нет редактирования реального КТП.</p></div><span className="quiet-tag">{completedHours} / {journal.plannedHours} ч</span></div>
            <div className="progress-line"><span style={{width:Math.min(100,100*completedHours/journal.plannedHours)+'%'}} /></div>
            <div className="responsive-table"><table className="simple-table"><thead><tr><th>Дата</th><th>Тема занятия</th><th>Вид</th><th>Часы</th><th>Состояние</th></tr></thead><tbody>{journalLessons.map(l=><tr key={l.id}><td>{formatDate(l.date)}</td><td className="strong-cell">{l.topic}</td><td>{l.type}</td><td>{l.hours}</td><td><span className={'status-pill '+(l.completed?'complete':'planned')}>{l.completed?'Проведено · демо':'Запланировано'}</span></td></tr>)}</tbody></table></div>
            <p className="section-note"><Info size={16}/> В основной экосистеме КТП должен использовать Academic Core, расписание и подтверждённые занятия. Этот экран не создаёт отдельную модель учебного плана.</p>
          </section>}

          {section === 'attestation' && <section className="content-card">
            <div className="card-header"><div><h2>Предварительная аттестация</h2><p>Автоматический расчёт по текущим оценкам и правилам журнала.</p></div><span className="quiet-tag">Не утверждено</span></div>
            <div className="warning-line"><AlertCircle size={18}/><span>Результаты являются рекомендацией, а не официальными семестровыми оценками. Подписание и закрытие периода доступны только после подключения серверного RBAC.</span></div>
            <div className="responsive-table"><table className="simple-table"><thead><tr><th>Студент</th><th>Оценок</th><th>Средний</th><th>Посещаемость</th><th>Расчёт</th><th>Предложение</th></tr></thead><tbody>{groupStudents.map(s=>{const x=allSummaries[s.id];return <tr key={s.id}><td className="strong-cell">{s.name}</td><td>{x.gradeCount}</td><td>{x.gradeAverage===null?'—':two(x.gradeAverage)}</td><td>{x.attendancePercent===null?'—':Math.round(x.attendancePercent)+'%'}</td><td>{x.finalScore===null?'—':two(x.finalScore)}</td><td><span className={'result-pill '+(x.suggestedMark===2?'result-risk':'')}>{x.suggestedMark??'—'}</span></td></tr>})}</tbody></table></div>
            <div className="card-footer"><span>Итог вычисляется по версии настроек, действующей сейчас в этом демо.</span><button className="outline-button" onClick={()=>{setReportKind('attestation');setSection('reports')}}><FileSpreadsheet size={16}/> Подготовить ведомость</button></div>
          </section>}

          {section === 'reports' && <section className="content-card">
            <div className="card-header"><div><h2>Ведомости и экспорт</h2><p>Предварительный просмотр, табличная выгрузка и печатная версия документа.</p></div><span className="quiet-tag">Версия: демо</span></div>
            <div className="report-controls"><div className="select-wrap"><label htmlFor="report-kind">Вид документа</label><div className="select-shell"><select id="report-kind" value={reportKind} onChange={e=>setReportKind(e.target.value as ReportKind)}>{(Object.keys(reportTitles) as ReportKind[]).map(k=><option key={k} value={k}>{reportTitles[k]}</option>)}</select><ChevronDown size={16}/></div></div><button className="outline-button" onClick={downloadCsv}><ArrowDownToLine size={16}/> Excel-совместимый CSV</button><button className="primary-button" onClick={()=>window.print()}><Printer size={16}/> Печать / PDF</button></div>
            <div className="document-preview"><div className="document-overline">ПРЕДВАРИТЕЛЬНЫЙ ДОКУМЕНТ · НЕ УТВЕРЖДЁН</div><h3>{reportTitles[reportKind]}</h3><p>{journal.group} · {journal.subject} · {journal.semester} · {journal.academicYear}</p><div className="responsive-table"><table className="simple-table"><thead><tr>{reportData.headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{reportData.rows.slice(0,7).map((row,i)=><tr key={i}>{row.map((cell,k)=><td key={k}>{cell}</td>)}</tr>)}</tbody></table></div><small>Предпросмотр 7 строк из {reportData.rows.length}. При выгрузке включаются все строки.</small></div>
            <div className="warning-line"><ShieldCheck size={18}/><span>Официальные версии ведомостей, подписи, заморозка данных и права утверждения будут реализованы в backend. GitHub Pages не предназначен для хранения персональных данных.</span></div>
          </section>}

          {section === 'settings' && <div className="settings-grid">
            <section className="content-card"><div className="card-header"><div><h2>Конструктор оценивания</h2><p>Настройки действуют только для выбранного демонстрационного журнала.</p></div><SlidersHorizontal size={21} className="muted-icon"/></div>
              <div className="settings-group"><h3>Допустимые оценки</h3><label className="toggle-row"><span><strong>Числовые оценки</strong><small>2, 3, 4, 5</small></span><input type="checkbox" checked={policy.numericEnabled} onChange={e=>updatePolicy({numericEnabled:e.target.checked})}/></label><label className="toggle-row"><span><strong>Зачёт / незачёт</strong><small>З = 5, НЗ = 2 при расчёте среднего</small></span><input type="checkbox" checked={policy.passEnabled} onChange={e=>updatePolicy({passEnabled:e.target.checked})}/></label><p className="field-help">Отключение типа убирает его из нового ввода и предварительного расчёта. Исторические записи не удаляются.</p></div>
              <div className="settings-group"><h3>Вес разных видов работ</h3>{(Object.keys(categoryTitles) as GradeCategory[]).map(cat=><div className="weight-row" key={cat}><label htmlFor={'weight-'+cat}>{categoryTitles[cat]}</label><select id={'weight-'+cat} value={policy.categoryWeights[cat]} onChange={e=>updateCategoryWeight(cat,Number(e.target.value))}>{[0,0.5,1,1.5,2,2.5,3].map(n=><option key={n} value={n}>{n===0?'Не учитывать':'× '+n.toLocaleString('ru-RU')}</option>)}</select></div>)}</div>
              <div className="settings-group"><h3>Посещаемость в итоговом расчёте</h3><label className="toggle-row"><span><strong>Учитывать посещаемость как оценку</strong><small>Пороговая шкала 90/75/60% → 5/4/3/2</small></span><input type="checkbox" checked={policy.attendanceEnabled} onChange={e=>updatePolicy({attendanceEnabled:e.target.checked})}/></label><div className={'slider-line '+(!policy.attendanceEnabled?'dimmed':'')}><div><label htmlFor="attendance-weight">Вес посещаемости</label><strong>{policy.attendanceEnabled ? policy.attendanceWeight : 0}%</strong></div><input id="attendance-weight" type="range" min="0" max="30" step="5" disabled={!policy.attendanceEnabled} value={policy.attendanceWeight} onChange={e=>updatePolicy({attendanceWeight:Number(e.target.value)})}/></div><p className="field-help">Уважительные пропуски исключены из знаменателя только в этом демонстрационном правиле. Для реального колледжа нужны утверждённые регламенты.</p></div>
            </section>
            <div className="right-settings"><section className="content-card"><h2>Как считается итог</h2><p className="card-subtitle">Пример на первой записи группы</p>{(()=>{const s=groupStudents[0];const x=allSummaries[s.id];return <div className="calculation-box"><div><span>Средний балл</span><strong>{x.gradeAverage===null?'—':two(x.gradeAverage)}</strong></div><div><span>Посещаемость</span><strong>{x.attendancePercent===null?'—':Math.round(x.attendancePercent)+'%'}</strong></div><div><span>Оценка за посещаемость</span><strong>{x.attendanceGrade??'—'}</strong></div><div className="calculation-total"><span>Предварительный итог</span><strong>{x.finalScore===null?'—':two(x.finalScore)}</strong></div><div><span>Рекомендуемая оценка</span><strong>{x.suggestedMark??'—'}</strong></div></div>})()}<p className="field-help">Правила округления: 4,50 → 5; 3,50 → 4; 2,50 → 3; ниже → 2. В рабочей системе алгоритм утверждается колледжем.</p></section>
              <section className="content-card"><h2>Что увидит студент</h2><p className="card-subtitle">В источнике оценки сохраняются её происхождение и тип проверки.</p><div className="source-list"><div><IconChip source="manual"/><span>Вручную преподавателем</span></div><div><IconChip source="lms-auto"/><span>Автоматически из LMS</span></div><div><IconChip source="lms-reviewed"/><span>Проверено преподавателем в LMS</span></div></div></section>
              <section className="content-card"><div className="mini-info"><ShieldCheck size={19}/><div><strong>Политика колледжа важнее личной настройки</strong><p>В рабочей версии здесь будут допустимые профили оценивания, версии правил, RBAC и аудит изменений. Демонстрация пока не имеет механизма утверждения.</p></div></div></section>
            </div>
          </div>}

          <footer className="app-footer"><span>College Ecosystem · Journal UI prototype</span><span>React · TypeScript · Vite · Данные вымышлены</span></footer>
        </main>
      </div>

      {selected && activeStudent && activeLesson && <div className="drawer-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null) }}>
        <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-heading">
          <div className="drawer-header"><div><div className="eyebrow">РЕДАКТИРОВАНИЕ ЗАНЯТИЯ</div><h2 id="drawer-heading">{activeStudent.name}</h2><p>{formatDate(activeLesson.date)} · {activeLesson.type}</p></div><button className="icon-button" onClick={()=>setSelected(null)} title="Закрыть"><X size={20}/></button></div>
          <div className="drawer-content"><div className="topic-card"><strong>Тема занятия</strong><p>{activeLesson.topic}</p><small>{activeLesson.hours} академических часа · {activeLesson.completed?'Проведено (демо)':'Запланировано'}</small></div>
            <h3>Посещаемость</h3><div className="attendance-actions">{(Object.keys(attendanceInfo) as AttendanceStatus[]).map(status=><button key={status} className={'attendance-button '+(getAttendance(selected.studentId,selected.lessonId)?.status===status?'chosen':'')} onClick={()=>setAttendance(selected.studentId,selected.lessonId,status)}><span>{attendanceInfo[status].short}</span>{attendanceInfo[status].label}</button>)}</div>
            <div className="late-control"><label htmlFor="late-minutes">Минут опоздания</label><input type="number" id="late-minutes" min="1" max="120" value={lateMinutes} onChange={e=>setLateMinutes(Math.min(120,Math.max(1,Number(e.target.value)||1)))}/><button className="text-button" onClick={()=>setAttendance(selected.studentId,selected.lessonId,'late')}>Применить</button></div>
            <div className="drawer-divider"/>
            <h3>Оценки за занятие</h3><div className="grade-list">{getGrades(selected.studentId,selected.lessonId).length===0?<p className="empty-muted">Оценок пока нет.</p>:getGrades(selected.studentId,selected.lessonId).map(g=><div className="grade-row" key={g.id}><span className={'large-mark mark-'+g.source}>{g.value}</span><div><strong>{categoryTitles[g.category]}</strong><small><IconChip source={g.source}/> {sourceInfo[g.source].label}</small>{g.note&&<small>{g.note}</small>}</div><button className="icon-button delete" title="Удалить демонстрационную оценку" onClick={()=>removeGrade(g.id)}><Trash2 size={16}/></button></div>)}</div>
            <h3>Добавить оценку</h3><div className="mark-picker">{marks.map(mark=><button key={mark} disabled={(mark==='З'||mark==='НЗ')?!policy.passEnabled:!policy.numericEnabled} className={draftMark===mark?'picked':''} onClick={()=>setDraftMark(mark)}>{mark}</button>)}</div>
            <label className="field-label" htmlFor="grade-category">Вид работы</label><select className="wide-select" id="grade-category" value={draftCategory} onChange={e=>setDraftCategory(e.target.value as GradeCategory)}>{(Object.keys(categoryTitles) as GradeCategory[]).map(c=><option key={c} value={c}>{categoryTitles[c]}</option>)}</select>
            <label className="field-label" htmlFor="grade-note">Комментарий (необязательно)</label><textarea id="grade-note" rows={2} value={draftNote} onChange={e=>setDraftNote(e.target.value)} placeholder="Например, ответ у доски"/>
            <button className="primary-button full-button" onClick={addGrade}><Plus size={17}/> Добавить оценку</button>
            <p className="field-help">Ввод вручную помечается как ручной. Источник LMS назначается только синхронизацией.</p>
          </div>
        </aside>
      </div>}

      <section className="print-sheet" aria-hidden="true">
        <h1>College Ecosystem · {reportTitles[reportKind]}</h1>
        <p>Группа: {journal.group} · Дисциплина: {journal.subject} · {journal.semester} · Учебный год {journal.academicYear}</p>
        <p><strong>ДЕМОНСТРАЦИОННЫЙ ДОКУМЕНТ. НЕ УТВЕРЖДЁН.</strong></p>
        <table><thead><tr>{reportData.headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{reportData.rows.map((row,i)=><tr key={i}>{row.map((v,k)=><td key={k}>{v}</td>)}</tr>)}</tbody></table>
        <p>* Итог рассчитан автоматически для предварительного просмотра и не является официальной оценкой.</p>
      </section>
    </div>
  )
}
export default App
