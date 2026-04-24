import { describe, it, expect } from 'vitest'
import { getDisplayStatus, sessionStatusChipClass } from './sessionStatusUtils'

describe('getDisplayStatus', () => {
  const past = new Date(Date.now() - 86400000).toISOString()
  const future = new Date(Date.now() + 86400000).toISOString()

  it('returns Cancelled for cancelled status', () => {
    expect(getDisplayStatus('Cancelled', future)).toBe('Cancelled')
    expect(getDisplayStatus('Cancelled', past)).toBe('Cancelled')
  })

  it('returns Draft for draft status', () => {
    expect(getDisplayStatus('Draft', future)).toBe('Draft')
    expect(getDisplayStatus('Draft', past)).toBe('Draft')
  })

  it('returns Completed for confirmed past session', () => {
    expect(getDisplayStatus('Confirmed', past)).toBe('Completed')
  })

  it('returns Scheduled for confirmed future session', () => {
    expect(getDisplayStatus('Confirmed', future)).toBe('Scheduled')
  })
})

describe('sessionStatusChipClass', () => {
  it('returns red classes for Cancelled', () => {
    expect(sessionStatusChipClass('Cancelled')).toContain('red')
  })

  it('returns amber classes for Draft', () => {
    expect(sessionStatusChipClass('Draft')).toContain('amber')
  })

  it('returns indigo classes for Scheduled', () => {
    expect(sessionStatusChipClass('Scheduled')).toContain('indigo')
  })

  it('returns zinc classes for Completed', () => {
    expect(sessionStatusChipClass('Completed')).toContain('zinc')
  })
})
