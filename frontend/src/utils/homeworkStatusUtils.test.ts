import { describe, it, expect } from 'vitest'
import {
  getHomeworkStatusInfo,
  getHomeworkStatusInfoSafe,
  isHomeworkApplicable,
  HOMEWORK_STATUS_PILL_OPTIONS,
  type HomeworkStatus,
} from './homeworkStatusUtils'

const ALL_VALUES: HomeworkStatus[] = ['NotApplicable', 'NotDone', 'Partial', 'Done']

describe('getHomeworkStatusInfo', () => {
  it('returns human-readable label for each known value', () => {
    expect(getHomeworkStatusInfo('NotApplicable').label).toBe('Not applicable')
    expect(getHomeworkStatusInfo('NotDone').label).toBe('Not done')
    expect(getHomeworkStatusInfo('Partial').label).toBe('Partial')
    expect(getHomeworkStatusInfo('Done').label).toBe('Done')
  })

  it('covers all HomeworkStatus values (exhaustiveness)', () => {
    for (const value of ALL_VALUES) {
      const info = getHomeworkStatusInfo(value)
      expect(info.label).toBeTruthy()
      expect(info.icon).toBeTruthy()
      expect(info.color).toBeTruthy()
    }
  })

  it('returns no raw PascalCase enum name in any label', () => {
    // PascalCase multi-word values (NotApplicable, NotDone) must not leak as-is
    expect(getHomeworkStatusInfo('NotApplicable').label).not.toBe('NotApplicable')
    expect(getHomeworkStatusInfo('NotDone').label).not.toBe('NotDone')
  })
})

describe('getHomeworkStatusInfoSafe', () => {
  it('returns NotApplicable info for null', () => {
    expect(getHomeworkStatusInfoSafe(null).label).toBe('Not applicable')
  })

  it('returns NotApplicable info for undefined', () => {
    expect(getHomeworkStatusInfoSafe(undefined).label).toBe('Not applicable')
  })

  it('handles all known string values', () => {
    for (const value of ALL_VALUES) {
      const info = getHomeworkStatusInfoSafe(value)
      expect(info).toEqual(getHomeworkStatusInfo(value))
    }
  })

  it('returns unknown value as-is for unrecognised strings', () => {
    const info = getHomeworkStatusInfoSafe('SomeFutureStatus')
    expect(info.label).toBe('SomeFutureStatus')
  })
})

describe('isHomeworkApplicable', () => {
  it('returns false for null, undefined, empty string', () => {
    expect(isHomeworkApplicable(null)).toBe(false)
    expect(isHomeworkApplicable(undefined)).toBe(false)
    expect(isHomeworkApplicable('')).toBe(false)
  })

  it('returns false for NotApplicable', () => {
    expect(isHomeworkApplicable('NotApplicable')).toBe(false)
  })

  it('returns true for applicable statuses', () => {
    expect(isHomeworkApplicable('Done')).toBe(true)
    expect(isHomeworkApplicable('Partial')).toBe(true)
    expect(isHomeworkApplicable('NotDone')).toBe(true)
  })
})

describe('HOMEWORK_STATUS_PILL_OPTIONS', () => {
  it('contains Done, Partial, NotDone but not NotApplicable', () => {
    const values = HOMEWORK_STATUS_PILL_OPTIONS.map((o) => o.value)
    expect(values).toContain('Done')
    expect(values).toContain('Partial')
    expect(values).toContain('NotDone')
    expect(values).not.toContain('NotApplicable')
  })

  it('uses human-readable labels matching getHomeworkStatusInfo', () => {
    for (const option of HOMEWORK_STATUS_PILL_OPTIONS) {
      expect(option.label).toBe(getHomeworkStatusInfo(option.value).label)
    }
  })
})
