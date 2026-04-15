import { describe, it, expect } from 'vitest'
import { getSessionTitle, getDisplayTitle } from './sessionUtils'
import type { SessionLog } from '../api/sessionLogs'

function makeSession(overrides: Partial<SessionLog> = {}): SessionLog {
  return {
    id: '1',
    studentId: '1',
    title: null,
    sessionDate: null,
    status: 1,
    statusName: 'Confirmed',
    actualContent: null,
    plannedContent: null,
    generalNotes: null,
    homeworkAssigned: null,
    previousHomeworkStatus: 0,
    previousHomeworkStatusName: '',
    nextSessionTopics: null,
    levelReassessmentSkill: null,
    levelReassessmentLevel: null,
    linkedLessonId: null,
    topicTags: '[]',
    mentionedDifficultyPairs: '[]',
    suggestedDifficulties: '[]',
    duration: null,
    isCancelled: false,
    hasVoiceNote: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('getSessionTitle', () => {
  it('returns the session title when set', () => {
    expect(getSessionTitle(makeSession({ title: 'Past Simple' }))).toBe('Past Simple')
  })

  it('returns date-based fallback when no title but date exists', () => {
    const result = getSessionTitle(makeSession({ sessionDate: '2026-04-15T12:00:00Z' }))
    expect(result).toMatch(/^Session,/)
  })

  it('returns "Session" when no title and no date', () => {
    expect(getSessionTitle(makeSession())).toBe('Session')
  })
})

describe('getDisplayTitle', () => {
  it('returns the session title when set and not generic', () => {
    expect(getDisplayTitle(makeSession({ title: 'Subjunctive intro' }))).toBe('Subjunctive intro')
  })

  it('falls back to truncated actualContent when title is "Session"', () => {
    const content = 'a'.repeat(60)
    const result = getDisplayTitle(makeSession({ title: 'Session', actualContent: content }))
    expect(result).toHaveLength(58) // 55 chars + '...'
    expect(result.endsWith('...')).toBe(true)
  })

  it('falls back to actualContent without ellipsis when short', () => {
    const result = getDisplayTitle(makeSession({ title: 'Session', actualContent: 'Short content' }))
    expect(result).toBe('Short content')
  })

  it('falls back to generalNotes when no actualContent', () => {
    const result = getDisplayTitle(makeSession({ title: 'Session', generalNotes: 'Some notes' }))
    expect(result).toBe('Some notes')
  })

  it('falls back to plannedContent when no actual or notes', () => {
    const result = getDisplayTitle(makeSession({ title: 'Session', plannedContent: 'Plan' }))
    expect(result).toBe('Plan')
  })

  it('returns "Session" when nothing available', () => {
    expect(getDisplayTitle(makeSession())).toBe('Session')
  })
})
