import { describe, it, expect } from 'vitest'
import { getObjectiveUrgency, getDaysRemaining, formatDaysRemaining } from './objectiveUrgency'

function dateString(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

describe('getObjectiveUrgency', () => {
  it('returns normal for null', () => {
    expect(getObjectiveUrgency(null)).toBe('normal')
  })

  it('returns overdue for past date', () => {
    expect(getObjectiveUrgency(dateString(-1))).toBe('overdue')
  })

  it('returns overdue for yesterday', () => {
    expect(getObjectiveUrgency(dateString(-30))).toBe('overdue')
  })

  it('returns critical for today', () => {
    expect(getObjectiveUrgency(dateString(0))).toBe('critical')
  })

  it('returns critical for date within 42 days', () => {
    expect(getObjectiveUrgency(dateString(42))).toBe('critical')
  })

  it('returns normal for date beyond 42 days', () => {
    expect(getObjectiveUrgency(dateString(43))).toBe('normal')
  })
})

describe('getDaysRemaining', () => {
  it('returns null for null date', () => {
    expect(getDaysRemaining(null)).toBeNull()
  })

  it('returns negative for past date', () => {
    expect(getDaysRemaining(dateString(-5))).toBe(-5)
  })

  it('returns 0 for today', () => {
    expect(getDaysRemaining(dateString(0))).toBe(0)
  })

  it('returns positive for future date', () => {
    expect(getDaysRemaining(dateString(10))).toBe(10)
  })
})

describe('formatDaysRemaining', () => {
  it('returns OVERDUE for negative', () => {
    expect(formatDaysRemaining(-1)).toBe('OVERDUE')
  })

  it('returns Due today for 0', () => {
    expect(formatDaysRemaining(0)).toBe('Due today')
  })

  it('returns 1 day left for 1', () => {
    expect(formatDaysRemaining(1)).toBe('1 day left')
  })

  it('returns N days left for N > 1', () => {
    expect(formatDaysRemaining(30)).toBe('30 days left')
  })
})
