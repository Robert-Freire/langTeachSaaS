import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Dashboard from './pages/Dashboard'
import { MemoryRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
  it('renders the dashboard skeleton while loading', () => {
    wrapper(<Dashboard />)
    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument()
  })
})

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

describe('/dashboard redirect', () => {
  it('redirects /dashboard to /', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/" element={<LocationDisplay />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
    expect(screen.getByTestId('location').textContent).toBe('/')
  })
})
