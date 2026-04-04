import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { StudentProfileOverview } from './StudentProfileOverview'
import { parseNotes } from './studentNoteUtils'
import type { Student } from '@/api/students'

const BASE_STUDENT: Student = {
  id: 'student-1',
  name: 'Ana Garcia',
  learningLanguage: 'Spanish',
  cefrLevel: 'B1',
  interests: [],
  notes: null,
  nativeLanguage: null,
  learningGoals: [],
  weaknesses: [],
  difficulties: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function renderOverview(student: Partial<Student> = {}) {
  return render(
    <MemoryRouter>
      <StudentProfileOverview student={{ ...BASE_STUDENT, ...student }} />
    </MemoryRouter>
  )
}

describe('parseNotes', () => {
  it('returns null for null input', () => {
    expect(parseNotes(null)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseNotes('')).toBeNull()
  })

  it('strips Excel import prefix', () => {
    const result = parseNotes('[Excel import 2026-01-15] Some notes here')
    expect(result).not.toBeNull()
    expect(result!.sections[0].text).toBe('Some notes here')
  })

  it('returns null after stripping if nothing remains', () => {
    expect(parseNotes('[Excel import 2026-01-15] ')).toBeNull()
  })

  it('parses Preply test and Student info as subsections', () => {
    const raw = 'Preply test: B1 level assessment. Student info: Works as an engineer.'
    const result = parseNotes(raw)
    expect(result).not.toBeNull()
    const labels = result!.sections.map(s => s.label)
    expect(labels).toContain('Assessment notes')
    expect(labels).toContain('Background')
    const assessment = result!.sections.find(s => s.label === 'Assessment notes')!
    expect(assessment.text).toContain('B1 level assessment')
    const background = result!.sections.find(s => s.label === 'Background')!
    expect(background.text).toContain('Works as an engineer')
  })

  it('parses combined import prefix + subsections', () => {
    const raw = '[Excel import 2026-03-01] Preply test: Good grammar. Student info: Teacher by profession.'
    const result = parseNotes(raw)
    expect(result).not.toBeNull()
    const labels = result!.sections.map(s => s.label)
    expect(labels).toContain('Assessment notes')
    expect(labels).toContain('Background')
  })

  it('parses subsections when Student info appears before Preply test', () => {
    const raw = 'Student info: Works as an engineer. Preply test: B1 level.'
    const result = parseNotes(raw)
    expect(result).not.toBeNull()
    const labels = result!.sections.map(s => s.label)
    expect(labels).toContain('Assessment notes')
    expect(labels).toContain('Background')
    const assessment = result!.sections.find(s => s.label === 'Assessment notes')!
    expect(assessment.text).toContain('B1 level')
    const background = result!.sections.find(s => s.label === 'Background')!
    expect(background.text).toContain('Works as an engineer')
  })

  it('returns plain notes without subsection labels for normal text', () => {
    const result = parseNotes('This is a plain note.')
    expect(result).not.toBeNull()
    expect(result!.sections).toHaveLength(1)
    expect(result!.sections[0].label).toBe('')
    expect(result!.sections[0].text).toBe('This is a plain note.')
  })
})

describe('StudentProfileOverview', () => {
  it('renders "Teaching Context" card title', () => {
    renderOverview()
    expect(screen.getByText('Teaching Context')).toBeInTheDocument()
  })

  it('shows "Not specified" when native language is null', () => {
    renderOverview({ nativeLanguage: null })
    expect(screen.getByTestId('overview-native-language')).toHaveTextContent('Not specified')
  })

  it('shows native language when set', () => {
    renderOverview({ nativeLanguage: 'Portuguese' })
    expect(screen.getByTestId('overview-native-language')).toHaveTextContent('Portuguese')
  })

  it('renders learning goals as chips', () => {
    renderOverview({ learningGoals: ['Travel', 'Work'] })
    expect(screen.getByText('Travel')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
  })

  it('shows "None specified" for empty learning goals', () => {
    renderOverview({ learningGoals: [] })
    expect(screen.getAllByText('None specified').length).toBeGreaterThan(0)
  })

  it('renders interests as chips', () => {
    renderOverview({ interests: ['Cooking', 'Music'] })
    expect(screen.getByText('Cooking')).toBeInTheDocument()
    expect(screen.getByText('Music')).toBeInTheDocument()
  })

  it('renders weaknesses as chips', () => {
    renderOverview({ weaknesses: ['Ser/Estar'] })
    expect(screen.getByText('Ser/Estar')).toBeInTheDocument()
  })

  it('renders notes stripping Excel import prefix', () => {
    renderOverview({ notes: '[Excel import 2026-03-01] Has great pronunciation.' })
    expect(screen.getByTestId('overview-notes')).toHaveTextContent('Has great pronunciation.')
    expect(screen.queryByText(/Excel import/)).not.toBeInTheDocument()
  })

  it('renders Preply/Student info as labeled subsections', () => {
    renderOverview({ notes: 'Preply test: B1 score. Student info: Engineer background.' })
    expect(screen.getByText('Assessment notes')).toBeInTheDocument()
    expect(screen.getByText('Background')).toBeInTheDocument()
  })

  it('does not render notes section when notes is null', () => {
    renderOverview({ notes: null })
    expect(screen.queryByTestId('overview-notes')).not.toBeInTheDocument()
  })

  it('renders Edit profile link to edit URL', () => {
    renderOverview()
    const link = screen.getByTestId('edit-profile-link')
    expect(link).toHaveAttribute('href', '/students/student-1/edit')
  })

  it('renders difficulties with category and severity badges', () => {
    renderOverview({
      difficulties: [{
        id: 'd1',
        category: 'Grammar',
        item: 'Ser/estar confusion',
        severity: 'High',
        trend: 'Stable',
      }],
    })
    expect(screen.getByText('Ser/estar confusion')).toBeInTheDocument()
    expect(screen.getByText('Grammar')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
  })
})
