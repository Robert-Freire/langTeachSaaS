import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
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

// Small language list for fast rendering in most tests (combobox with 60+ options is slow in CI).
// Tests that specifically test the full language list use the real options — see describe block below.
const SMALL_LANGUAGE_OPTIONS = [
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
]
let _allLanguageOptions = SMALL_LANGUAGE_OPTIONS
vi.mock('../lib/languages', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/languages')>()
  return { ...original, get ALL_LANGUAGE_OPTIONS() { return _allLanguageOptions } }
})

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

function makeMockStudent(overrides: {
  id?: string; name?: string; learningLanguage?: string;
  cefrLevel?: string; officialCefrLevel?: string | null; skillLevelOverrides?: Record<string, string>;
  nativeLanguages?: string[]; spokenLanguages?: string[];
  birthYear?: number | null; profession?: string | null;
  countryOfOrigin?: string | null; cityOfOrigin?: string | null;
  countryOfResidence?: string | null; cityOfResidence?: string | null; reasonForStudying?: string | null;
  interests?: string[]; personalNotes?: string | null; teachingNotes?: string | null;
  learningGoals?: { id: string; text: string; children: unknown[] }[];
  weaknesses?: { description: string; weaknessType: string }[];
  difficulties?: { id: string; description: string; competency: string; subcategory: string; severity: string; trend: string; status: string }[];
  shortTermObjectives?: { id: string; text: string; targetDate?: string; objectiveType?: string }[];
  teachingTodos?: { id: string; text: string; status: string; createdAt: string; sourceSessionLogId: null; coveredInSessionLogId: null }[];
  isActive?: boolean; isCorporate?: boolean; rate?: string | null;
  createdAt?: string; updatedAt?: string;
} = {}) {
  return {
    id: overrides.id ?? 'stu-1',
    name: overrides.name ?? 'Ana',
    learningLanguage: overrides.learningLanguage ?? 'Spanish',
    level: { cefrLevel: overrides.cefrLevel ?? 'B1', officialCefrLevel: overrides.officialCefrLevel ?? null, skillLevelOverrides: overrides.skillLevelOverrides ?? {} },
    languages: { nativeLanguages: overrides.nativeLanguages ?? [], spokenLanguages: overrides.spokenLanguages ?? [] },
    identity: { birthYear: overrides.birthYear ?? null, age: null, profession: overrides.profession ?? null, countryOfOrigin: overrides.countryOfOrigin ?? null, cityOfOrigin: overrides.cityOfOrigin ?? null, countryOfResidence: overrides.countryOfResidence ?? null, cityOfResidence: overrides.cityOfResidence ?? null },
    profile: { interests: overrides.interests ?? [], personalNotes: overrides.personalNotes ?? null, teachingNotes: overrides.teachingNotes ?? null, learningGoals: overrides.learningGoals ?? [], weaknesses: overrides.weaknesses ?? [], difficulties: overrides.difficulties ?? [], shortTermObjectives: overrides.shortTermObjectives ?? [], teachingTodos: overrides.teachingTodos ?? [], reasonForStudying: overrides.reasonForStudying ?? null },
    commercial: { isActive: overrides.isActive ?? true, isCorporate: overrides.isCorporate ?? false, rate: overrides.rate ?? null },
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00Z',
  }
}

