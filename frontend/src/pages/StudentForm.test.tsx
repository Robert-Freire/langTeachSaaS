import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import StudentForm from './StudentForm'

vi.mock('../api/followups', () => ({
  getFollowups: vi.fn().mockResolvedValue([]),
  createFollowup: vi.fn(),
  updateFollowupStatus: vi.fn(),
}))

const mockGetStudent = vi.fn()
const mockCreateStudent = vi.fn()
const mockUpdateStudent = vi.fn()
const mockGetStudents = vi.fn()

const mockDeleteStudent = vi.fn()

vi.mock('../api/students', () => ({
  getStudent: (...args: unknown[]) => mockGetStudent(...args),
  createStudent: (...args: unknown[]) => mockCreateStudent(...args),
  updateStudent: (...args: unknown[]) => mockUpdateStudent(...args),
  deleteStudent: (...args: unknown[]) => mockDeleteStudent(...args),
  getStudents: (...args: unknown[]) => mockGetStudents(...args),
  appendTeachingTodo: vi.fn(),
  updateTeachingTodo: vi.fn(),
  deleteTeachingTodo: vi.fn(),
}))

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

vi.mock('../components/student/StudentCoursesCard', () => ({
  StudentCoursesCard: () => <div data-testid="student-courses-card" />,
}))

vi.mock('../components/student/LessonHistoryCard', () => ({
  LessonHistoryCard: () => <div data-testid="lesson-history-card" />,
}))

vi.mock('@/api/followups', () => ({
  getFollowups: vi.fn().mockResolvedValue([]),
  createFollowup: vi.fn(),
  updateFollowupStatus: vi.fn(),
  deleteFollowup: vi.fn(),
}))

