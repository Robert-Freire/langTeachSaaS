import { describe, it, expect } from 'vitest'
import { getCefrBadgeClasses, getCefrGap } from './cefr-colors'

describe('getCefrBadgeClasses', () => {
  it('returns emerald classes for A1', () => {
    expect(getCefrBadgeClasses('A1')).toContain('emerald')
  })

  it('returns emerald classes for A2', () => {
    expect(getCefrBadgeClasses('A2')).toContain('emerald')
  })

  it('returns indigo classes for B1', () => {
    expect(getCefrBadgeClasses('B1')).toContain('indigo')
  })

  it('returns indigo classes for B2', () => {
    expect(getCefrBadgeClasses('B2')).toContain('indigo')
  })

  it('returns purple classes for C1', () => {
    expect(getCefrBadgeClasses('C1')).toContain('purple')
  })

  it('returns purple classes for C2', () => {
    expect(getCefrBadgeClasses('C2')).toContain('purple')
  })

  it('returns indigo as default for unknown levels', () => {
    expect(getCefrBadgeClasses('X9')).toContain('indigo')
  })
})

describe('getCefrGap', () => {
  it('returns 4 for A1 vs C1', () => {
    expect(getCefrGap('A1', 'C1')).toBe(4)
  })

  it('returns 5 for A1 vs C2', () => {
    expect(getCefrGap('A1', 'C2')).toBe(5)
  })

  it('returns 1 for B1 vs B2', () => {
    expect(getCefrGap('B1', 'B2')).toBe(1)
  })

  it('returns same gap regardless of order', () => {
    expect(getCefrGap('C2', 'A1')).toBe(5)
  })

  it('returns 0 for same level', () => {
    expect(getCefrGap('B1', 'B1')).toBe(0)
  })

  it('returns 0 if first level is unknown', () => {
    expect(getCefrGap('', 'B1')).toBe(0)
  })

  it('returns 0 if second level is undefined', () => {
    expect(getCefrGap('A1', undefined)).toBe(0)
  })

  it('returns 0 if first level is undefined', () => {
    expect(getCefrGap(undefined, 'B2')).toBe(0)
  })
})
