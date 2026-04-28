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

function renderShell(initialPath = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
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

  it('renders nav items in correct order: Dashboard, Students, Sessions, Courses, Lessons, then Help and Settings separated at bottom', () => {
    renderShell()
    const links = document.querySelector('aside')?.querySelectorAll('a')
    const labels = Array.from(links ?? []).map(a => a.textContent?.trim())
    expect(labels).toEqual(['Dashboard', 'Students', 'Sessions', 'Courses', 'Lessons', 'Help', 'Settings'])
  })

  it('Settings and Help links are outside the main nav element', () => {
    renderShell()
    const nav = screen.getByRole('navigation')
    expect(within(nav).queryByRole('link', { name: /^settings$/i })).not.toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: /^help$/i })).not.toBeInTheDocument()
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
    const expectedLabels = ['Dashboard', 'Students', 'Sessions', 'Courses', 'Lessons', 'Help', 'Settings']

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

  it('renders the Open Assistant button in the desktop sidebar', () => {
    renderShell()
    const aside = document.querySelector('aside')
    const btn = aside?.querySelector('[data-testid="open-assistant-btn"]')
    expect(btn).toBeInTheDocument()
    expect(btn?.textContent).toContain('Open Assistant')
  })

  it('Open Assistant button is outside the main nav element', () => {
    renderShell()
    const nav = screen.getByRole('navigation')
    expect(within(nav).queryByTestId('open-assistant-btn')).not.toBeInTheDocument()
  })

  it('clicking Open Assistant opens the stub panel', async () => {
    const user = userEvent.setup()
    renderShell()
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
    const aside = document.querySelector('aside')
    const btn = aside?.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
    await user.click(btn)
    expect(screen.getByTestId('assistant-panel')).toBeInTheDocument()
  })

  it('closing the assistant panel removes it from the DOM', async () => {
    const user = userEvent.setup()
    renderShell()
    const aside = document.querySelector('aside')
    const openBtn = aside?.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
    await user.click(openBtn)
    const closeBtn = screen.getByRole('button', { name: /close assistant/i })
    await user.click(closeBtn)
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
  })

  it('renders the Open Assistant mobile button in the top bar', () => {
    renderShell()
    expect(screen.getByTestId('open-assistant-mobile-btn')).toBeInTheDocument()
  })

  it('Escape key closes the assistant panel', async () => {
    const user = userEvent.setup()
    renderShell()
    const aside = document.querySelector('aside')
    const openBtn = aside?.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
    await user.click(openBtn)
    expect(screen.getByTestId('assistant-panel')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
  })

  it('Ctrl+K opens the assistant panel', async () => {
    const user = userEvent.setup()
    renderShell()
    expect(screen.queryByTestId('assistant-panel')).not.toBeInTheDocument()
    await user.keyboard('{Control>}k{/Control}')
    expect(screen.getByTestId('assistant-panel')).toBeInTheDocument()
  })

  it('assistant empty state shows generic prompt on /students/new (not student-specific)', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/students/new']}>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>
    )
    const aside = document.querySelector('aside')
    const openBtn = aside?.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
    await user.click(openBtn)
    // Should show generic prompt, not "What did you cover with new today?"
    expect(screen.queryByText(/What did you cover with/i)).not.toBeInTheDocument()
    expect(screen.getByText(/What would you like to cover today/i)).toBeInTheDocument()
    unmount()
  })

  it('Escape with transcription shows inline discard confirm instead of closing', async () => {
    const user = userEvent.setup()
    renderShell()
    const aside = document.querySelector('aside')
    const openBtn = aside?.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
    await user.click(openBtn)
    const input = screen.getByTestId('assistant-input')
    await user.type(input, 'Hoy hemos trabajado el subjuntivo')
    await user.click(screen.getByTestId('assistant-send-btn'))
    // Now there is a transcription — Escape should show confirm, not close
    await user.keyboard('{Escape}')
    expect(screen.getByTestId('assistant-panel')).toBeInTheDocument()
    expect(screen.getByTestId('discard-confirm')).toBeInTheDocument()
  })

  it('Open Assistant button shows active state class when panel is open', async () => {
    const user = userEvent.setup()
    renderShell()
    const aside = document.querySelector('aside')
    const btn = aside?.querySelector('[data-testid="open-assistant-btn"]') as HTMLElement
    await user.click(btn)
    expect(btn.className).toContain('brightness-90')
  })
})
