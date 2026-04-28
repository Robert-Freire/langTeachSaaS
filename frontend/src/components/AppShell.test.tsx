import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppShell from './AppShell'

const mockLogout = vi.fn()
vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    user: { name: 'Test User', email: 'test@example.com', picture: '' },
    logout: mockLogout,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

vi.mock('../hooks/useProfile', () => ({
  useProfile: () => ({
    data: {
      id: '1', displayName: 'Test', teachingLanguages: [], cefrLevels: [],
      preferredStyle: '', hasCompletedOnboarding: true, hasSettings: true,
      hasStudents: false, hasLessons: false,
      generationsUsedThisMonth: 5, generationsMonthlyLimit: 50, subscriptionTier: 'Free',
    },
  }),
}))

function renderShell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the hamburger button for mobile', () => {
    renderShell()
    expect(screen.getByTestId('hamburger-btn')).toBeInTheDocument()
  })

  it('renders the desktop sidebar with lg:flex class', () => {
    renderShell()
    const aside = document.querySelector('aside')
    expect(aside).toBeInTheDocument()
    expect(aside?.className).toContain('lg:flex')
    expect(aside?.className).toContain('hidden')
  })

  it('opens the Sheet drawer when hamburger is clicked', async () => {
    const user = userEvent.setup()
    renderShell()
    const hamburger = screen.getByTestId('hamburger-btn')
    await user.click(hamburger)
    // Sheet content should now be visible with navigation items
    const sheetNav = document.querySelector('[data-slot="sheet-content"]')
    expect(sheetNav).toBeInTheDocument()
  })

  it('renders nav items in both desktop sidebar and mobile drawer', async () => {
    const user = userEvent.setup()
    renderShell()
    // Desktop sidebar has nav items (hidden via CSS but in DOM)
    const dashboardLinks = screen.getAllByText('Dashboard')
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1)

    // Open drawer to see mobile nav
    await user.click(screen.getByTestId('hamburger-btn'))
    const allDashboardLinks = screen.getAllByText('Dashboard')
    expect(allDashboardLinks.length).toBeGreaterThanOrEqual(2)
  })

  it('renders nav items in correct order: Dashboard, Students, Sessions, Courses, Lessons, then Settings separated at bottom', () => {
    renderShell()
    const links = document.querySelector('aside')?.querySelectorAll('a')
    const labels = Array.from(links ?? []).map(a => a.textContent?.trim())
    expect(labels).toEqual(['Dashboard', 'Students', 'Sessions', 'Courses', 'Lessons', 'Settings'])
  })

  it('Settings link is outside the main nav element', () => {
    renderShell()
    // Settings must not be inside the <nav> (main nav group)
    const nav = screen.getByRole('navigation')
    expect(within(nav).queryByRole('link', { name: /^settings$/i })).not.toBeInTheDocument()
    // Settings must still render as a link in the overall sidebar
    const settingsLinks = screen.getAllByRole('link', { name: /^settings$/i })
    expect(settingsLinks.length).toBeGreaterThanOrEqual(1)
  })

  it('does not show generation counter in sidebar', () => {
    renderShell()
    expect(screen.queryByText(/generations/)).not.toBeInTheDocument()
  })

  it('logout button is inside the teacher profile card and calls logout', async () => {
    const user = userEvent.setup()
    renderShell()
    const card = screen.getAllByTestId('teacher-profile-card')[0]
    expect(card).toBeInTheDocument()
    const logoutBtn = within(card).getByRole('button', { name: /log out/i })
    expect(logoutBtn).toBeInTheDocument()
    await user.click(logoutBtn)
    expect(mockLogout).toHaveBeenCalledWith({ logoutParams: { returnTo: window.location.origin } })
  })

  it('renders Sessions nav item linking to /sessions', () => {
    renderShell()
    const sessionsLinks = screen.getAllByRole('link', { name: /^sessions$/i })
    expect(sessionsLinks.length).toBeGreaterThanOrEqual(1)
    expect(sessionsLinks[0]).toHaveAttribute('href', '/sessions')
  })

  it('does not render a My Profile nav item', () => {
    renderShell()
    expect(screen.queryByText('My Profile')).not.toBeInTheDocument()
  })

  it('active nav item has left-border indicator and no background fill', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/sessions']}>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>
    )
    const sessionsLinks = screen.getAllByRole('link', { name: /^sessions$/i })
    const activeLink = sessionsLinks[0]
    expect(activeLink.className).toContain('border-l-primary')
    expect(activeLink.className).not.toContain('bg-white')
    expect(activeLink.className).not.toContain('bg-indigo')
  })

  it('sidebar renders the same nav items regardless of route', () => {
    const routes = ['/', '/sessions', '/settings']
    const expectedLabels = ['Dashboard', 'Students', 'Sessions', 'Courses', 'Lessons', 'Settings']

    for (const route of routes) {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[route]}>
            <AppShell />
          </MemoryRouter>
        </QueryClientProvider>
      )
      const links = document.querySelector('aside')?.querySelectorAll('a')
      const labels = Array.from(links ?? []).map(a => a.textContent?.trim())
      expect(labels).toEqual(expectedLabels)
      unmount()
    }
  })

  it('renders LANGUAGE CURATOR subtitle below logo', () => {
    renderShell()
    const subtitles = screen.getAllByText(/language curator/i)
    expect(subtitles.length).toBeGreaterThanOrEqual(1)
  })

  it('renders Teacher label in user card', () => {
    renderShell()
    const teacherLabels = screen.getAllByText(/^teacher$/i)
    expect(teacherLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('renders the mobile top bar with logo text', () => {
    renderShell()
    const logoTexts = screen.getAllByText('LangTeach')
    // At least one in mobile top bar and one in desktop sidebar
    expect(logoTexts.length).toBeGreaterThanOrEqual(2)
  })

  it('shows Sessions as active nav when on session edit page reached from sessions list', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname: '/students/1/sessions/2/edit', state: { from: 'sessions' } }]}>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>
    )
    const sessionsLinks = screen.getAllByRole('link', { name: /^sessions$/i })
    expect(sessionsLinks[0].className).toContain('border-l-primary')
    const studentsLinks = screen.getAllByRole('link', { name: /^students$/i })
    expect(studentsLinks[0].className).not.toContain('border-l-primary')
  })

  it('shows Students as active nav when on session edit page reached from student detail', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname: '/students/1/sessions/2/edit' }]}>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>
    )
    const studentsLinks = screen.getAllByRole('link', { name: /^students$/i })
    expect(studentsLinks[0].className).toContain('border-l-primary')
    const sessionsLinks = screen.getAllByRole('link', { name: /^sessions$/i })
    expect(sessionsLinks[0].className).not.toContain('border-l-primary')
  })
})
