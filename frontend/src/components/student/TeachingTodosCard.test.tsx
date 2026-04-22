import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TeachingTodosCard } from './TeachingTodosCard'
import type { TeachingTodo } from '@/api/students'
import * as studentsApi from '@/api/students'

vi.mock('@/api/students', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/students')>()
  return {
    ...actual,
    appendTeachingTodo: vi.fn(),
    updateTeachingTodo: vi.fn(),
    deleteTeachingTodo: vi.fn(),
  }
})

const PENDING_TODO: TeachingTodo = {
  id: '1',
  text: 'Explain subjunctive',
  createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  sourceSessionLogId: null,
  status: 'pending',
  coveredInSessionLogId: null,
}
const COVERED_TODO: TeachingTodo = {
  id: '2',
  text: 'Past tense review',
  createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
  sourceSessionLogId: null,
  status: 'covered',
  coveredInSessionLogId: 'session-1',
}

function makeStudent(todos: TeachingTodo[]) {
  return { teachingTodos: todos } as unknown as import('@/api/students').Student
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const defaultProps = {
  todos: [PENDING_TODO, COVERED_TODO],
  studentId: 'student-1',
  onStudentChange: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TeachingTodosCard', () => {
  it('renders empty state with add prompt when no todos', () => {
    render(<TeachingTodosCard todos={[]} studentId="s1" onStudentChange={vi.fn()} />, { wrapper })
    expect(screen.getByTestId('teaching-todos-empty')).toBeInTheDocument()
    expect(screen.getByText(/No ideas yet/)).toBeInTheDocument()
    expect(screen.getByTestId('todo-add-input')).toBeInTheDocument()
  })

  it('renders list of todos', () => {
    render(<TeachingTodosCard {...defaultProps} />, { wrapper })
    expect(screen.getByTestId('teaching-todos-list')).toBeInTheDocument()
    expect(screen.getAllByTestId('teaching-todo-item')).toHaveLength(2)
  })

  it('sorts pending todos before covered ones', () => {
    // Pass covered first to verify sorting
    render(
      <TeachingTodosCard
        todos={[COVERED_TODO, PENDING_TODO]}
        studentId="s1"
        onStudentChange={vi.fn()}
      />,
      { wrapper }
    )
    const items = screen.getAllByTestId('teaching-todo-item')
    expect(items[0]).toHaveTextContent('Explain subjunctive') // pending first
    expect(items[1]).toHaveTextContent('Past tense review')   // covered second
  })

  it('applies strikethrough to covered todos', () => {
    render(<TeachingTodosCard {...defaultProps} />, { wrapper })
    const coveredText = screen.getByTestId(`todo-text-${COVERED_TODO.id}`)
    expect(coveredText.className).toContain('line-through')
  })

  it('shows relative time for each todo', () => {
    render(<TeachingTodosCard {...defaultProps} />, { wrapper })
    expect(screen.getAllByText(/ago/)).toHaveLength(2)
  })

  it('calls appendTeachingTodo on add and updates list optimistically', async () => {
    const newStudent = makeStudent([
      PENDING_TODO,
      COVERED_TODO,
      { ...PENDING_TODO, id: '3', text: 'New idea' },
    ])
    vi.mocked(studentsApi.appendTeachingTodo).mockResolvedValue(newStudent)
    const onStudentChange = vi.fn()
    render(<TeachingTodosCard todos={[PENDING_TODO, COVERED_TODO]} studentId="s1" onStudentChange={onStudentChange} />, { wrapper })

    fireEvent.change(screen.getByTestId('todo-add-input'), { target: { value: 'New idea' } })
    fireEvent.click(screen.getByTestId('todo-add-btn'))

    await waitFor(() => expect(studentsApi.appendTeachingTodo).toHaveBeenCalledWith('s1', 'New idea'))
    await waitFor(() => expect(onStudentChange).toHaveBeenCalled())
  })

  it('calls updateTeachingTodo on toggle', async () => {
    vi.mocked(studentsApi.updateTeachingTodo).mockResolvedValue(makeStudent([
      { ...PENDING_TODO, status: 'covered' },
      COVERED_TODO,
    ]))
    render(<TeachingTodosCard {...defaultProps} onStudentChange={vi.fn()} />, { wrapper })

    fireEvent.click(screen.getByTestId(`todo-toggle-${PENDING_TODO.id}`))
    await waitFor(() =>
      expect(studentsApi.updateTeachingTodo).toHaveBeenCalledWith('student-1', PENDING_TODO.id, { status: 'covered' })
    )
  })

  it('does not show delete button without allowEdit', () => {
    render(<TeachingTodosCard {...defaultProps} />, { wrapper })
    expect(screen.queryByTestId(`todo-delete-${PENDING_TODO.id}`)).not.toBeInTheDocument()
  })

  it('calls deleteTeachingTodo when delete button clicked (allowEdit)', async () => {
    vi.mocked(studentsApi.deleteTeachingTodo).mockResolvedValue(makeStudent([COVERED_TODO]))
    render(<TeachingTodosCard {...defaultProps} allowEdit onStudentChange={vi.fn()} />, { wrapper })

    // Hover is handled by CSS; click directly
    fireEvent.click(screen.getByTestId(`todo-delete-${PENDING_TODO.id}`))
    await waitFor(() =>
      expect(studentsApi.deleteTeachingTodo).toHaveBeenCalledWith('student-1', PENDING_TODO.id)
    )
  })

  it('adds on Enter key press in input', async () => {
    vi.mocked(studentsApi.appendTeachingTodo).mockResolvedValue(makeStudent([PENDING_TODO]))
    render(<TeachingTodosCard todos={[PENDING_TODO]} studentId="s1" onStudentChange={vi.fn()} />, { wrapper })

    fireEvent.change(screen.getByTestId('todo-add-input'), { target: { value: 'Via enter' } })
    fireEvent.keyDown(screen.getByTestId('todo-add-input'), { key: 'Enter' })
    await waitFor(() => expect(studentsApi.appendTeachingTodo).toHaveBeenCalledWith('s1', 'Via enter'))
  })
})

