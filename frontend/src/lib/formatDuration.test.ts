import { describe, it, expect } from 'vitest'
import { formatDuration } from './formatDuration'

describe('formatDuration', () => {
  it('formats zero', () => {
    expect(formatDuration(0)).toBe('00:00')
  })

  it('formats sub-minute values', () => {
    expect(formatDuration(59)).toBe('00:59')
  })

  it('formats exactly one minute', () => {
    expect(formatDuration(60)).toBe('01:00')
  })

  it('formats multi-minute values', () => {
    expect(formatDuration(125)).toBe('02:05')
  })

  it('formats one hour', () => {
    expect(formatDuration(3600)).toBe('60:00')
  })

  it('truncates fractional seconds', () => {
    expect(formatDuration(65.9)).toBe('01:05')
  })
})