describe('StudentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStudent.mockResolvedValue(makeMockStudent())
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

  it('renders Done button in header for new student', () => {
    renderNew()
    expect(screen.getByRole('heading', { name: 'Add Student' })).toBeInTheDocument()
    expect(screen.getByTestId('done-btn')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
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

  it('Done button has form attribute pointing to student-form', () => {
    renderNew()
    const doneBtn = screen.getByTestId('done-btn')
    expect(doneBtn).toHaveAttribute('form', 'student-form')
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
    await user.click(screen.getByTestId('done-btn'))

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
    mockGetStudent.mockResolvedValue(makeMockStudent({
      difficulties: [
        { id: 'd1', description: 'Confuses ser/estar', competency: 'Grammar', subcategory: 'ser/estar', severity: 'high', trend: 'stable', status: 'Active' },
        { id: 'd2', description: 'Difficulty with rolled r', competency: 'Pronunciation', subcategory: '/r/', severity: 'low', trend: 'stable', status: 'Active' },
      ],
    }))

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
    mockGetStudent.mockResolvedValue(makeMockStudent({
      learningGoals: [{ id: '1', text: 'travel', children: [] }, { id: '2', text: 'pass DELE B2 exam', children: [] }],
    }))

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
    await user.click(screen.getByTestId('done-btn'))

    // Should show inline error and not call createStudent
    expect(screen.getByTestId('difficulty-error')).toBeInTheDocument()
    expect(screen.getByTestId('difficulty-error')).toHaveTextContent('Both type and description are required')
    expect(mockCreateStudent).not.toHaveBeenCalled()
  })

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

    await user.click(screen.getByTestId('done-btn'))

    expect(screen.getByTestId('difficulty-error')).toBeInTheDocument()
    expect(mockCreateStudent).not.toHaveBeenCalled()
  })

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
    await user.click(screen.getByTestId('done-btn'))

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
    await user.click(screen.getByTestId('done-btn'))

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
    await user.click(screen.getByTestId('done-btn'))

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

    await user.click(screen.getByTestId('done-btn'))

    expect(mockCreateStudent).toHaveBeenCalledWith(
      expect.objectContaining({
        weaknesses: [{ description: 'Vocabulary gaps', weaknessType: 'grammatical' }],
      }),
    )
  })

  it('existing weaknesses render as rows in edit mode', async () => {
    mockGetStudent.mockResolvedValue(makeMockStudent({
      weaknesses: [
        { description: 'ser/estar confusion', weaknessType: 'grammatical' },
        { description: 'limited travel vocabulary', weaknessType: 'lexical' },
      ],
    }))

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
    mockGetStudent.mockResolvedValue(makeMockStudent({ nativeLanguages: ['Portuguese', 'English', 'Catalan'] }))

    renderEdit()

    await screen.findByRole('heading', { name: 'Edit Student' })

    const chips = await screen.findAllByTestId('native-lang-chip')
    expect(chips).toHaveLength(3)
    expect(chips[0]).toHaveTextContent('Portuguese')
    expect(chips[1]).toHaveTextContent('English')
    expect(chips[2]).toHaveTextContent('Catalan')
  })

  it('"Create Course" button is disabled when student is missing CEFR level', async () => {
    mockGetStudent.mockResolvedValue(makeMockStudent({ cefrLevel: '' }))
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
    mockGetStudent.mockResolvedValue(makeMockStudent({
      birthYear: 1990, profession: 'Architect', countryOfOrigin: 'Portugal', cityOfOrigin: 'Lisbon',
      countryOfResidence: 'Spain', cityOfResidence: 'Madrid',
    }))
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

    await user.click(screen.getByTestId('done-btn'))

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
  })

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

    await user.click(screen.getByTestId('done-btn'))

    await vi.waitFor(() => {
      expect(mockCreateStudent).toHaveBeenCalledWith(
        expect.objectContaining({ reasonForStudying: 'Moving to Spain' }),
      )
    })
  })

  it('pre-populates reasonForStudying and objectives in edit mode', async () => {
    mockGetStudent.mockResolvedValue(makeMockStudent({
      reasonForStudying: 'Loves Spanish culture',
      shortTermObjectives: [{ id: 'obj-1', text: 'Pass DELE B1', targetDate: '2026-06-01' }],
    }))
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

    await user.click(screen.getByTestId('done-btn'))

    await vi.waitFor(() => {
      expect(mockCreateStudent).toHaveBeenCalledWith(
        expect.objectContaining({
          shortTermObjectives: [expect.objectContaining({ text: 'Pass DELE B1' })],
        }),
      )
    })
  })

  it('shows teaching todos sidebar in edit mode', async () => {
    mockGetStudent.mockResolvedValue(makeMockStudent({
      teachingTodos: [{ id: 't1', text: 'Review subjunctive', status: 'Pending', createdAt: '2026-01-01T00:00:00Z', sourceSessionLogId: null, coveredInSessionLogId: null }],
    }))
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
    expect(screen.getByTestId('type-private')).toBeInTheDocument()
    expect(screen.getByTestId('student-rate')).toBeInTheDocument()
  })

  it('does not render commercial section in create mode', () => {
    renderNew()
    expect(screen.queryByTestId('toggle-is-active')).not.toBeInTheDocument()
    expect(screen.queryByTestId('type-private')).not.toBeInTheDocument()
    expect(screen.queryByTestId('student-rate')).not.toBeInTheDocument()
  })

  it('submits commercial fields in edit mode', async () => {
    mockGetStudent.mockResolvedValue(makeMockStudent({ rate: '45/hr' }))
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

  // AC1: CEFR badge displays when value is populated in edit mode
  it('shows CEFR badge instead of select when cefrLevel is loaded in edit mode', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    // cefrLevel is 'B1' from mock — badge should appear, select should not
    expect(screen.getByTestId('student-cefr-badge')).toBeInTheDocument()
    expect(screen.queryByTestId('student-cefr')).not.toBeInTheDocument()
  })

  // AC2: Language chips use full roundedness
  it('spoken language chips have rounded-full class', async () => {
    mockGetStudent.mockResolvedValue(makeMockStudent({ spokenLanguages: ['French', 'Italian'] }))
    renderEdit()
    const chips = await screen.findAllByTestId('spoken-lang-chip')
    expect(chips.length).toBeGreaterThan(0)
    chips.forEach((chip) => {
      expect(chip.className).toContain('rounded-full')
    })
  })

  // AC7: Delete button is in the danger zone at the bottom, not in the page header
  it('delete button is inside the danger zone, not in the page header', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    const dangerZone = screen.getByTestId('danger-zone')
    const deleteBtn = screen.getByTestId('delete-student-btn')
    expect(dangerZone).toContainElement(deleteBtn)
  })

  // AC7: deleteError message renders inside the danger zone
  it('shows deleteError inside danger zone when deletion fails', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mockDeleteStudent.mockRejectedValue(new Error('Network error'))
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })

    await user.click(screen.getByTestId('delete-student-btn'))
    await user.click(await screen.findByTestId('confirm-delete'))

    const errorEl = await screen.findByTestId('delete-error')
    const dangerZone = screen.getByTestId('danger-zone')
    expect(dangerZone).toContainElement(errorEl)
  })

  // AC1: clicking a CEFR badge opens the select for editing
  it('clicking CEFR badge reveals the select dropdown for editing', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })

    const badge = screen.getByTestId('student-cefr-badge')
    await user.click(badge)
    // After clicking, the select trigger should appear
    expect(await screen.findByTestId('student-cefr')).toBeInTheDocument()
    expect(screen.queryByTestId('student-cefr-badge')).not.toBeInTheDocument()
  })

  // AC2: native language chips use rounded-full
  it('native language chips have rounded-full class', async () => {
    mockGetStudent.mockResolvedValue(makeMockStudent({ nativeLanguages: ['Ukrainian'] }))
    renderEdit()
    const chips = await screen.findAllByTestId('native-lang-chip')
    expect(chips.length).toBeGreaterThan(0)
    chips.forEach((chip) => {
      expect(chip.className).toContain('rounded-full')
    })
  })

  // AC6: difficulty severity/trend indicators are hidden (not teacher-editable)
  it('does not render difficulty severity/trend visual indicators', async () => {
    mockGetStudent.mockResolvedValue(makeMockStudent({
      difficulties: [{ id: 'd1', description: 'test', competency: 'Grammar', subcategory: '', severity: 'high', trend: 'worsening', status: 'Active' }],
    }))
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    expect(screen.queryByTestId('difficulty-visual-indicators')).not.toBeInTheDocument()
    expect(screen.queryByTestId('difficulty-severity-bar')).not.toBeInTheDocument()
    expect(screen.queryByTestId('difficulty-trend-indicator')).not.toBeInTheDocument()
  })

  // ── Task 775: Layout and interaction polish ──

  it('A1: Native/Spoken Languages fields appear inside Basic Info — no separate Languages card', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    const headings = screen.getAllByRole('heading').map((h) => h.textContent)
    expect(headings).not.toContain('Languages')
    expect(screen.getByTestId('student-native-language')).toBeInTheDocument()
    expect(screen.getByTestId('spoken-languages-container')).toBeInTheDocument()
  })

  it('A2: section-teaching-goals and section-difficulties both exist in the DOM', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    expect(document.getElementById('section-teaching-goals')).toBeInTheDocument()
    expect(document.getElementById('section-difficulties')).toBeInTheDocument()
  })

  it('A3: Notes section uses Sensitivities/Life Context and Pedagogical Observations labels', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    expect(screen.getByText('Sensitivities / Life Context')).toBeInTheDocument()
    expect(screen.getByText('Pedagogical Observations')).toBeInTheDocument()
  })

  it('B4: Teacher\'s Assessment badge button contains a pencil icon', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    const badgeBtn = await screen.findByTestId('student-cefr-badge')
    expect(badgeBtn.querySelector('.lucide-pencil')).toBeInTheDocument()
  })

  it('B5: clicking Add Objective focuses the new text input', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    await user.click(screen.getByTestId('add-objective'))
    const inputs = screen.getAllByTestId('objective-text-input')
    expect(inputs[inputs.length - 1]).toHaveFocus()
  })

  it('B6: difficulty description is a textarea element', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    await user.click(screen.getByTestId('add-difficulty'))
    const desc = screen.getByTestId('difficulty-description')
    expect(desc.tagName.toLowerCase()).toBe('textarea')
  })

  it('B7: objective rows use amber border class, not orange-300', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    await user.click(screen.getByTestId('add-objective'))
    const row = screen.getByTestId('objective-row')
    expect(row.className).toContain('amber')
    expect(row.className).not.toContain('orange-300')
  })

  it('B8: no Lucide Calendar icon rendered adjacent to objective date input', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    await user.click(screen.getByTestId('add-objective'))
    const row = screen.getByTestId('objective-row')
    expect(row.querySelector('.lucide-calendar')).not.toBeInTheDocument()
  })

  it('B9: Official Level empty state renders ghost badge, clicking opens select', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    const ghostBadge = await screen.findByTestId('student-official-cefr-badge')
    expect(ghostBadge).toHaveTextContent('Not set')
    await user.click(ghostBadge)
    expect(await screen.findByTestId('student-official-cefr')).toBeInTheDocument()
  })

  it('C1: Skill Override pills show skill name with placeholder when no level set', async () => {
    renderEdit()
    await screen.findByRole('heading', { name: 'Edit Student' })
    expect(screen.getByText('Reading --')).toBeInTheDocument()
    expect(screen.getByText('Writing --')).toBeInTheDocument()
    expect(screen.getByText('Speaking --')).toBeInTheDocument()
    expect(screen.getByText('Listening --')).toBeInTheDocument()
  })

  it('C2: Scrollspy nav uses shadow-sm, not border-b', async () => {
    renderEdit()
    const nav = await screen.findByTestId('section-nav')
    expect(nav.className).toContain('shadow-sm')
    expect(nav.className).not.toContain('border-b')
  })

  it('C3: Inactive badge has no border class', async () => {
    mockGetStudent.mockResolvedValue(makeMockStudent({ isActive: false }))
    renderEdit()
    const badge = await screen.findByTestId('inactive-badge')
    expect(badge.className).not.toContain('border')
  })
})

