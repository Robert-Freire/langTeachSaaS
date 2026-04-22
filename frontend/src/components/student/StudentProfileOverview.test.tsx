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
  personalNotes: null, teachingNotes: null,
  nativeLanguages: [],
  learningGoals: [],
  weaknesses: [],
  difficulties: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  birthYear: null, profession: null, countryOfOrigin: null, cityOfOrigin: null,
  countryOfResidence: null, cityOfResidence: null, reasonForStudying: null,
  officialCefrLevel: null, shortTermObjectives: [], isActive: true, isCorporate: false,
  rate: null, spokenLanguages: [], teachingTodos: [], skillLevelOverrides: {},
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
  it('renders "Pedagogical Profile" card title', () => {
    renderOverview()
    expect(screen.getByText('Pedagogical Profile')).toBeInTheDocument()
  })

  it('does not show native language section when empty', () => {
    renderOverview({ nativeLanguages: [] })
    expect(screen.queryByTestId('overview-native-language')).not.toBeInTheDocument()
  })

  it('shows native language tags with code badge when set', () => {
    renderOverview({ nativeLanguages: ['Portuguese'] })
    const el = screen.getByTestId('overview-native-language')
    expect(el).toHaveTextContent('Portuguese')
    expect(el).toHaveTextContent('PT')
  })

  it('shows skill bars when overrides are set', () => {
    renderOverview({ skillLevelOverrides: { Reading: 'B1', Writing: 'A2' } })
    const bars = screen.getByTestId('overview-skill-bars')
    expect(bars).toHaveTextContent('Reading')
    expect(bars).toHaveTextContent('B1')
    expect(bars).toHaveTextContent('Writing')
    expect(bars).toHaveTextContent('A2')
  })

  it('does not show skill bars section when no overrides', () => {
    renderOverview({ skillLevelOverrides: {} })
    expect(screen.queryByTestId('overview-skill-bars')).not.toBeInTheDocument()
  })

  it('renders learning goals as chips', () => {
    renderOverview({ learningGoals: [{ id: '1', text: 'Travel', children: [] }, { id: '2', text: 'Work', children: [] }] })
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

  it('renders weaknesses as chips with type', () => {
    renderOverview({ weaknesses: [{ description: 'Ser/Estar', weaknessType: 'grammatical' }] })
    expect(screen.getByText('Ser/Estar')).toBeInTheDocument()
    expect(screen.getByText('(grammatical)')).toBeInTheDocument()
  })

  it('renders personal notes stripping Excel import prefix', () => {
    renderOverview({ personalNotes: '[Excel import 2026-03-01] Has great pronunciation.' })
    expect(screen.getByTestId('overview-personal-notes')).toHaveTextContent('Has great pronunciation.')
    expect(screen.queryByText(/Excel import/)).not.toBeInTheDocument()
  })

  it('renders Preply/Student info as labeled subsections in personal notes', () => {
    renderOverview({ personalNotes: 'Preply test: B1 score. Student info: Engineer background.' })
    expect(screen.getByText('Assessment notes')).toBeInTheDocument()
    expect(screen.getByText('Background')).toBeInTheDocument()
  })

  it('renders teaching notes when set', () => {
    renderOverview({ teachingNotes: 'Works well with inductive methods.' })
    expect(screen.getByTestId('overview-teaching-notes')).toHaveTextContent('Works well with inductive methods.')
  })

  it('does not render notes sections when both are null', () => {
    renderOverview({ personalNotes: null, teachingNotes: null })
    expect(screen.queryByTestId('overview-personal-notes')).not.toBeInTheDocument()
    expect(screen.queryByTestId('overview-teaching-notes')).not.toBeInTheDocument()
  })


  it('renders difficulties with competency and severity badges', () => {
    renderOverview({
      difficulties: [{
        id: 'd1',
        description: 'Ser/estar confusion',
        competency: 'Grammar',
        subcategory: '',
        severity: 'high',
        trend: 'stable',
        status: 'Active',
      }],
    })
    expect(screen.getByText('Ser/estar confusion')).toBeInTheDocument()
    expect(screen.getByText('Grammar')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
  })
})
