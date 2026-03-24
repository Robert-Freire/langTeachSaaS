import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StudentProfileSummary, computeProfileCompleteness } from './StudentProfileSummary'
import type { Student } from '../api/students'

const BASE_STUDENT: Student = {
  id: '1',
  name: 'Marco',
  learningLanguage: 'Spanish',
  cefrLevel: 'A1',
  interests: [],
  notes: null,
  nativeLanguage: null,
  learningGoals: [],
  weaknesses: [],
  difficulties: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const FULL_STUDENT: Student = {
  ...BASE_STUDENT,
  nativeLanguage: 'Italian',
  interests: ['football', 'cooking'],
  learningGoals: ['get a job in Barcelona'],
  weaknesses: ['ser vs estar'],
  difficulties: [
    { id: 'x', category: 'grammar', item: 'subjunctive', severity: 'high', trend: 'stable' },
  ],
}

describe('computeProfileCompleteness', () => {
  it('returns 0% for empty profile', () => {
    const { score, missingFields } = computeProfileCompleteness(BASE_STUDENT)
    expect(score).toBe(0)
    expect(missingFields).toHaveLength(5)
  })

  it('returns 100% for full profile', () => {
    const { score, missingFields } = computeProfileCompleteness(FULL_STUDENT)
    expect(score).toBe(100)
    expect(missingFields).toHaveLength(0)
  })

  it('returns 20% when exactly one field is populated', () => {
    const { score, missingFields } = computeProfileCompleteness({
      ...BASE_STUDENT,
      nativeLanguage: 'Italian',
    })
    expect(score).toBe(20)
    expect(missingFields).toHaveLength(4)
  })

  it('does not count empty arrays as populated', () => {
    const { score } = computeProfileCompleteness({
      ...BASE_STUDENT,
      interests: [],
      learningGoals: [],
    })
    expect(score).toBe(0)
  })

  it('lists missing field names', () => {
    const { missingFields } = computeProfileCompleteness({
      ...BASE_STUDENT,
      nativeLanguage: 'Italian',
    })
    expect(missingFields).toContain('interests')
    expect(missingFields).toContain('learning goals')
    expect(missingFields).toContain('known weaknesses')
    expect(missingFields).toContain('documented difficulties')
    expect(missingFields).not.toContain('native language')
  })
})

describe('StudentProfileSummary', () => {
  it('renders student name, CEFR level, and language', () => {
    render(<StudentProfileSummary student={FULL_STUDENT} />)
    expect(screen.getByText('Marco')).toBeInTheDocument()
    expect(screen.getByText('A1 Spanish')).toBeInTheDocument()
  })

  it('shows 100% completeness for full profile', () => {
    render(<StudentProfileSummary student={FULL_STUDENT} />)
    expect(screen.getByTestId('completeness-score')).toHaveTextContent('100%')
    expect(screen.queryByTestId('missing-fields-hint')).not.toBeInTheDocument()
  })

  it('shows 0% completeness and hint for empty profile', () => {
    render(<StudentProfileSummary student={BASE_STUDENT} />)
    expect(screen.getByTestId('completeness-score')).toHaveTextContent('0%')
    expect(screen.getByTestId('missing-fields-hint')).toBeInTheDocument()
  })

  it('lists missing fields in the hint', () => {
    render(<StudentProfileSummary student={BASE_STUDENT} />)
    const hint = screen.getByTestId('missing-fields-hint')
    expect(hint.textContent).toContain('native language')
    expect(hint.textContent).toContain('interests')
  })

  it('shows native language value when populated', () => {
    render(<StudentProfileSummary student={FULL_STUDENT} />)
    expect(screen.getByText('(Italian)')).toBeInTheDocument()
  })

  it('renders without crashing when all optional fields are missing', () => {
    render(<StudentProfileSummary student={BASE_STUDENT} />)
    expect(screen.getByTestId('student-profile-summary')).toBeInTheDocument()
  })
})
