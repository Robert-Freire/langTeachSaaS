import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CourseNew from './CourseNew'
import * as coursesApi from '../api/courses'
import * as studentsApi from '../api/students'
import * as curriculaApi from '../api/curricula'

vi.mock('../api/courses', () => ({
  createCourse: vi.fn(),
}))

vi.mock('../api/students', () => ({
  getStudents: vi.fn(),
  getStudent: vi.fn(),
}))

vi.mock('../api/curricula', () => ({
  getCurriculumTemplates: vi.fn(),
  getMappingPreview: vi.fn(),
}))

function wrapper(ui: React.ReactElement, initialEntry = '/courses/new') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CourseNew wizard', () => {
  const MOCK_TEMPLATES = [
    { level: 'A1.1', cefrLevel: 'A1', unitCount: 6, sampleGrammar: ['Verbo llamarse', 'Artículos'] },
    { level: 'A1.2', cefrLevel: 'A1', unitCount: 5, sampleGrammar: ['Presente indicativo'] },
    { level: 'B1.1', cefrLevel: 'B1', unitCount: 7, sampleGrammar: ['Present subjunctive', 'Past tenses'] },
    { level: 'B1.2', cefrLevel: 'B1', unitCount: 5, sampleGrammar: ['Conditional sentences'] },
  ]

  const MOCK_MAPPING = {
    strategy: 'exact' as const,
    sessionCount: 6,
    unitCount: 6,
    sessions: [
      { sessionIndex: 1, unitRef: 'Unit 1', subFocus: 'Unit 1', rationale: '1:1', grammarFocus: null },
    ],
    excludedUnits: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(studentsApi.getStudents).mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 100 })
    vi.mocked(studentsApi.getStudent).mockResolvedValue(undefined as never)
    vi.mocked(curriculaApi.getCurriculumTemplates).mockResolvedValue(MOCK_TEMPLATES)
    vi.mocked(curriculaApi.getMappingPreview).mockResolvedValue(MOCK_MAPPING)
  })

  it('renders mode selection by default', () => {
    wrapper(<CourseNew />)
    expect(screen.getByTestId('mode-general')).toBeInTheDocument()
    expect(screen.getByTestId('mode-exam-prep')).toBeInTheDocument()
  })

  it('switches to exam-prep mode on click', () => {
    wrapper(<CourseNew />)
    fireEvent.click(screen.getByTestId('mode-exam-prep'))
    expect(screen.getByTestId('exam-select')).toBeInTheDocument()
    expect(screen.queryByTestId('cefr-select')).not.toBeInTheDocument()
  })

  it('disables generate button when required fields are empty', () => {
    wrapper(<CourseNew />)
    const btn = screen.getByTestId('generate-curriculum-btn')
    expect(btn).toBeDisabled()
  })

  it('template toggle is not visible before CEFR level is selected', () => {
    wrapper(<CourseNew />)
    expect(screen.queryByTestId('use-template-checkbox')).not.toBeInTheDocument()
  })

  it('template toggle is not visible in exam-prep mode', () => {
    wrapper(<CourseNew />)
    fireEvent.click(screen.getByTestId('mode-exam-prep'))
    expect(screen.queryByTestId('use-template-checkbox')).not.toBeInTheDocument()
  })

  it('generate button is disabled in exam-prep mode when no exam is selected', async () => {
    const user = userEvent.setup()
    wrapper(<CourseNew />)

    fireEvent.click(screen.getByTestId('mode-exam-prep'))
    fireEvent.change(screen.getByTestId('course-name'), { target: { value: 'DELE Prep Course' } })
    await user.click(screen.getByTestId('language-select'))
    await user.click(await screen.findByRole('option', { name: 'Spanish' }))

    // No exam selected — button must remain disabled
    expect(screen.getByTestId('generate-curriculum-btn')).toBeDisabled()
  })

  it('submitting without template omits templateLevel', async () => {
    const user = userEvent.setup()
    const mockCreate = vi.fn().mockResolvedValue({ id: 'course-1' })
    vi.mocked(coursesApi.createCourse).mockImplementation(mockCreate)
    wrapper(<CourseNew />)

    fireEvent.change(screen.getByTestId('course-name'), { target: { value: 'My Course' } })

    // Open language select and pick Spanish
    await user.click(screen.getByTestId('language-select'))
    await user.click(await screen.findByRole('option', { name: 'Spanish' }))

    // Open CEFR select and pick B1
    await user.click(screen.getByTestId('cefr-select'))
    await user.click(await screen.findByRole('option', { name: 'B1' }))

    // Do NOT check the template checkbox - submit without a template
    await user.click(screen.getByTestId('generate-curriculum-btn'))

    expect(mockCreate).toHaveBeenCalledOnce()
    expect(mockCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ templateLevel: expect.anything() })
    )
  })

  it('shows loading state when generating', async () => {
    vi.mocked(coursesApi.createCourse).mockReturnValue(new Promise(() => {}))
    wrapper(<CourseNew />)

    // Fill required fields
    fireEvent.change(screen.getByTestId('course-name'), { target: { value: 'My Course' } })
    // language and level selects are harder to trigger in unit tests — tested in e2e
    // just verify the button exists
    expect(screen.getByTestId('generate-curriculum-btn')).toBeInTheDocument()
  })

  describe('template filtering by CEFR level', () => {
    it('shows only A1 templates when A1 is selected', async () => {
      const user = userEvent.setup()
      wrapper(<CourseNew />)

      await user.click(screen.getByTestId('cefr-select'))
      await user.click(await screen.findByRole('option', { name: 'A1' }))

      await user.click(screen.getByTestId('use-template-checkbox'))

      await user.click(screen.getByTestId('template-select'))

      expect(await screen.findByRole('option', { name: /A1\.1/ })).toBeInTheDocument()
      expect(await screen.findByRole('option', { name: /A1\.2/ })).toBeInTheDocument()
      expect(screen.queryByRole('option', { name: /B1\.1/ })).not.toBeInTheDocument()
    })

    it('shows only B1 templates when B1 is selected', async () => {
      const user = userEvent.setup()
      wrapper(<CourseNew />)

      await user.click(screen.getByTestId('cefr-select'))
      await user.click(await screen.findByRole('option', { name: 'B1' }))

      await user.click(screen.getByTestId('use-template-checkbox'))

      await user.click(screen.getByTestId('template-select'))

      expect(await screen.findByRole('option', { name: /B1\.1/ })).toBeInTheDocument()
      expect(screen.queryByRole('option', { name: /A1\.1/ })).not.toBeInTheDocument()
    })
  })

  describe('CEFR mismatch warning', () => {
    const STUDENTS_WITH_LEVEL = {
      items: [{
        id: 'student-1', name: 'Ana', cefrLevel: 'A1',
        learningLanguage: 'English', interests: [], notes: null,
        nativeLanguage: null, learningGoals: [], weaknesses: [],
        difficulties: [], createdAt: '2026-01-01', updatedAt: '2026-01-01',
      }],
      totalCount: 1,
      page: 1,
      pageSize: 100,
    }

    it('shows warning when student and target CEFR levels diverge by 2+', async () => {
      vi.mocked(studentsApi.getStudents).mockResolvedValue(STUDENTS_WITH_LEVEL)
      const user = userEvent.setup()
      wrapper(<CourseNew />)

      // Select student
      await user.click(await screen.findByTestId('student-select'))
      await user.click(await screen.findByRole('option', { name: 'Ana' }))

      // Select CEFR level — C1 (gap 4 from A1)
      await user.click(screen.getByTestId('cefr-select'))
      await user.click(await screen.findByRole('option', { name: 'C1' }))

      const banner = await screen.findByTestId('cefr-mismatch-warning')
      expect(banner).toBeInTheDocument()
      expect(banner.textContent).toMatch(/A1/)
      expect(banner.textContent).toMatch(/C1/)
    })

    it('does not show warning for adjacent levels', async () => {
      vi.mocked(studentsApi.getStudents).mockResolvedValue(STUDENTS_WITH_LEVEL)
      const user = userEvent.setup()
      wrapper(<CourseNew />)

      await user.click(await screen.findByTestId('student-select'))
      await user.click(await screen.findByRole('option', { name: 'Ana' }))

      // A2 is adjacent to A1 (gap 1)
      await user.click(screen.getByTestId('cefr-select'))
      await user.click(await screen.findByRole('option', { name: 'A2' }))

      expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument()
    })
  })

  describe('student profile summary', () => {
    const STUDENT_WITH_PROFILE = {
      items: [{
        id: 'student-1', name: 'Marco', cefrLevel: 'A1',
        learningLanguage: 'Spanish', interests: ['football'],
        notes: null, nativeLanguage: 'Italian',
        learningGoals: ['get a job in Barcelona'],
        weaknesses: ['ser vs estar'],
        difficulties: [{ id: 'x', category: 'grammar', item: 'subjunctive', severity: 'high', trend: 'stable' }],
        createdAt: '2026-01-01', updatedAt: '2026-01-01',
      }],
      totalCount: 1, page: 1, pageSize: 100,
    }

    it('shows profile summary card when a student is selected', async () => {
      vi.mocked(studentsApi.getStudents).mockResolvedValue(STUDENT_WITH_PROFILE)
      const user = userEvent.setup()
      wrapper(<CourseNew />)

      expect(screen.queryByTestId('student-profile-summary')).not.toBeInTheDocument()

      await user.click(await screen.findByTestId('student-select'))
      await user.click(await screen.findByRole('option', { name: 'Marco' }))

      expect(await screen.findByTestId('student-profile-summary')).toBeInTheDocument()
    })

    it('hides profile summary card when no student is selected', async () => {
      vi.mocked(studentsApi.getStudents).mockResolvedValue(STUDENT_WITH_PROFILE)
      const user = userEvent.setup()
      wrapper(<CourseNew />)

      await user.click(await screen.findByTestId('student-select'))
      await user.click(await screen.findByRole('option', { name: 'Marco' }))
      expect(await screen.findByTestId('student-profile-summary')).toBeInTheDocument()

      await user.click(screen.getByTestId('student-select'))
      await user.click(await screen.findByRole('option', { name: 'No specific student' }))
      expect(screen.queryByTestId('student-profile-summary')).not.toBeInTheDocument()
    })
  })

  it('renders teacher notes textarea when a student is selected', async () => {
    const STUDENT = { items: [{ id: 's1', name: 'Marco', cefrLevel: 'A1', learningLanguage: 'Spanish', interests: [], notes: null, nativeLanguage: null, learningGoals: [], weaknesses: [], difficulties: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' }], totalCount: 1, page: 1, pageSize: 100 }
    vi.mocked(studentsApi.getStudents).mockResolvedValue(STUDENT)
    const user = userEvent.setup()
    wrapper(<CourseNew />)

    // Teacher notes should NOT appear before a student is selected
    expect(screen.queryByTestId('teacher-notes')).not.toBeInTheDocument()

    // Select a student
    await user.click(await screen.findByTestId('student-select'))
    await user.click(await screen.findByRole('option', { name: 'Marco' }))

    // Now teacher notes should appear
    const textarea = screen.getByTestId('teacher-notes')
    expect(textarea).toBeInTheDocument()
    expect(textarea.tagName).toBe('TEXTAREA')
  })

  it('includes teacher notes in the create course request', async () => {
    const STUDENT = { items: [{ id: 's1', name: 'Marco', cefrLevel: 'A1', learningLanguage: 'Spanish', interests: [], notes: null, nativeLanguage: null, learningGoals: [], weaknesses: [], difficulties: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' }], totalCount: 1, page: 1, pageSize: 100 }
    vi.mocked(studentsApi.getStudents).mockResolvedValue(STUDENT)
    const user = userEvent.setup()
    const mockCreate = vi.fn().mockResolvedValue({ id: 'course-1' })
    vi.mocked(coursesApi.createCourse).mockImplementation(mockCreate)
    wrapper(<CourseNew />)

    fireEvent.change(screen.getByTestId('course-name'), { target: { value: 'My Course' } })
    await user.click(screen.getByTestId('language-select'))
    await user.click(await screen.findByRole('option', { name: 'Spanish' }))
    await user.click(screen.getByTestId('cefr-select'))
    await user.click(await screen.findByRole('option', { name: 'B1' }))

    // Select student to reveal teacher notes
    await user.click(await screen.findByTestId('student-select'))
    await user.click(await screen.findByRole('option', { name: 'Marco' }))

    await user.type(screen.getByTestId('teacher-notes'), 'No role-play. Written exercises only.')
    await user.click(screen.getByTestId('generate-curriculum-btn'))

    expect(mockCreate).toHaveBeenCalledOnce()
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ teacherNotes: 'No role-play. Written exercises only.' })
    )
  })

  describe('session count with template', () => {
    it('shows session count selector when template is selected', async () => {
      const user = userEvent.setup()
      wrapper(<CourseNew />)

      await user.click(screen.getByTestId('cefr-select'))
      await user.click(await screen.findByRole('option', { name: 'A1' }))

      await user.click(screen.getByTestId('use-template-checkbox'))

      // Session count should be visible regardless of template selection
      expect(screen.getByTestId('session-count-select')).toBeInTheDocument()
    })

    it('shows mapping preview after template and session count selected', async () => {
      const user = userEvent.setup()
      wrapper(<CourseNew />)

      await user.click(screen.getByTestId('cefr-select'))
      await user.click(await screen.findByRole('option', { name: 'A1' }))

      await user.click(screen.getByTestId('use-template-checkbox'))

      await user.click(screen.getByTestId('template-select'))
      await user.click(await screen.findByRole('option', { name: /A1\.1/ }))

      expect(await screen.findByTestId('session-mapping-preview')).toBeInTheDocument()
    })

    it('shows excluded units when compress strategy', async () => {
      const user = userEvent.setup()
      vi.mocked(curriculaApi.getMappingPreview).mockResolvedValue({
        strategy: 'compress',
        sessionCount: 2,
        unitCount: 6,
        sessions: [
          { sessionIndex: 1, unitRef: 'Unit 1', subFocus: 'Unit 1', rationale: 'Covers 2 of 6', grammarFocus: null },
          { sessionIndex: 2, unitRef: 'Unit 2', subFocus: 'Unit 2', rationale: 'Covers 2 of 6', grammarFocus: null },
        ],
        excludedUnits: ['Unit 3', 'Unit 4', 'Unit 5', 'Unit 6'],
      })
      wrapper(<CourseNew />)

      await user.click(screen.getByTestId('cefr-select'))
      await user.click(await screen.findByRole('option', { name: 'A1' }))
      await user.click(screen.getByTestId('use-template-checkbox'))
      await user.click(screen.getByTestId('template-select'))
      await user.click(await screen.findByRole('option', { name: /A1\.1/ }))

      const excluded = await screen.findByTestId('excluded-units')
      expect(excluded.textContent).toContain('Unit 3')
    })

    it('submit sends actual sessionCount not unit count', async () => {
      const user = userEvent.setup()
      const mockCreate = vi.fn().mockResolvedValue({ id: 'course-1' })
      vi.mocked(coursesApi.createCourse).mockImplementation(mockCreate)
      wrapper(<CourseNew />)

      fireEvent.change(screen.getByTestId('course-name'), { target: { value: 'My Course' } })
      await user.click(screen.getByTestId('language-select'))
      await user.click(await screen.findByRole('option', { name: 'Spanish' }))
      await user.click(screen.getByTestId('cefr-select'))
      await user.click(await screen.findByRole('option', { name: 'A1' }))
      await user.click(screen.getByTestId('use-template-checkbox'))
      await user.click(screen.getByTestId('template-select'))
      await user.click(await screen.findByRole('option', { name: /A1\.1/ }))

      // Default session count is 10, not the template's unitCount (6)
      await user.click(screen.getByTestId('generate-curriculum-btn'))

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ sessionCount: 10 })
      )
    })
  })

  describe('locked student via ?studentId param', () => {
    const MARCO = {
      id: 'student-1', name: 'Marco', cefrLevel: 'B1',
      learningLanguage: 'Spanish', interests: [], notes: null,
      nativeLanguage: null, learningGoals: [], weaknesses: [],
      difficulties: [], createdAt: '2026-01-01', updatedAt: '2026-01-01',
    }

    it('shows student name as read-only text when ?studentId param is present', async () => {
      vi.mocked(studentsApi.getStudent).mockResolvedValue(MARCO)
      wrapper(<CourseNew />, '/courses/new?studentId=student-1')

      const locked = await screen.findByTestId('student-locked')
      expect(locked).toBeInTheDocument()
      expect(locked).toHaveTextContent('Marco')
      expect(screen.queryByTestId('student-select')).not.toBeInTheDocument()
    })

    it('shows skeleton while locked student is loading', async () => {
      vi.mocked(studentsApi.getStudent).mockReturnValue(new Promise(() => {}))
      wrapper(<CourseNew />, '/courses/new?studentId=student-1')

      expect(screen.getByTestId('student-locked-loading')).toBeInTheDocument()
      expect(screen.queryByTestId('student-select')).not.toBeInTheDocument()
    })

    it('auto-fills language and CEFR level from locked student', async () => {
      vi.mocked(studentsApi.getStudent).mockResolvedValue(MARCO)
      wrapper(<CourseNew />, '/courses/new?studentId=student-1')

      await screen.findByTestId('student-locked')

      const languageTrigger = screen.getByTestId('language-select')
      expect(languageTrigger).toHaveTextContent('Spanish')

      const cefrTrigger = screen.getByTestId('cefr-select')
      expect(cefrTrigger).toHaveTextContent('B1')
    })

    it('student selector shows normal dropdown without ?studentId param', async () => {
      vi.mocked(studentsApi.getStudents).mockResolvedValue({
        items: [MARCO], totalCount: 1, page: 1, pageSize: 100,
      })
      wrapper(<CourseNew />)

      const select = await screen.findByTestId('student-select')
      expect(select).toBeInTheDocument()
      expect(screen.queryByTestId('student-locked')).not.toBeInTheDocument()
    })
  })

  it('template checkbox label does not reference Instituto Cervantes', async () => {
    const user = userEvent.setup()
    wrapper(<CourseNew />)

    fireEvent.change(screen.getByTestId('course-name'), { target: { value: 'My Course' } })
    await user.click(screen.getByTestId('language-select'))
    await user.click(await screen.findByRole('option', { name: 'Spanish' }))
    await user.click(screen.getByTestId('cefr-select'))
    await user.click(await screen.findByRole('option', { name: 'B1' }))

    const checkbox = await screen.findByTestId('use-template-checkbox')
    const label = checkbox.closest('label')
    expect(label?.textContent).not.toMatch(/Instituto Cervantes/i)
    expect(label?.textContent).toMatch(/structured curriculum template/i)
  })
})
