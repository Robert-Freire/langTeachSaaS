import { describe, it, expect } from 'vitest'
import { formatMonth, formatDay } from './formatDate'

describe('formatMonth', () => {
  it('returns uppercase short month', () => {
    expect(formatMonth('2026-04-15T12:00:00Z')).toBe('APR')
  })

  it('returns empty string for null', () => {
    expect(formatMonth(null)).toBe('')
  })

  it('returns correct month for January', () => {
    expect(formatMonth('2026-01-15T12:00:00Z')).toBe('JAN')
  })
})

describe('formatDay', () => {
  it('returns day number as string', () => {
    expect(formatDay('2026-04-05T12:00:00Z')).toBe('5')
  })

  it('returns empty string for null', () => {
    expect(formatDay(null)).toBe('')
  })

  it('returns two-digit day without leading zero', () => {
    expect(formatDay('2026-04-15T12:00:00Z')).toBe('15')
  })
})