describe('StudentForm – language combobox with full options', () => {
  beforeAll(async () => {
    const { ALL_LANGUAGE_OPTIONS } = await vi.importActual<typeof import('../lib/languages')>('../lib/languages')
    _allLanguageOptions = ALL_LANGUAGE_OPTIONS as typeof SMALL_LANGUAGE_OPTIONS
  })
  afterAll(() => { _allLanguageOptions = SMALL_LANGUAGE_OPTIONS })
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateStudent.mockResolvedValue({ id: 'stu-1' })
    mockGetStudents.mockResolvedValue([])
  })

  it('allows selecting a language only in the full list (e.g. Welsh)', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mockCreateStudent.mockResolvedValue({ id: 'new-id' })
    renderNew()
    await user.type(screen.getByTestId('student-name'), 'Test Student')
    await user.click(screen.getByTestId('student-language'))
    await user.type(screen.getByPlaceholderText('Search or type custom...'), 'Welsh')
    await user.click(await screen.findByRole('option', { name: 'Welsh' }))
    await user.click(screen.getByTestId('student-cefr'))
    await user.click(await screen.findByRole('option', { name: 'B1' }))
    await user.click(screen.getByTestId('done-btn'))
    await vi.waitFor(() => {
      expect(mockCreateStudent).toHaveBeenCalledWith(expect.objectContaining({ learningLanguage: 'Welsh' }))
    })
  }, 15000)

  it('allows entering a custom language not in the predefined list', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mockCreateStudent.mockResolvedValue({ id: 'new-id' })
    renderNew()
    await user.type(screen.getByTestId('student-name'), 'Test Student')
    await user.click(screen.getByTestId('student-language'))
    await user.type(screen.getByPlaceholderText('Search or type custom...'), 'Esperanto')
    await user.click(await screen.findByTestId('add-custom-entry'))
    await user.click(screen.getByTestId('student-cefr'))
    await user.click(await screen.findByRole('option', { name: 'B1' }))
    await user.click(screen.getByTestId('done-btn'))
    await vi.waitFor(() => {
      expect(mockCreateStudent).toHaveBeenCalledWith(expect.objectContaining({ learningLanguage: 'Esperanto' }))
    })
  }, 15000)
})
