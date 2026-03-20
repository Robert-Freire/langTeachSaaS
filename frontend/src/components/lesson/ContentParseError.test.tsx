import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ContentParseError } from './ContentParseError'

describe('ContentParseError', () => {
  it('renders student message for student context', () => {
    render(<ContentParseError context="student" />)
    expect(screen.getByText(/could not be loaded/)).toBeInTheDocument()
    expect(screen.getByText(/ask your teacher/)).toBeInTheDocument()
  })

  it('renders teacher message for teacher context', () => {
    render(<ContentParseError context="teacher" />)
    expect(screen.getByText(/could not be parsed/)).toBeInTheDocument()
    expect(screen.getByText(/Edit view/)).toBeInTheDocument()
  })

  it('does not show teacher message in student context', () => {
    render(<ContentParseError context="student" />)
    expect(screen.queryByText(/could not be parsed/)).not.toBeInTheDocument()
  })

  it('does not show student message in teacher context', () => {
    render(<ContentParseError context="teacher" />)
    expect(screen.queryByText(/could not be loaded/)).not.toBeInTheDocument()
  })
})
