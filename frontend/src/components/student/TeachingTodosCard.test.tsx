import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TeachingTodosCard } from './TeachingTodosCard'
import type { TeachingTodo } from '@/api/students'

const TODOS: TeachingTodo[] = [
  { id: '1', text: 'Send exercises', createdAt: '2026-01-01T00:00:00Z', sourceSessionLogId: null, status: 'Pending', coveredInSessionLogId: null },
  { id: '2', text: 'Explain subjunctive', createdAt: '2026-01-01T00:00:00Z', sourceSessionLogId: null, status: 'Covered', coveredInSessionLogId: 'session-1' },
  { id: '3', text: 'Old task', createdAt: '2026-01-01T00:00:00Z', sourceSessionLogId: null, status: 'Dismissed', coveredInSessionLogId: null },
]

describe('TeachingTodosCard', () => {
  it('renders empty state when no todos', () => {
    render(<TeachingTodosCard todos={[]} />)
    expect(screen.getByTestId('teaching-todos-empty')).toBeInTheDocument()
    expect(screen.getByText('No teaching todos yet')).toBeInTheDocument()
  })

  it('renders list of todos', () => {
    render(<TeachingTodosCard todos={TODOS} />)
    expect(screen.getByTestId('teaching-todos-list')).toBeInTheDocument()
    expect(screen.getAllByTestId('teaching-todo-item')).toHaveLength(3)
  })

  it('shows correct text for each todo', () => {
    render(<TeachingTodosCard todos={TODOS} />)
    expect(screen.getByText('Send exercises')).toBeInTheDocument()
    expect(screen.getByText('Explain subjunctive')).toBeInTheDocument()
    expect(screen.getByText('Old task')).toBeInTheDocument()
  })

  it('renders status dots with correct colors', () => {
    render(<TeachingTodosCard todos={TODOS} />)
    expect(screen.getByTestId('todo-status-pending')).toBeInTheDocument()
    expect(screen.getByTestId('todo-status-covered')).toBeInTheDocument()
    expect(screen.getByTestId('todo-status-dismissed')).toBeInTheDocument()
  })

  it('applies strikethrough to covered todos', () => {
    render(<TeachingTodosCard todos={TODOS} />)
    const coveredItem = screen.getByText('Explain subjunctive')
    expect(coveredItem.className).toContain('line-through')
  })
})
