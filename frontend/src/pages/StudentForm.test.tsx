import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import StudentForm from './StudentForm'

const mockGetStudent = vi.fn()
const mockCreateStudent = vi.fn()
const mockUpdateStudent = vi.fn()
const mockGetStudents = vi.fn()

vi.mock('../api/students', () => ({
  getStudent: (...args: unknown[]) => mockGetStudent(...args),
  createStudent: (...args: unknown[]) => mockCreateStudent(...args),
  updateStudent: (...args: unknown[]) => mockUpdateStudent(...args),
  getStudents: (...args: unknown[]) => mockGetStudents(...args),
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

vi.mock('../lib/studentOptions', () => ({
  LEARNING_GOALS: [{ value: 'travel', label: 'Travel' }],
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
      id: 'stu-1',
      name: 'Ana',
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      nativeLanguage: null,
      learningGoals: [],
      weaknesses: [] as { description: string; weaknessType: string }[],
      difficulties: [],
      notes: '',
    })
    mockGetStudents.mockResolvedValue({ items: [], totalCount: 0 })
    mockCreateStudent.mockResolvedValue({ id: 'new-id' })
  })

  it('renders Back link to students list', () => {
    renderNew()
    const back = screen.getByTestId('page-header-back')
    expect(back).toHaveAttribute('href', '/students')
    expect(back).toHaveTextContent('Students')
  })

  it('shows "Teaching Context" section heading instead of "AI Personalization"', () => {
    renderNew()
    expect(screen.getByText('Teaching Context')).toBeInTheDocument()
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
      nativeLanguage: null,
      learningGoals: [],
      weaknesses: [],
      difficulties: [
        { id: 'd1', description: 'Confuses ser/estar', competency: 'Grammar', subcategory: 'ser/estar', severity: 'high', trend: 'stable', status: 'Active' },
        { id: 'd2', description: 'Difficulty with rolled r', competency: 'Pronunciation', subcategory: '/r/', severity: 'low', trend: 'stable', status: 'Active' },
      ],
      notes: '',
    })

    renderEdit()

    const rows = await screen.findAllByTestId('difficulty-row')
    expect(rows).toHaveLength(2)

    const items = screen.getAllByTestId('difficulty-description')
    expect(items[0]).toHaveValue('Confuses ser/estar')
    expect(items[1]).toHaveValue('Difficulty with rolled r')
  })

  it('shows "Add custom" option when typing non-matching text in learning goals', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderNew()

    // Open the learning goals popover
    await user.click(screen.getByTestId('learning-goals-trigger'))

    // Type a custom value that doesn't match predefined options
    const input = screen.getByPlaceholderText('Search or type custom...')
    await user.type(input, 'pass DELE B2')

    // Should show the "Add custom" option
    const addOption = screen.getByTestId('add-custom-entry')
    expect(addOption).toBeInTheDocument()
    expect(addOption).toHaveTextContent('pass DELE B2')
  })

  it('adds custom entry as chip when clicking "Add" option', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderNew()

    // Open learning goals and type custom
    await user.click(screen.getByTestId('learning-goals-trigger'))
    const input = screen.getByPlaceholderText('Search or type custom...')
    await user.type(input, 'pass DELE B2')

    // Click the add custom option
    await user.click(screen.getByTestId('add-custom-entry'))

    // Chip should appear
    const chips = screen.getAllByTestId('learning-goal-chip')
    expect(chips.some((c) => c.textContent?.includes('pass DELE B2'))).toBe(true)
  })

  it('can remove a custom entry chip', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderNew()

    // Add custom entry
    await user.click(screen.getByTestId('learning-goals-trigger'))
    const input = screen.getByPlaceholderText('Search or type custom...')
    await user.type(input, 'custom goal')
    await user.click(screen.getByTestId('add-custom-entry'))

    // Verify chip exists
    const chip = screen.getByTestId('learning-goal-chip')
    expect(chip).toHaveTextContent('custom goal')

    // Remove it
    await user.click(screen.getByLabelText('Remove custom goal'))
    expect(screen.queryByTestId('learning-goal-chip')).not.toBeInTheDocument()
  })

  it('does not show "Add custom" when input matches a predefined label', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderNew()

    await user.click(screen.getByTestId('learning-goals-trigger'))
    const input = screen.getByPlaceholderText('Search or type custom...')
    await user.type(input, 'Travel')

    // Should NOT show the add custom option (matches predefined label)
    expect(screen.queryByTestId('add-custom-entry')).not.toBeInTheDocument()
  })

  it('displays custom learning goals in edit mode when loaded from server', async () => {
    mockGetStudent.mockResolvedValue({
      id: 'stu-1',
      name: 'Ana',
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      nativeLanguage: null,
      learningGoals: ['travel', 'pass DELE B2 exam'],
      weaknesses: [],
      difficulties: [],
      notes: '',
    })

    renderEdit()

    // Predefined goals show their label
    await expect(screen.findByText('Travel')).resolves.toBeInTheDocument()
    // Custom goals show their raw value
    expect(screen.getByText('pass DELE B2 exam')).toBeInTheDocument()
  })

  it('includes difficulties in form submission', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    mockCreateStudent.mockResolvedValue({ id: 'new-id' })
    renderNew()

    // Fill required fields
    await user.type(screen.getByTestId('student-name'), 'Test Student')
    // Select language
    await user.click(screen.getByTestId('student-language'))
    await user.click(await screen.findByRole('option', { name: 'Spanish' }))
    // Select CEFR
    await user.click(screen.getByTestId('student-cefr'))
    await user.click(await screen.findByRole('option', { name: 'B1' }))

    // Add a difficulty and fill description but no competency
    await user.click(screen.getByTestId('add-difficulty'))
    await user.type(screen.getByTestId('difficulty-description'), 'test difficulty')

    // Submit
    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    // The difficulty row with empty competency gets filtered out
    expect(mockCreateStudent).toHaveBeenCalledWith(
      expect.objectContaining({
        difficulties: [],
      }),
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
      nativeLanguage: null,
      learningGoals: [],
      weaknesses: [
        { description: 'ser/estar confusion', weaknessType: 'grammatical' },
        { description: 'limited travel vocabulary', weaknessType: 'lexical' },
      ],
      difficulties: [],
      notes: '',
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

  it('"Create Course" button is disabled when student is missing CEFR level', async () => {
    mockGetStudent.mockResolvedValue({
      id: 'stu-1',
      name: 'Ana',
      learningLanguage: 'Spanish',
      cefrLevel: '',
      interests: [],
      nativeLanguage: null,
      learningGoals: [],
      weaknesses: [],
      difficulties: [],
      notes: '',
    })
    renderEdit()
    const btn = await screen.findByTestId('create-course-btn')
    expect(btn).toBeDisabled()
  })

})
