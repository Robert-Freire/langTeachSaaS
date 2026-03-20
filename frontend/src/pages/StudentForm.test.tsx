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
})
