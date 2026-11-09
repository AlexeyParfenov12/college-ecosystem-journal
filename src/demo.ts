import type { AttendanceEntry, DemoState, GradeCategory, GradeEntry, GradingPolicy, Journal, Lesson, MarkValue, Student } from './types'

export const journals: Journal[] = [
  { id: 'j1', group: 'П-11', subject: 'Основы программирования', course: 1, semester: '1 семестр', academicYear: '2026/2027', teacher: 'А. В. Преподаватель', plannedHours: 72 },
  { id: 'j2', group: 'ИС-21', subject: 'МДК.01.01 Разработка программных модулей', course: 2, semester: '3 семестр', academicYear: '2026/2027', teacher: 'А. В. Преподаватель', plannedHours: 108 },
  { id: 'j3', group: 'П-12', subject: 'Основы алгоритмизации', course: 1, semester: '1 семестр', academicYear: '2026/2027', teacher: 'А. В. Преподаватель', plannedHours: 64 },
]
const names = [
  'Александрова Мария', 'Белов Артём', 'Васильева София', 'Громов Даниил',
  'Егорова Полина', 'Захаров Максим', 'Иванова Алиса', 'Кузнецов Илья',
  'Лебедева Ксения', 'Макаров Никита', 'Морозова Анна', 'Новиков Павел',
  'Орлова Дарья', 'Павлова Екатерина', 'Романов Дмитрий', 'Соколова Виктория',
  'Тихонов Андрей', 'Фёдорова Елизавета',
]
export const students: Student[] = journals.flatMap(j =>
  names.map((name, i) => ({ id: j.id + '-s' + (i + 1), journalId: j.id, name }))
)
const days = ['2026-10-08', '2026-10-13', '2026-10-20', '2026-10-27', '2026-11-03', '2026-11-05', '2026-11-10', '2026-11-12', '2026-11-17', '2026-11-19']
const topics = [
  'Введение в дисциплину. Техника безопасности', 'Алгоритмы и исполнители',
  'Переменные и типы данных', 'Ввод и вывод данных', 'Условные конструкции',
  'Циклы и последовательности', 'Практическая работа: ветвления',
  'Лабораторная работа: циклы', 'Функции и параметры', 'Контрольная работа по разделу',
]
export const lessons: Lesson[] = journals.flatMap(j => days.map((date, i) => ({
  id: j.id + '-l' + (i + 1), journalId: j.id, date, topic: topics[i],
  type: (i === 9 ? 'Контрольная' : i === 7 ? 'Лабораторная' : i % 3 === 0 ? 'Практика' : 'Лекция') as Lesson['type'],
  hours: 2, completed: i < 6,
})))

export const defaultPolicy: GradingPolicy = {
  numericEnabled: true, passEnabled: true, attendanceEnabled: false, attendanceWeight: 10,
  categoryWeights: { classwork: 1, practice: 1.5, control: 2, lms: 1 },
  personalView: 'combined',
}

export const categoryTitles: Record<GradeCategory, string> = {
  classwork: 'Работа на занятии', practice: 'Практическая работа',
  control: 'Контрольная', lms: 'Задание LMS',
}

export function createDemoState(): DemoState {
  const grades: GradeEntry[] = []
  const attendance: AttendanceEntry[] = []
  for (const journal of journals) {
    const groupStudents = students.filter(s => s.journalId === journal.id)
    const groupLessons = lessons.filter(l => l.journalId === journal.id && l.completed)
    groupStudents.forEach((student, si) => {
      groupLessons.forEach((lesson, li) => {
        const absent = (si + li * 5) % 17 === 0
        const excused = (si + li * 3) % 23 === 0
        attendance.push({
          studentId: student.id, lessonId: lesson.id,
          status: absent ? 'absent' : excused ? 'excused' : (si + li) % 12 === 0 ? 'late' : 'present',
          ...((si + li) % 12 === 0 && !absent && !excused ? { lateMinutes: 10 } : {}),
        })
        if ((si + li) % 3 !== 0 && !absent && li < 5) {
          const gradeValue = (si + li) % 13 === 0 ? 'НЗ' : (si + li) % 7 === 0 ? 'З' : String(3 + ((si + li * 2) % 3))
          const value = gradeValue as MarkValue
          const source = li === 3 ? 'lms-auto' : li === 4 ? 'lms-reviewed' : 'manual'
          grades.push({
            id: 'seed-' + student.id + '-' + lesson.id, studentId: student.id, lessonId: lesson.id,
            value, source, category: (li === 3 || li === 4 ? 'lms' : li === 0 ? 'practice' : 'classwork'),
            sourceRef: source !== 'manual' ? 'lms-demo:' + student.id + ':' + li : undefined,
          })
        }
      })
    })
  }
  return { grades, attendance, policies: Object.fromEntries(journals.map(j => [j.id, { ...defaultPolicy, categoryWeights: { ...defaultPolicy.categoryWeights } }])) }
}