describe('TeachingTodosCard - controlled showAddForm mode', () => {
  it('hides add input row when showAddForm=false', () => {
    render(
      <TeachingTodosCard todos={[]} studentId="s1" onStudentChange={vi.fn()} showAddForm={false} onAddFormClose={vi.fn()} />,
      { wrapper }
    )
    expect(screen.queryByTestId('todo-add-input')).not.toBeInTheDocument()
  })

  it('shows add input row when showAddForm=true', () => {
    render(
      <TeachingTodosCard todos={[]} studentId="s1" onStudentChange={vi.fn()} showAddForm={true} onAddFormClose={vi.fn()} />,
      { wrapper }
    )
    expect(screen.getByTestId('todo-add-input')).toBeInTheDocument()
  })

  it('calls onAddFormClose after successful add', async () => {
    const newStudent = makeStudent([PENDING_TODO])
    vi.mocked(studentsApi.appendTeachingTodo).mockResolvedValue(newStudent)
    const onAddFormClose = vi.fn()
    render(
      <TeachingTodosCard todos={[]} studentId="s1" onStudentChange={vi.fn()} showAddForm={true} onAddFormClose={onAddFormClose} />,
      { wrapper }
    )
    fireEvent.change(screen.getByTestId('todo-add-input'), { target: { value: 'New idea' } })
    fireEvent.keyDown(screen.getByTestId('todo-add-input'), { key: 'Enter' })
    await waitFor(() => expect(onAddFormClose).toHaveBeenCalled())
  })

  it('calls onAddFormClose on Escape key', () => {
    const onAddFormClose = vi.fn()
    render(
      <TeachingTodosCard todos={[]} studentId="s1" onStudentChange={vi.fn()} showAddForm={true} onAddFormClose={onAddFormClose} />,
      { wrapper }
    )
    fireEvent.keyDown(screen.getByTestId('todo-add-input'), { key: 'Escape' })
    expect(onAddFormClose).toHaveBeenCalled()
  })

  it('always shows add input in uncontrolled mode (no showAddForm prop)', () => {
    render(<TeachingTodosCard todos={[]} studentId="s1" onStudentChange={vi.fn()} />, { wrapper })
    expect(screen.getByTestId('todo-add-input')).toBeInTheDocument()
  })
})
