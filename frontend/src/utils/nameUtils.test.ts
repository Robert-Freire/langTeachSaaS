import { describe, it, expect } from 'vitest'
import { getInitials } from './nameUtils'

describe('getInitials', () => {
  it('returns two initials from two-word name', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  it('returns single initial from single-word name', () => {
    expect(getInitials('John')).toBe('J')
  })

  it('returns at most two initials from a three-word name', () => {
    expect(getInitials('John Michael Doe')).toBe('JM')
  })

  it('handles multiple spaces between words', () => {
    expect(getInitials('John  Doe')).toBe('JD')
  })

  it('returns empty string for all-spaces input', () => {
    expect(getInitials('   ')).toBe('')
  })
})
