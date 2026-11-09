export type MarkValue = '2' | '3' | '4' | '5' | 'З' | 'НЗ'
export type GradeCategory = 'classwork' | 'practice' | 'control' | 'lms'
export type GradeSource = 'manual' | 'lms-auto' | 'lms-reviewed'
export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'late'
export type JournalView = 'combined' | 'grades' | 'attendance'

export interface Journal {
  id: string
  group: string
  subject: string
  course: number
  semester: string
  academicYear: string
  teacher: string
  plannedHours: number
}
export interface Student {
  id: string
  journalId: string
  name: string
}
export interface Lesson {
  id: string
  journalId: string
  date: string
  topic: string
  type: 'Лекция' | 'Практика' | 'Лабораторная' | 'Контрольная'
  hours: number
  completed: boolean
}
export interface GradeEntry {
  id: string
  studentId: string
  lessonId: string
  value: MarkValue
  category: GradeCategory
  source: GradeSource
  sourceRef?: string
  note?: string
}
export interface AttendanceEntry {
  studentId: string
  lessonId: string
  status: AttendanceStatus
  lateMinutes?: number
}
export interface GradingPolicy {
  numericEnabled: boolean
  passEnabled: boolean
  attendanceEnabled: boolean
  attendanceWeight: number
  categoryWeights: Record<GradeCategory, number>
  personalView: JournalView
}
export interface DemoState {
  grades: GradeEntry[]
  attendance: AttendanceEntry[]
  policies: Record<string, GradingPolicy>
}
export type Section = 'journal' | 'plan' | 'attestation' | 'reports' | 'settings'
export type ReportKind = 'full' | 'grades' | 'attendance' | 'attestation' | 'plan'
