import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Dashboard from './pages/Dashboard'
import App from './App'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('./api/students', () => ({ getStudents: vi.fn(() => new Promise(() => {})) }))
vi.mock('./api/lessons', () => ({ getLessons: vi.fn(() => new Promise(() => {})) }))
vi.mock('./api/corrections', () => ({ getCorrections: vi.fn(() => new Promise(() => {})) }))
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { name: 'Test', email: 'test@example.com' },
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
    getAccessTokenSilently: vi.fn(),
  }),
}))
vi.mock('./hooks/useProfile', () => ({
  useProfile: () => ({
    data: { hasCompletedOnboarding: true },
    isLoading: false,
  }),
}))
vi.mock('./lib/apiClient', () => ({
  apiClient: {},
  setupAuthInterceptor: vi.fn(() => () => {}),
}))

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

vi.mock('./components/AppShell', () => ({
  default: () => {
    const { Outlet } = require('react-router-dom')
    return <Outlet />
  },
}))

describe('/dashboard redirect', () => {
  it('redirects /dashboard to / in the real App route table', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
          <LocationDisplay />
        </MemoryRouter>
      </QueryClientProvider>
    )
    expect(screen.getByTestId('location').textContent).toBe('/')
  })
})
