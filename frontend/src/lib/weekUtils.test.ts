import { describe, it, expect, vi, afterEach } from 'vitest'
import { getWeekBounds, getWeekDays, formatWeekDay, isToday, getDayOfWeek, toISODateString } from './weekUtils'

describe('weekUtils', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getWeekBounds', () => {
    it('returns Monday-Sunday for current week', () => {
      // Fix date to Wednesday 2026-03-18
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 2, 18, 12, 0, 0))

      const { start, end } = getWeekBounds(0)
      expect(start.getDay()).toBe(1) // Monday
      expect(start.getDate()).toBe(16) // Mar 16
      expect(end.getDay()).toBe(0) // Sunday
      expect(end.getDate()).toBe(22) // Mar 22
    })

    it('handles week offset +1', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 2, 18, 12, 0, 0))

      const { start, end } = getWeekBounds(1)
      expect(start.getDate()).toBe(23) // Next Monday
      expect(end.getDate()).toBe(29) // Next Sunday
    })

    it('handles week offset -1', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 2, 18, 12, 0, 0))

      const { start } = getWeekBounds(-1)
      expect(start.getDate()).toBe(9) // Previous Monday
    })

    it('handles Sunday correctly (still part of current week)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 2, 22, 12, 0, 0)) // Sunday Mar 22

      const { start, end } = getWeekBounds(0)
      expect(start.getDate()).toBe(16) // Monday Mar 16
      expect(end.getDate()).toBe(22) // Sunday Mar 22
    })
  })

  describe('getWeekDays', () => {
    it('returns 7 dates starting from Monday', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 2, 18, 12, 0, 0))

      const days = getWeekDays(0)
      expect(days).toHaveLength(7)
      expect(days[0].getDay()).toBe(1) // Monday
      expect(days[6].getDay()).toBe(0) // Sunday
    })
  })

  describe('formatWeekDay', () => {
    it('formats date as abbreviated day + date number', () => {
      const wed = new Date(2026, 2, 18)
      expect(formatWeekDay(wed)).toBe('Wed 18')
    })
  })

  describe('isToday', () => {
    it('returns true for today', () => {
      expect(isToday(new Date())).toBe(true)
    })

    it('returns false for yesterday', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isToday(yesterday)).toBe(false)
    })
  })

  describe('getDayOfWeek', () => {
    it('returns 0 for Monday', () => {
      expect(getDayOfWeek(new Date(2026, 2, 16))).toBe(0) // Monday
    })

    it('returns 6 for Sunday', () => {
      expect(getDayOfWeek(new Date(2026, 2, 22))).toBe(6) // Sunday
    })
  })

  describe('toISODateString', () => {
    it('formats date correctly', () => {
      const d = new Date(2026, 2, 18, 14, 30, 0)
      expect(toISODateString(d)).toBe('2026-03-18T14:30:00')
    })
  })
})
