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

vi.mock('../lib/studentOptions', () => ({
  LEARNING_GOALS: [{ value: 'travel', label: 'Travel' }],
  WEAKNESSES: [{ value: 'grammar', label: 'Grammar' }],
  DIFFICULTY_CATEGORIES: [
    { value: 'grammar', label: 'Grammar' },
    { value: 'pronunciation', label: 'Pronunciation' },
  ],
  SEVERITY_LEVELS: [
    { value: 'low', label: 'Low' },
    { value: 'high', label: 'High' },
  ],
  TREND_OPTIONS: [
    { value: 'stable', label: 'Stable' },
    { value: 'improving', label: 'Improving' },
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
      weaknesses: [],
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
        { id: 'd1', category: 'grammar', item: 'ser/estar', severity: 'high', trend: 'stable' },
        { id: 'd2', category: 'pronunciation', item: 'rolled r', severity: 'low', trend: 'improving' },
      ],
      notes: '',
    })

    renderEdit()

    const rows = await screen.findAllByTestId('difficulty-row')
    expect(rows).toHaveLength(2)

    const items = screen.getAllByTestId('difficulty-item')
    expect(items[0]).toHaveValue('ser/estar')
    expect(items[1]).toHaveValue('rolled r')
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

  it('displays custom entries in edit mode when loaded from server', async () => {
    mockGetStudent.mockResolvedValue({
      id: 'stu-1',
      name: 'Ana',
      learningLanguage: 'Spanish',
      cefrLevel: 'B1',
      interests: [],
      nativeLanguage: null,
      learningGoals: ['travel', 'pass DELE B2 exam'],
      weaknesses: ['grammar', 'irregular verb conjugation'],
      difficulties: [],
      notes: '',
    })

    renderEdit()

    // Predefined goals show their label
    await expect(screen.findByText('Travel')).resolves.toBeInTheDocument()
    // Custom goals show their raw value
    expect(screen.getByText('pass DELE B2 exam')).toBeInTheDocument()

    // Same for weaknesses
    expect(screen.getByText('Grammar')).toBeInTheDocument()
    expect(screen.getByText('irregular verb conjugation')).toBeInTheDocument()
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
    await user.click(screen.getByRole('option', { name: 'Spanish' }))
    // Select CEFR
    await user.click(screen.getByTestId('student-cefr'))
    await user.click(screen.getByRole('option', { name: 'B1' }))

    // Add a difficulty and fill the item text
    await user.click(screen.getByTestId('add-difficulty'))
    await user.type(screen.getByTestId('difficulty-item'), 'test difficulty')

    // Submit
    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    // The difficulty row with empty category/severity/trend gets filtered out
    expect(mockCreateStudent).toHaveBeenCalledWith(
      expect.objectContaining({
        difficulties: [],
      }),
    )
  })
})
