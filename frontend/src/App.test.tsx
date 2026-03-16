import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Dashboard from './pages/Dashboard'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('./api/students', () => ({ getStudents: vi.fn(() => new Promise(() => {})) }))
vi.mock('./api/lessons', () => ({ getLessons: vi.fn(() => new Promise(() => {})) }))

function wrapper(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Dashboard', () => {
  it('renders the dashboard heading', () => {
    wrapper(<Dashboard />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
