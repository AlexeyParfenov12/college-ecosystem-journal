import { createDemoState, journals } from './demo'
import type { DemoState } from './types'

const key = 'college-journal-demo-v1'

export function loadDemoState(): DemoState {
  try {
    const stored = window.localStorage.getItem(key)
    if (!stored) return createDemoState()
    const raw: unknown = JSON.parse(stored)
    if (!raw || typeof raw !== 'object') return createDemoState()
    const value = raw as Partial<DemoState>
    if (!Array.isArray(value.grades) || !Array.isArray(value.attendance) || !value.policies) return createDemoState()
    const defaults = createDemoState().policies
    const policies = { ...defaults }
    for (const journal of journals) {
      const incoming = value.policies[journal.id]
      if (incoming && typeof incoming === 'object') {
        policies[journal.id] = {
          ...defaults[journal.id], ...incoming,
          categoryWeights: { ...defaults[journal.id].categoryWeights, ...incoming.categoryWeights },
        }
      }
    }
    return { grades: value.grades, attendance: value.attendance, policies }
  } catch {
    return createDemoState()
  }
}

export function saveDemoState(state: DemoState): void {
  try { window.localStorage.setItem(key, JSON.stringify(state)) }
  catch { /* Private mode or storage restrictions: demo remains in memory. */ }
}
export function clearDemoState(): void {
  try { window.localStorage.removeItem(key) }
  catch { /* Nothing to clear when localStorage is unavailable. */ }
}