vi.mock('../lib/studentOptions', () => ({
  COMPETENCY_OPTIONS: [
    { value: 'Grammar', label: 'Grammar' },
    { value: 'Pronunciation', label: 'Pronunciation' },
  ],
  SEVERITY_LEVELS: [
    { value: 'low', label: 'Low' },
    { value: 'high', label: 'High' },
  ],
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderNew() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/students/new']}>
        <Routes>
          <Route path="/students/new" element={<StudentForm />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderEdit() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/students/stu-1/edit']}>
        <Routes>
          <Route path="/students/:id/edit" element={<StudentForm />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('StudentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStudent.mockResolvedValue({
      id: 'stu-1', name: 'Ana', learningLanguage: 'Spanish', cefrLevel: 'B1',
      interests: [], nativeLanguages: [], learningGoals: [],
      weaknesses: [] as { description: string; weaknessType: string }[],
      difficulties: [], personalNotes: null, teachingNotes: null,
      shortTermObjectives: [], spokenLanguages: [], teachingTodos: [],
      birthYear: null, profession: null, countryOfOrigin: null, cityOfOrigin: null,
      countryOfResidence: null, cityOfResidence: null, reasonForStudying: null,
      officialCefrLevel: null, isActive: true, isCorporate: false, rate: null,
      skillLevelOverrides: {}, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    })
    mockGetStudents.mockResolvedValue({ items: [], totalCount: 0 })
    mockCreateStudent.mockResolvedValue({ id: 'new-id' })
    mockUpdateStudent.mockResolvedValue({ id: 'stu-1' })
    mockDeleteStudent.mockResolvedValue(undefined)
  })

  it('renders Back link to students list', () => {
    renderNew()
    const back = screen.getByTestId('page-header-back')
    expect(back).toHaveAttribute('href', '/students')
    expect(back).toHaveTextContent('Students')
  })

  it('shows Teaching Goals and Difficulties sections instead of a combined Teaching Context', () => {
    renderNew()
    expect(screen.getByText('Teaching Goals')).toBeInTheDocument()
    expect(screen.getByText('Difficulties')).toBeInTheDocument()
    expect(screen.queryByText('Teaching Context')).not.toBeInTheDocument()
    expect(screen.queryByText('AI Personalization')).not.toBeInTheDocument()
  })

  it('does not render lesson history card in edit form', async () => {
    renderEdit()
    await screen.findByText('Edit Student')
    expect(screen.queryByTestId('lesson-history-card')).not.toBeInTheDocument()
  })

  it('renders Save and Cancel buttons in header for new student', () => {
    renderNew()
    expect(screen.getByRole('heading', { name: 'Add Student' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Student' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('shows Edit Student title in edit mode', async () => {
    renderEdit()
    expect(await screen.findByRole('heading', { name: 'Edit Student' })).toBeInTheDocument()
  })

  it('edit mode does not render Save Profile button', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    expect(screen.queryByRole('button', { name: 'Save Profile' })).not.toBeInTheDocument()
  })

  it('edit mode renders Done button and autosave status indicator', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    expect(screen.getByTestId('done-btn')).toBeInTheDocument()
    expect(screen.getByTestId('autosave-status')).toBeInTheDocument()
  })

  it('breadcrumb in edit mode points to student detail', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    const back = screen.getByTestId('page-header-back')
    expect(back).toHaveAttribute('href', '/students/stu-1')
  })

  it('Save button has form attribute pointing to student-form', () => {
    renderNew()
    const saveBtn = screen.getByRole('button', { name: 'Save Student' })
    expect(saveBtn).toHaveAttribute('form', 'student-form')
  })

  it('Cancel navigates to /students', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderNew()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mockNavigate).toHaveBeenCalledWith('/students')
  })

  it('after creating a student, redirects to student profile page', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderNew()

    await user.type(screen.getByTestId('student-name'), 'New Student')
    await user.click(screen.getByTestId('student-language'))
    await user.click(await screen.findByRole('option', { name: 'Spanish' }))
    await user.click(screen.getByTestId('student-cefr'))
    await user.click(await screen.findByRole('option', { name: 'B1' }))
    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/students/new-id')
    })
  })

  it('after updating a student, Done button navigates to student profile page', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderEdit()

    await screen.findByRole('heading', { name: 'Edit Student' })
    await user.click(screen.getByTestId('done-btn'))

    expect(mockNavigate).toHaveBeenCalledWith('/students/stu-1')
  })

  it('shows "Student not found" when getStudent rejects', async () => {
    mockGetStudent.mockRejectedValue(new Error('Not found'))
    renderEdit()
    expect(await screen.findByText(/Student not found/)).toBeInTheDocument()
  })

  it('"Go back" button navigates to /students on not-found', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mockGetStudent.mockRejectedValue(new Error('Not found'))
    renderEdit()
    const goBack = await screen.findByRole('button', { name: 'Go back' })
    await user.click(goBack)
    expect(mockNavigate).toHaveBeenCalledWith('/students')
  })

  it('renders Add Difficulty button on new student form', () => {
    renderNew()
    expect(screen.getByTestId('add-difficulty')).toBeInTheDocument()
  })

  it('shows empty state text when no difficulties exist', () => {
    renderNew()
    expect(screen.getByText('No specific difficulties tracked yet.')).toBeInTheDocument()
  })

  it('adds a difficulty row when clicking Add button', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderNew()

    expect(screen.queryAllByTestId('difficulty-row')).toHaveLength(0)

    await user.click(screen.getByTestId('add-difficulty'))

    expect(screen.getAllByTestId('difficulty-row')).toHaveLength(1)
    expect(screen.queryByText('No specific difficulties tracked yet.')).not.toBeInTheDocument()
  })

  it('removes a difficulty row when clicking remove button', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderNew()

    await user.click(screen.getByTestId('add-difficulty'))
    expect(screen.getAllByTestId('difficulty-row')).toHaveLength(1)

    await user.click(screen.getByTestId('remove-difficulty'))
    expect(screen.queryAllByTestId('difficulty-row')).toHaveLength(0)
  })

  it('renders existing difficulties in edit mode', async () => {
    mockGetStudent.mockResolvedValue({
      id: 'stu-1',
      name: 'Ana',
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      nativeLanguages: [],
      learningGoals: [],
      weaknesses: [],
      difficulties: [
        { id: 'd1', description: 'Confuses ser/estar', competency: 'Grammar', subcategory: 'ser/estar', severity: 'high', trend: 'stable', status: 'Active' },
        { id: 'd2', description: 'Difficulty with rolled r', competency: 'Pronunciation', subcategory: '/r/', severity: 'low', trend: 'stable', status: 'Active' },
      ],
      personalNotes: null, teachingNotes: null,
    })

    renderEdit()

    const rows = await screen.findAllByTestId('difficulty-row')
    expect(rows).toHaveLength(2)

    const items = screen.getAllByTestId('difficulty-description')
    expect(items[0]).toHaveValue('Confuses ser/estar')
    expect(items[1]).toHaveValue('Difficulty with rolled r')
  })

  it('adds a learning goal via tree editor', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderNew()

    await user.click(screen.getByTestId('learning-goal-add-btn'))
    await user.type(screen.getByTestId('learning-goal-top-input'), 'pass DELE B2')
    await user.keyboard('{Enter}')

    expect(screen.getByText('pass DELE B2')).toBeInTheDocument()
  })

  it('removes a learning goal via tree editor', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderNew()

    await user.click(screen.getByTestId('learning-goal-add-btn'))
    await user.type(screen.getByTestId('learning-goal-top-input'), 'custom goal')
    await user.keyboard('{Enter}')

    expect(screen.getByTestId('learning-goal-text')).toBeInTheDocument()

    await user.click(screen.getByTestId('learning-goal-delete-btn'))
    expect(screen.queryByTestId('learning-goal-item')).not.toBeInTheDocument()
  })

  it('displays learning goals in edit mode when loaded from server', async () => {
    mockGetStudent.mockResolvedValue({
      id: 'stu-1',
      name: 'Ana',
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      nativeLanguages: [],
      learningGoals: [
        { id: '1', text: 'travel', children: [] },
        { id: '2', text: 'pass DELE B2 exam', children: [] },
      ],
      weaknesses: [],
      difficulties: [],
      personalNotes: null, teachingNotes: null,
    })

    renderEdit()

    await expect(screen.findByText('travel')).resolves.toBeInTheDocument()
    expect(screen.getByText('pass DELE B2 exam')).toBeInTheDocument()
  })

  it('shows inline error for partial difficulty row (description only) and blocks save', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mockCreateStudent.mockResolvedValue({ id: 'new-id' })
    renderNew()

    // Fill required fields
    await user.type(screen.getByTestId('student-name'), 'Test Student')
    await user.click(screen.getByTestId('student-language'))
    await user.click(await screen.findByRole('option', { name: 'Spanish' }))
    await user.click(screen.getByTestId('student-cefr'))
    await user.click(await screen.findByRole('option', { name: 'B1' }))

    // Add a difficulty with only description filled
    await user.click(screen.getByTestId('add-difficulty'))
    await user.type(screen.getByTestId('difficulty-description'), 'test difficulty')

    // Submit
    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    // Should show inline error and not call createStudent
    expect(screen.getByTestId('difficulty-error')).toBeInTheDocument()
    expect(screen.getByTestId('difficulty-error')).toHaveTextContent('Both type and description are required')
    expect(mockCreateStudent).not.toHaveBeenCalled()
  }, 15000)

  it('shows inline error for partial difficulty row (competency only) and blocks save', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mockCreateStudent.mockResolvedValue({ id: 'new-id' })
    renderNew()

    await user.type(screen.getByTestId('student-name'), 'Test Student')
    await user.click(screen.getByTestId('student-language'))
    await user.click(await screen.findByRole('option', { name: 'Spanish' }))
    await user.click(screen.getByTestId('student-cefr'))
    await user.click(await screen.findByRole('option', { name: 'B1' }))

    // Add a difficulty with only competency filled
    await user.click(screen.getByTestId('add-difficulty'))
    await user.click(screen.getByTestId('difficulty-competency'))
    await user.click(await screen.findByRole('option', { name: /grammar/i }))

    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    expect(screen.getByTestId('difficulty-error')).toBeInTheDocument()
    expect(mockCreateStudent).not.toHaveBeenCalled()
  }, 15000)

  it('clears difficulty error when the row is completed', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mockCreateStudent.mockResolvedValue({ id: 'new-id' })
    renderNew()

    await user.type(screen.getByTestId('student-name'), 'Test Student')
    await user.click(screen.getByTestId('student-language'))
    await user.click(await screen.findByRole('option', { name: 'Spanish' }))
    await user.click(screen.getByTestId('student-cefr'))
    await user.click(await screen.findByRole('option', { name: 'B1' }))

    await user.click(screen.getByTestId('add-difficulty'))
    await user.type(screen.getByTestId('difficulty-description'), 'test difficulty')
    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    // Error appears
    expect(screen.getByTestId('difficulty-error')).toBeInTheDocument()

    // Select competency to complete the row => error clears
    await user.click(screen.getByTestId('difficulty-competency'))
    await user.click(await screen.findByRole('option', { name: /grammar/i }))

    expect(screen.queryByTestId('difficulty-error')).not.toBeInTheDocument()
  })

  it('clears difficulty error when the row is removed', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mockCreateStudent.mockResolvedValue({ id: 'new-id' })
    renderNew()

    await user.type(screen.getByTestId('student-name'), 'Test Student')
    await user.click(screen.getByTestId('student-language'))
    await user.click(await screen.findByRole('option', { name: 'Spanish' }))
    await user.click(screen.getByTestId('student-cefr'))
    await user.click(await screen.findByRole('option', { name: 'B1' }))

    await user.click(screen.getByTestId('add-difficulty'))
    await user.type(screen.getByTestId('difficulty-description'), 'test difficulty')
    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    expect(screen.getByTestId('difficulty-error')).toBeInTheDocument()

    await user.click(screen.getByTestId('remove-difficulty'))

    expect(screen.queryByTestId('difficulty-error')).not.toBeInTheDocument()
  })

  it('does not show error for fully empty difficulty row on save', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mockCreateStudent.mockResolvedValue({ id: 'new-id' })
    renderNew()

    await user.type(screen.getByTestId('student-name'), 'Test Student')
    await user.click(screen.getByTestId('student-language'))
    await user.click(await screen.findByRole('option', { name: 'Spanish' }))
    await user.click(screen.getByTestId('student-cefr'))
    await user.click(await screen.findByRole('option', { name: 'B1' }))

    // Add empty row, don't fill anything
    await user.click(screen.getByTestId('add-difficulty'))
    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    expect(screen.queryByTestId('difficulty-error')).not.toBeInTheDocument()
    expect(mockCreateStudent).toHaveBeenCalledWith(
      expect.objectContaining({ difficulties: [] }),
    )
  })

  it('adds a weakness row when clicking Add button', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderNew()

    expect(screen.queryAllByTestId('weakness-row')).toHaveLength(0)
    expect(screen.getByTestId('weaknesses-empty')).toBeInTheDocument()

    await user.click(screen.getByTestId('add-weakness'))

    expect(screen.getAllByTestId('weakness-row')).toHaveLength(1)
    expect(screen.queryByTestId('weaknesses-empty')).not.toBeInTheDocument()
  })

  it('removes a weakness row when clicking remove button', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderNew()

    await user.click(screen.getByTestId('add-weakness'))
    expect(screen.getAllByTestId('weakness-row')).toHaveLength(1)

    await user.click(screen.getByTestId('remove-weakness'))
    expect(screen.queryAllByTestId('weakness-row')).toHaveLength(0)
    expect(screen.getByTestId('weaknesses-empty')).toBeInTheDocument()
  })

  it('weakness rows are included in form submission with correct type', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mockCreateStudent.mockResolvedValue({ id: 'new-id' })
    renderNew()

    // Fill required fields
    await user.type(screen.getByTestId('student-name'), 'Test Student')
    await user.click(screen.getByTestId('student-language'))
    await user.click(await screen.findByRole('option', { name: 'Spanish' }))
    await user.click(screen.getByTestId('student-cefr'))
    await user.click(await screen.findByRole('option', { name: 'B1' }))

    // Add a weakness row and fill description, keeping default type (grammatical)
    await user.click(screen.getByTestId('add-weakness'))
    await user.type(screen.getByTestId('weakness-description'), 'Vocabulary gaps')

    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    expect(mockCreateStudent).toHaveBeenCalledWith(
      expect.objectContaining({
        weaknesses: [{ description: 'Vocabulary gaps', weaknessType: 'grammatical' }],
      }),
    )
  })

  it('existing weaknesses render as rows in edit mode', async () => {
    mockGetStudent.mockResolvedValue({
      id: 'stu-1',
      name: 'Ana',
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      nativeLanguages: [],
      learningGoals: [],
      weaknesses: [
        { description: 'ser/estar confusion', weaknessType: 'grammatical' },
        { description: 'limited travel vocabulary', weaknessType: 'lexical' },
      ],
      difficulties: [],
      personalNotes: null, teachingNotes: null,
    })

    renderEdit()

    const rows = await screen.findAllByTestId('weakness-row')
    expect(rows).toHaveLength(2)

    const descriptions = screen.getAllByTestId('weakness-description')
    expect(descriptions[0]).toHaveValue('ser/estar confusion')
    expect(descriptions[1]).toHaveValue('limited travel vocabulary')
  })

  it('shows "Create Course" button and navigates correctly for a complete profile in edit mode', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderEdit()
    const btn = await screen.findByTestId('create-course-btn')
    expect(btn).toBeInTheDocument()
    expect(btn).not.toBeDisabled()
    await user.click(btn)
    expect(mockNavigate).toHaveBeenCalledWith('/courses/new?studentId=stu-1')
  })

  it('loads all native languages in edit mode and displays them as chips', async () => {
    mockGetStudent.mockResolvedValue({
      id: 'stu-1',
      name: 'Ana',
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      nativeLanguages: ['Portuguese', 'English', 'Catalan'],
      learningGoals: [],
      weaknesses: [],
      difficulties: [],
      personalNotes: null, teachingNotes: null,
    })

    renderEdit()

    await screen.findByRole('heading', { name: 'Edit Student' })

    const chips = await screen.findAllByTestId('native-lang-chip')
    expect(chips).toHaveLength(3)
    expect(chips[0]).toHaveTextContent('Portuguese')
    expect(chips[1]).toHaveTextContent('English')
    expect(chips[2]).toHaveTextContent('Catalan')
  })

  it('"Create Course" button is disabled when student is missing CEFR level', async () => {
    mockGetStudent.mockResolvedValue({
      id: 'stu-1',
      name: 'Ana',
      learningLanguage: 'Spanish',
      cefrLevel: '',
      interests: [],
      nativeLanguages: [],
      learningGoals: [],
      weaknesses: [],
      difficulties: [],
      personalNotes: null, teachingNotes: null,
    })
    renderEdit()
    const btn = await screen.findByTestId('create-course-btn')
    expect(btn).toBeDisabled()
  })

  it('renders Personal Background section with all 6 identity fields', () => {
    renderNew()
    expect(screen.getByText('Personal Background')).toBeInTheDocument()
    expect(screen.getByTestId('student-birth-year')).toBeInTheDocument()
    expect(screen.getByTestId('student-profession')).toBeInTheDocument()
    expect(screen.getByTestId('student-country-origin')).toBeInTheDocument()
    expect(screen.getByTestId('student-city-origin')).toBeInTheDocument()
    expect(screen.getByTestId('student-country-residence')).toBeInTheDocument()
    expect(screen.getByTestId('student-city-residence')).toBeInTheDocument()
  })

  it('pre-populates identity fields in edit mode', async () => {
    mockGetStudent.mockResolvedValue({
      id: 'stu-1',
      name: 'Ana',
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      nativeLanguages: [],
      learningGoals: [],
      weaknesses: [],
      difficulties: [],
      personalNotes: null,
      teachingNotes: null,
      birthYear: 1990,
      profession: 'Architect',
      countryOfOrigin: 'Portugal',
      cityOfOrigin: 'Lisbon',
      countryOfResidence: 'Spain',
      cityOfResidence: 'Madrid',
    })
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    expect(screen.getByTestId('student-birth-year')).toHaveValue(1990)
    expect(screen.getByTestId('student-profession')).toHaveValue('Architect')
    expect(screen.getByTestId('student-country-origin')).toHaveValue('Portugal')
    expect(screen.getByTestId('student-city-origin')).toHaveValue('Lisbon')
    expect(screen.getByTestId('student-country-residence')).toHaveValue('Spain')
    expect(screen.getByTestId('student-city-residence')).toHaveValue('Madrid')
  })

  it('includes identity fields in form submission', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mockCreateStudent.mockResolvedValue({ id: 'new-id' })
    renderNew()

    await user.type(screen.getByTestId('student-name'), 'Test Student')
    await user.click(screen.getByTestId('student-language'))
    await user.click(await screen.findByRole('option', { name: 'Spanish' }))
    await user.click(screen.getByTestId('student-cefr'))
    await user.click(await screen.findByRole('option', { name: 'B1' }))
    await user.type(screen.getByTestId('student-birth-year'), '1990')
    await user.type(screen.getByTestId('student-profession'), 'Engineer')
    await user.type(screen.getByTestId('student-country-origin'), 'Portugal')
    await user.type(screen.getByTestId('student-city-origin'), 'Porto')
    await user.type(screen.getByTestId('student-country-residence'), 'Spain')
    await user.type(screen.getByTestId('student-city-residence'), 'Madrid')

    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    await vi.waitFor(() => {
      expect(mockCreateStudent).toHaveBeenCalledWith(
        expect.objectContaining({
          birthYear: 1990,
          profession: 'Engineer',
          countryOfOrigin: 'Portugal',
          cityOfOrigin: 'Porto',
          countryOfResidence: 'Spain',
          cityOfResidence: 'Madrid',
        }),
      )
    })
  }, 15000)

  it('renders Reason for Studying textarea', () => {
    renderNew()
    expect(screen.getByTestId('student-reason-for-studying')).toBeInTheDocument()
  })

  it('renders Teaching Goals card with Add Objective button', () => {
    renderNew()
    expect(screen.getByTestId('add-objective')).toBeInTheDocument()
    expect(screen.getByTestId('objectives-empty')).toBeInTheDocument()
  })

  it('adds a short-term objective row on click', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderNew()

    expect(screen.queryAllByTestId('objective-row')).toHaveLength(0)
    await user.click(screen.getByTestId('add-objective'))
    expect(screen.getAllByTestId('objective-row')).toHaveLength(1)
    expect(screen.queryByTestId('objectives-empty')).not.toBeInTheDocument()
  })

  it('removes a short-term objective row', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderNew()

    await user.click(screen.getByTestId('add-objective'))
    expect(screen.getAllByTestId('objective-row')).toHaveLength(1)
    await user.click(screen.getByTestId('remove-objective'))
    expect(screen.queryAllByTestId('objective-row')).toHaveLength(0)
  })

  it('includes reasonForStudying in submission', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mockCreateStudent.mockResolvedValue({ id: 'new-id' })
    renderNew()

    await user.type(screen.getByTestId('student-name'), 'Test Student')
    await user.click(screen.getByTestId('student-language'))
    await user.click(await screen.findByRole('option', { name: 'Spanish' }))
    await user.click(screen.getByTestId('student-cefr'))
    await user.click(await screen.findByRole('option', { name: 'B1' }))
    await user.type(screen.getByTestId('student-reason-for-studying'), 'Moving to Spain')

    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    await vi.waitFor(() => {
      expect(mockCreateStudent).toHaveBeenCalledWith(
        expect.objectContaining({ reasonForStudying: 'Moving to Spain' }),
      )
    })
  })

  it('pre-populates reasonForStudying and objectives in edit mode', async () => {
    mockGetStudent.mockResolvedValue({
      id: 'stu-1',
      name: 'Ana',
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      nativeLanguages: [],
      learningGoals: [],
      weaknesses: [],
      difficulties: [],
      personalNotes: null,
      teachingNotes: null,
      reasonForStudying: 'Loves Spanish culture',
      shortTermObjectives: [
        { id: 'obj-1', text: 'Pass DELE B1', targetDate: '2026-06-01' },
      ],
    })
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    expect(screen.getByTestId('student-reason-for-studying')).toHaveValue('Loves Spanish culture')
    const rows = await screen.findAllByTestId('objective-row')
    expect(rows).toHaveLength(1)
    expect(screen.getByTestId('objective-text-input')).toHaveValue('Pass DELE B1')
  })

  it('includes shortTermObjectives in submission (filtering empty text)', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mockCreateStudent.mockResolvedValue({ id: 'new-id' })
    renderNew()

    await user.type(screen.getByTestId('student-name'), 'Test Student')
    await user.click(screen.getByTestId('student-language'))
    await user.click(await screen.findByRole('option', { name: 'Spanish' }))
    await user.click(screen.getByTestId('student-cefr'))
    await user.click(await screen.findByRole('option', { name: 'B1' }))

    await user.click(screen.getByTestId('add-objective'))
    await user.type(screen.getByTestId('objective-text-input'), 'Pass DELE B1')

    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    await vi.waitFor(() => {
      expect(mockCreateStudent).toHaveBeenCalledWith(
        expect.objectContaining({
          shortTermObjectives: [expect.objectContaining({ text: 'Pass DELE B1' })],
        }),
      )
    })
  })

  it('shows teaching todos sidebar in edit mode', async () => {
    mockGetStudent.mockResolvedValue({
      id: 'stu-1', name: 'Ana', learningLanguage: 'Spanish', cefrLevel: 'B1',
      interests: [], nativeLanguages: [], learningGoals: [], weaknesses: [], difficulties: [],
      personalNotes: null, teachingNotes: null,
      teachingTodos: [
        { id: 't1', text: 'Review subjunctive', status: 'Pending', createdAt: '2026-01-01T00:00:00Z', sourceSessionLogId: null, coveredInSessionLogId: null },
      ],
      shortTermObjectives: [], spokenLanguages: [],
      birthYear: null, profession: null, countryOfOrigin: null, cityOfOrigin: null,
      countryOfResidence: null, cityOfResidence: null, reasonForStudying: null,
      officialCefrLevel: null, isActive: true, isCorporate: false, rate: null,
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    })
    renderEdit()
    expect(await screen.findByTestId('sidebar-teaching-todos')).toBeInTheDocument()
    expect(await screen.findByText('Review subjunctive')).toBeInTheDocument()
    // Delete button visible (allowEdit=true on sidebar)
    expect(screen.getByTestId('todo-delete-t1')).toBeInTheDocument()
  })

  it('does not show teaching todos sidebar in create mode', () => {
    renderNew()
    expect(screen.queryByTestId('form-sidebar')).not.toBeInTheDocument()
  })

  it('renders commercial fields in edit mode', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    expect(screen.getByTestId('toggle-is-active')).toBeInTheDocument()
    expect(screen.getByTestId('toggle-is-corporate')).toBeInTheDocument()
    expect(screen.getByTestId('student-rate')).toBeInTheDocument()
  })

  it('does not render commercial section in create mode', () => {
    renderNew()
    expect(screen.queryByTestId('toggle-is-active')).not.toBeInTheDocument()
    expect(screen.queryByTestId('toggle-is-corporate')).not.toBeInTheDocument()
    expect(screen.queryByTestId('student-rate')).not.toBeInTheDocument()
  })

  it('submits commercial fields in edit mode', async () => {
    mockGetStudent.mockResolvedValue({
      id: 'stu-1', name: 'Ana', learningLanguage: 'Spanish', cefrLevel: 'B1',
      interests: [], nativeLanguages: [], learningGoals: [], weaknesses: [], difficulties: [],
      personalNotes: null, teachingNotes: null, shortTermObjectives: [], spokenLanguages: [],
      teachingTodos: [], birthYear: null, profession: null, countryOfOrigin: null,
      cityOfOrigin: null, countryOfResidence: null, cityOfResidence: null,
      reasonForStudying: null, officialCefrLevel: null,
      isActive: true, isCorporate: false, rate: '45/hr',
      skillLevelOverrides: {}, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    })
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })

    // Toggle isActive off — autosave fires immediately on toggle
    await user.click(screen.getByTestId('toggle-is-active'))
    // inactive badge should appear
    expect(await screen.findByTestId('inactive-badge')).toBeInTheDocument()

    await vi.waitFor(() => {
      expect(mockUpdateStudent).toHaveBeenCalledWith(
        'stu-1',
        expect.objectContaining({ isActive: false, isCorporate: false, rate: '45/hr' }),
      )
    })
  })

  it('shows delete button in edit mode', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    expect(screen.getByTestId('delete-student-btn')).toBeInTheDocument()
  })

  it('does not show delete button in create mode', () => {
    renderNew()
    expect(screen.queryByTestId('delete-student-btn')).not.toBeInTheDocument()
  })

  it('opens delete dialog and confirms deletion', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })

    await user.click(screen.getByTestId('delete-student-btn'))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()

    await user.click(screen.getByTestId('confirm-delete'))

    await vi.waitFor(() => {
      expect(mockDeleteStudent).toHaveBeenCalledWith('stu-1')
    })
  })

  it('shows section nav in edit mode', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    expect(screen.getByTestId('section-nav')).toBeInTheDocument()
    expect(screen.getByTestId('section-nav-section-basic')).toBeInTheDocument()
    expect(screen.getByTestId('section-nav-section-commercial')).toBeInTheDocument()
  })

  it('does not show section nav in create mode', () => {
    renderNew()
    expect(screen.queryByTestId('section-nav')).not.toBeInTheDocument()
  })
})
