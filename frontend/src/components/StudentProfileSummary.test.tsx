import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StudentProfileSummary } from './StudentProfileSummary'
import { computeProfileCompleteness } from './studentProfileUtils'
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
  // BASE_STUDENT has cefrLevel: 'A1' (always populated) = 1/6 = 17%
  it('returns 17% when only cefrLevel is populated (baseline)', () => {
    const { score, missingFields } = computeProfileCompleteness(BASE_STUDENT)
    expect(score).toBe(17)
    expect(missingFields).toHaveLength(5)
    expect(missingFields).not.toContain('CEFR level')
  })

  it('returns 100% for full profile', () => {
    const { score, missingFields } = computeProfileCompleteness(FULL_STUDENT)
    expect(score).toBe(100)
    expect(missingFields).toHaveLength(0)
  })

  it('returns 33% when cefrLevel + one additional field are populated', () => {
    const { score, missingFields } = computeProfileCompleteness({
      ...BASE_STUDENT,
      nativeLanguage: 'Italian',
    })
    expect(score).toBe(33) // 2/6 rounded
    expect(missingFields).toHaveLength(4)
  })

  it('does not count empty arrays as populated', () => {
    const { score } = computeProfileCompleteness({
      ...BASE_STUDENT,
      interests: [],
      learningGoals: [],
    })
    expect(score).toBe(17) // only cefrLevel contributes
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
    expect(missingFields).not.toContain('CEFR level')
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

  it('shows 17% completeness (cefrLevel only) and hint for minimal profile', () => {
    render(<StudentProfileSummary student={BASE_STUDENT} />)
    expect(screen.getByTestId('completeness-score')).toHaveTextContent('17%')
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

  it('hides completeness bar and score when hasRichNotes is true', () => {
    render(<StudentProfileSummary student={BASE_STUDENT} hasRichNotes />)
    expect(screen.queryByTestId('completeness-bar')).not.toBeInTheDocument()
    expect(screen.queryByTestId('completeness-score')).not.toBeInTheDocument()
    expect(screen.queryByTestId('missing-fields-hint')).not.toBeInTheDocument()
  })

  it('shows completeness bar when hasRichNotes is false (default)', () => {
    render(<StudentProfileSummary student={BASE_STUDENT} hasRichNotes={false} />)
    expect(screen.getByTestId('completeness-bar')).toBeInTheDocument()
    expect(screen.getByTestId('completeness-score')).toBeInTheDocument()
  })
})
