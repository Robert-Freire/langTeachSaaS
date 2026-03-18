import { describe, it, expect } from 'vitest'
import { getCefrBadgeClasses } from './cefr-colors'

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
